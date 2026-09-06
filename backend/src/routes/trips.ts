import { Router } from "express";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../firebaseAdmin.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip, genInviteCode } from "../context.js";
import { getUserDoc } from "../users.js";

export const tripsRouter = Router();

async function memberList(tripId: string) {
  const snap = await adminDb.collection("trips").doc(tripId).collection("members").orderBy("joinedAt", "asc").get();
  const users = await Promise.all(snap.docs.map((doc) => getUserDoc(doc.id)));
  return snap.docs.map((doc, i) => {
    const u = users[i];
    return { id: doc.id, name: u?.name || "משתמש", email: u?.email || "", avatarColor: u?.avatarColor || "#B23A32", role: doc.data().role };
  });
}

tripsRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const existing = await getMyTrip(req.userId!);
  if (existing) return res.status(409).json({ error: "already_has_trip" });
  const id = randomUUID();
  const code = genInviteCode();
  const name = req.body?.name || "יפן 2027";

  const tripRef = adminDb.collection("trips").doc(id);
  const batch = adminDb.batch();
  batch.set(tripRef, { name, code, ownerId: req.userId, budgetTotal: 0, memberIds: [req.userId], createdAt: FieldValue.serverTimestamp() });
  batch.set(tripRef.collection("members").doc(req.userId!), { role: "owner", joinedAt: FieldValue.serverTimestamp() });
  await batch.commit();

  res.json({ trip: { id, name, code } });
});

tripsRouter.get("/preview", requireAuth, async (req: AuthedRequest, res) => {
  const code = String(req.query.code || "").toUpperCase();
  const snap = await adminDb.collection("trips").where("code", "==", code).limit(1).get();
  if (snap.empty) return res.status(404).json({ error: "not_found", message: "לא נמצא טיול עם קוד ההזמנה הזה" });
  const trip = snap.docs[0];
  const tripId = trip.id;
  const d = trip.data();
  const owner = await getUserDoc(d.ownerId);
  const memberCount = (d.memberIds || []).length;
  const destSnap = await adminDb.collection("trips").doc(tripId).collection("destinations").get();
  const dests = destSnap.docs.map((doc) => doc.data());
  const startDate = dests.reduce((min: string | null, x: any) => (!min || x.startDate < min ? x.startDate : min), null as string | null);
  const endDate = dests.reduce((max: string | null, x: any) => (!max || x.endDate > max ? x.endDate : max), null as string | null);
  res.json({
    name: d.name,
    destinations: dests.length,
    members: memberCount,
    ownerName: owner?.name,
    startDate,
    endDate,
  });
});

tripsRouter.post("/join", requireAuth, async (req: AuthedRequest, res) => {
  const existing = await getMyTrip(req.userId!);
  if (existing) return res.status(409).json({ error: "already_has_trip" });
  const code = String(req.body?.code || "").toUpperCase();
  const snap = await adminDb.collection("trips").where("code", "==", code).limit(1).get();
  if (snap.empty) return res.status(404).json({ error: "not_found", message: "לא נמצא טיול עם קוד ההזמנה הזה" });
  const tripRef = snap.docs[0].ref;
  const d = snap.docs[0].data();

  const batch = adminDb.batch();
  batch.set(tripRef.collection("members").doc(req.userId!), { role: "member", joinedAt: FieldValue.serverTimestamp() });
  batch.update(tripRef, { memberIds: FieldValue.arrayUnion(req.userId) });
  await batch.commit();

  const email = (await getUserDoc(req.userId!))?.email;
  if (email) {
    const pending = await tripRef.collection("invites").where("email", "==", email).where("status", "==", "pending").get();
    const inviteBatch = adminDb.batch();
    pending.docs.forEach((doc) => inviteBatch.update(doc.ref, { status: "joined" }));
    if (!pending.empty) await inviteBatch.commit();
  }
  res.json({ trip: { id: tripRef.id, name: d.name, code: d.code } });
});

tripsRouter.get("/current", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await getMyTrip(req.userId!);
  if (!trip) return res.json({ trip: null });
  const invitesSnap = await adminDb.collection("trips").doc(trip.id).collection("invites").where("status", "==", "pending").get();
  res.json({
    trip: {
      id: trip.id,
      name: trip.name,
      code: trip.code,
      ownerId: trip.owner_id,
      budgetTotal: trip.budget_total,
      members: await memberList(trip.id),
      pendingInvites: invitesSnap.docs.map((doc) => ({ email: doc.data().email, created_at: doc.data().createdAt?.toDate?.().toISOString() ?? null })),
    },
  });
});

tripsRouter.post("/rotate-code", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await getMyTrip(req.userId!);
  if (!trip) return res.status(404).json({ error: "no_trip" });
  const code = genInviteCode();
  await adminDb.collection("trips").doc(trip.id).update({ code });
  res.json({ code });
});

tripsRouter.post("/invite", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await getMyTrip(req.userId!);
  if (!trip) return res.status(404).json({ error: "no_trip" });
  const email = String(req.body?.email || "").toLowerCase().trim();
  if (!email.includes("@")) return res.status(400).json({ error: "invalid_email" });
  await adminDb.collection("trips").doc(trip.id).collection("invites").add({ email, status: "pending", createdAt: FieldValue.serverTimestamp() });
  res.json({ ok: true });
});

tripsRouter.delete("/members/:userId", requireAuth, async (req: AuthedRequest, res) => {
  const memberId = String(req.params.userId);
  const trip = await getMyTrip(req.userId!);
  if (!trip) return res.status(404).json({ error: "no_trip" });
  if (memberId === trip.owner_id) return res.status(400).json({ error: "cannot_remove_owner" });
  const tripRef = adminDb.collection("trips").doc(trip.id);
  const batch = adminDb.batch();
  batch.delete(tripRef.collection("members").doc(memberId));
  batch.update(tripRef, { memberIds: FieldValue.arrayRemove(memberId) });
  await batch.commit();
  res.json({ ok: true });
});

tripsRouter.post("/leave", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await getMyTrip(req.userId!);
  if (!trip) return res.status(404).json({ error: "no_trip" });
  const tripRef = adminDb.collection("trips").doc(trip.id);
  const batch = adminDb.batch();
  batch.delete(tripRef.collection("members").doc(req.userId!));
  batch.update(tripRef, { memberIds: FieldValue.arrayRemove(req.userId) });
  await batch.commit();
  res.json({ ok: true });
});
