import { Router } from "express";
import { randomUUID } from "node:crypto";
import { adminDb } from "../firebaseAdmin.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip, createNotification } from "../context.js";
import { geocodePlace } from "../geocode.js";

export const itineraryRouter = Router();

// The design's per-destination card-tint palette (matches CARD_TINTS in frontend/src/state/TripDataContext.tsx).
// New destinations cycle through it so each one gets a distinct color, same as the seeded trip.
const DESTINATION_COLORS = ["#1F2328", "#243030", "#2A2320", "#2B2429", "#232B30", "#20272E", "#1E2C2C"];

function nightsBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function tripRef(tripId: string) {
  return adminDb.collection("trips").doc(tripId);
}

// Firestore has no cheap cross-collection COUNT, and this app's trips are small (a handful of
// destinations, a few attractions each) — fetching everything once and working in memory avoids
// needing any composite indexes at all, which matters since we don't want the user to have to
// manage Firestore index config for this app to work.
async function fetchDestinations(tripId: string) {
  const snap = await tripRef(tripId).collection("destinations").get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as any))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

async function fetchAttractions(tripId: string) {
  const snap = await tripRef(tripId).collection("attractions").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
}

async function destinationsForTrip(tripId: string) {
  const [dests, attrs] = await Promise.all([fetchDestinations(tripId), fetchAttractions(tripId)]);
  const counts = new Map<string, number>();
  for (const a of attrs) counts.set(a.destinationId, (counts.get(a.destinationId) || 0) + 1);
  return dests.map((d) => ({
    id: d.id,
    order: d.orderIndex,
    nameHe: d.nameHe,
    nameEn: d.nameEn,
    nameJa: d.nameJa,
    startDate: d.startDate,
    endDate: d.endDate,
    transportIn: d.transportIn,
    colorKey: d.colorKey,
    lat: d.lat,
    lng: d.lng,
    teaser: d.teaser,
    nights: nightsBetween(d.startDate, d.endDate),
    attractionCount: counts.get(d.id) || 0,
  }));
}

async function requireTrip(req: AuthedRequest, res: any): Promise<any> {
  const trip = await getMyTrip(req.userId!);
  if (!trip) {
    res.status(404).json({ error: "no_trip" });
    return null;
  }
  return trip;
}

itineraryRouter.get("/destinations", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  res.json({ destinations: await destinationsForTrip(trip.id) });
});

itineraryRouter.post("/destinations", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const { nameHe, nameEn, nameJa, startDate, endDate, colorKey, transportIn } = req.body || {};
  if (!nameHe || !startDate || !endDate) return res.status(400).json({ error: "invalid_input" });
  const existing = await fetchDestinations(trip.id);
  const maxOrder = existing.reduce((m, d) => Math.max(m, d.orderIndex), -1);
  const coords = await geocodePlace(nameEn || nameHe);
  const assignedColor = colorKey || DESTINATION_COLORS[(maxOrder + 1) % DESTINATION_COLORS.length];
  await tripRef(trip.id).collection("destinations").doc(randomUUID()).set({
    orderIndex: maxOrder + 1,
    nameHe,
    nameEn: nameEn || "",
    nameJa: nameJa || "",
    startDate,
    endDate,
    transportIn: transportIn || "train",
    colorKey: assignedColor,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    teaser: null,
  });
  await createNotification({
    tripId: trip.id,
    actorUserId: req.userId!,
    type: "new_destination",
    title: `יעד חדש נוסף למסלול: ${nameHe}`,
    targetScreen: "trip",
  });
  res.json({ destinations: await destinationsForTrip(trip.id) });
});

itineraryRouter.patch("/destinations/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const id = String(req.params.id);
  const allowed: Record<string, string> = { nameHe: "nameHe", nameEn: "nameEn", startDate: "startDate", endDate: "endDate" };
  const patch: Record<string, any> = {};
  for (const [k, field] of Object.entries(allowed)) {
    if (k in (req.body || {})) patch[field] = req.body[k];
  }
  if (Object.keys(patch).length) {
    await tripRef(trip.id).collection("destinations").doc(id).update(patch);
  }
  res.json({ destinations: await destinationsForTrip(trip.id) });
});

itineraryRouter.delete("/destinations/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const id = String(req.params.id);
  const attrs = await tripRef(trip.id).collection("attractions").where("destinationId", "==", id).get();
  await Promise.all(attrs.docs.map((doc) => adminDb.recursiveDelete(doc.ref)));
  await adminDb.recursiveDelete(tripRef(trip.id).collection("destinations").doc(id));
  res.json({ destinations: await destinationsForTrip(trip.id) });
});

itineraryRouter.post("/destinations/:id/move", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const dir = req.body?.direction === "up" ? -1 : 1;
  const list = await fetchDestinations(trip.id);
  const idx = list.findIndex((d) => d.id === req.params.id);
  const swapIdx = idx + dir;
  if (idx !== -1 && swapIdx >= 0 && swapIdx < list.length) {
    const a = list[idx], b = list[swapIdx];
    const destCol = tripRef(trip.id).collection("destinations");
    const batch = adminDb.batch();
    batch.update(destCol.doc(a.id), { orderIndex: b.orderIndex });
    batch.update(destCol.doc(b.id), { orderIndex: a.orderIndex });
    await batch.commit();
  }
  res.json({ destinations: await destinationsForTrip(trip.id) });
});

async function attractionsForDestination(tripId: string, destId: string, userId: string) {
  const snap = await tripRef(tripId).collection("attractions").where("destinationId", "==", destId).get();
  const rows = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as any))
    .sort((a, b) => a.orderIndex - b.orderIndex || (a.createdAtMs || 0) - (b.createdAtMs || 0));
  return Promise.all(
    rows.map(async (a) => {
      const marksSnap = await tripRef(tripId).collection("attractions").doc(a.id).collection("marks").get();
      const marks = marksSnap.docs.map((d) => ({ userId: d.id, status: d.data().status }));
      const mine = marks.find((m) => m.userId === userId);
      const others = marks.filter((m) => m.userId !== userId);
      return {
        id: a.id,
        nameHe: a.nameHe,
        nameEn: a.nameEn,
        tag: a.tag,
        duration: a.duration,
        day: a.day,
        hour: a.hour,
        note: a.note,
        lat: a.lat,
        lng: a.lng,
        myStatus: mine?.status || "none",
        othersStatus: others.map((o) => o.status),
      };
    })
  );
}

itineraryRouter.get("/destinations/:id/attractions", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  res.json({ attractions: await attractionsForDestination(trip.id, String(req.params.id), req.userId!) });
});

itineraryRouter.post("/destinations/:id/attractions", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const id = String(req.params.id);
  const destDoc = await tripRef(trip.id).collection("destinations").doc(id).get();
  if (!destDoc.exists) return res.status(404).json({ error: "not_found" });
  const dest = destDoc.data()!;
  const { nameHe, nameEn, tag, duration, day, hour, lat, lng, note } = req.body || {};
  if (!nameHe) return res.status(400).json({ error: "invalid_input" });
  const existing = await tripRef(trip.id).collection("attractions").where("destinationId", "==", id).get();
  const maxOrder = existing.docs.reduce((m, d) => Math.max(m, d.data().orderIndex ?? -1), -1);
  let coordLat = lat ?? null;
  let coordLng = lng ?? null;
  if (coordLat == null || coordLng == null) {
    const coords = await geocodePlace(nameEn || nameHe, dest.nameEn || dest.nameHe);
    coordLat = coords?.lat ?? null;
    coordLng = coords?.lng ?? null;
  }
  await tripRef(trip.id).collection("attractions").doc(randomUUID()).set({
    destinationId: id,
    orderIndex: maxOrder + 1,
    nameHe,
    nameEn: nameEn || "",
    tag: tag || "attraction",
    duration: duration || null,
    day: day || null,
    hour: hour || null,
    lat: coordLat,
    lng: coordLng,
    note: note || null,
    createdBy: req.userId,
    createdAtMs: Date.now(),
  });
  await createNotification({
    tripId: trip.id,
    actorUserId: req.userId!,
    type: "new_attraction",
    title: `אטרקציה חדשה ב${dest.nameHe}: ${nameHe}`,
    targetScreen: "city",
    targetId: id,
  });
  res.json({ attractions: await attractionsForDestination(trip.id, id, req.userId!) });
});

itineraryRouter.patch("/attractions/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const attrRef = tripRef(trip.id).collection("attractions").doc(String(req.params.id));
  const doc = await attrRef.get();
  if (!doc.exists) return res.status(404).json({ error: "not_found" });
  const a = doc.data()!;
  const allowed: Record<string, string> = {
    nameHe: "nameHe", nameEn: "nameEn", tag: "tag", duration: "duration",
    day: "day", hour: "hour", note: "note", lat: "lat", lng: "lng",
  };
  const patch: Record<string, any> = {};
  const rescheduling = "day" in (req.body || {});
  for (const [k, field] of Object.entries(allowed)) {
    if (k in (req.body || {})) patch[field] = req.body[k];
  }
  if (Object.keys(patch).length) await attrRef.update(patch);
  if (rescheduling) {
    await createNotification({
      tripId: trip.id,
      actorUserId: req.userId!,
      type: "reschedule",
      title: `${a.nameHe} עברה ל${req.body.day ? "יום " + req.body.day : "ללא תאריך"}`,
      targetScreen: "today",
    });
  }
  res.json({ attractions: await attractionsForDestination(trip.id, a.destinationId, req.userId!) });
});

itineraryRouter.delete("/attractions/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const attrRef = tripRef(trip.id).collection("attractions").doc(String(req.params.id));
  const doc = await attrRef.get();
  if (!doc.exists) return res.json({ ok: true });
  const destId = doc.data()!.destinationId;
  await adminDb.recursiveDelete(attrRef);
  res.json({ attractions: await attractionsForDestination(trip.id, destId, req.userId!) });
});

itineraryRouter.post("/attractions/:id/mark", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const status = req.body?.status || "none";
  const attrRef = tripRef(trip.id).collection("attractions").doc(String(req.params.id));
  const doc = await attrRef.get();
  if (!doc.exists) return res.status(404).json({ error: "not_found" });
  await attrRef.collection("marks").doc(req.userId!).set({ status });
  res.json({ attractions: await attractionsForDestination(trip.id, doc.data()!.destinationId, req.userId!) });
});

itineraryRouter.get("/today", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const allDest = await fetchDestinations(trip.id);
  const dest = allDest.find((d) => d.startDate <= date && d.endDate >= date) || null;

  const days: { date: string; destinationId: string; cityHe: string }[] = [];
  for (const d of allDest) {
    let cur = new Date(d.startDate);
    const end = new Date(d.endDate);
    while (cur <= end) {
      days.push({ date: cur.toISOString().slice(0, 10), destinationId: d.id, cityHe: d.nameHe });
      cur.setDate(cur.getDate() + 1);
    }
  }

  let scheduled: any[] = [];
  let unscheduled: any[] = [];
  if (dest) {
    const attrsSnap = await tripRef(trip.id).collection("attractions").where("destinationId", "==", dest.id).get();
    const attrs = attrsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
    scheduled = attrs
      .filter((a) => a.day === date)
      .sort((a, b) => (a.hour || "").localeCompare(b.hour || "") || a.orderIndex - b.orderIndex);
    unscheduled = attrs
      .filter((a) => !a.day)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }
  const mapAttr = async (a: any) => {
    const marksSnap = await tripRef(trip.id).collection("attractions").doc(a.id).collection("marks").doc(req.userId!).get();
    return {
      id: a.id,
      nameHe: a.nameHe,
      tag: a.tag,
      duration: a.duration,
      day: a.day,
      hour: a.hour,
      note: a.note,
      myStatus: marksSnap.exists ? marksSnap.data()!.status : "none",
    };
  };

  const [scheduledOut, unscheduledOut] = await Promise.all([
    Promise.all(scheduled.map(mapAttr)),
    Promise.all(unscheduled.map(mapAttr)),
  ]);

  res.json({
    date,
    destination: dest ? { id: dest.id, nameHe: dest.nameHe, startDate: dest.startDate, endDate: dest.endDate } : null,
    days,
    scheduled: scheduledOut,
    unscheduled: unscheduledOut,
  });
});
