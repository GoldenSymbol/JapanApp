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

// Two destination entries can represent the same real-world place visited twice on the trip
// (e.g. Tokyo at the start and Tokyo again at the end) — detected automatically by matching
// the English name, stripped of any parenthetical qualifier ("Tokyo (return)" -> "tokyo", same
// as plain "Tokyo"). Matching entries share a group key, which is what lets attractions and
// day-pickers pool across every visit to that place instead of being scoped to just one leg of
// the trip. A destination with no English name (or one that matches nothing else) is its own
// group of one, keyed by its own id so it never accidentally merges with another blank one.
function normalizeCityName(name: string | undefined | null): string {
  return (name || "").replace(/\(.*?\)/g, "").trim().toLowerCase();
}
function groupIdOf(d: any): string {
  return normalizeCityName(d.nameEn) || d.id;
}

async function destinationsForTrip(tripId: string) {
  const [dests, attrs] = await Promise.all([fetchDestinations(tripId), fetchAttractions(tripId)]);
  const countsByDest = new Map<string, number>();
  for (const a of attrs) countsByDest.set(a.destinationId, (countsByDest.get(a.destinationId) || 0) + 1);
  const groupCounts = new Map<string, number>();
  for (const d of dests) {
    const g = groupIdOf(d);
    groupCounts.set(g, (groupCounts.get(g) || 0) + (countsByDest.get(d.id) || 0));
  }
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
    attractionCount: groupCounts.get(groupIdOf(d)) || 0,
    groupId: groupIdOf(d),
  }));
}

// All destination ids that share destId's group (including destId itself).
async function groupDestinationIds(tripId: string, destId: string): Promise<string[]> {
  const dests = await fetchDestinations(tripId);
  const target = dests.find((d) => d.id === destId);
  const groupId = target ? groupIdOf(target) : destId;
  return dests.filter((d) => groupIdOf(d) === groupId).map((d) => d.id);
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

// marksByUser lives as a plain map field on the attraction doc itself (not a subcollection) so
// that listing attractions never needs a follow-up read per attraction to know who marked what.
// Attractions are pooled across every destination entry in destId's group, so a place visited
// twice on the trip (e.g. Tokyo, then Tokyo again at the end) shows the same shared list both times.
async function attractionsForDestination(tripId: string, destId: string, userId: string) {
  const groupIds = await groupDestinationIds(tripId, destId);
  const attrs = await fetchAttractions(tripId);
  const rows = attrs
    .filter((a) => groupIds.includes(a.destinationId))
    .sort((a, b) => a.orderIndex - b.orderIndex || (a.createdAtMs || 0) - (b.createdAtMs || 0));
  return rows.map((a) => {
    const marksByUser: Record<string, string> = a.marksByUser || {};
    const othersStatus = Object.entries(marksByUser)
      .filter(([uid]) => uid !== userId)
      .map(([, status]) => status);
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
      myStatus: marksByUser[userId] || "none",
      othersStatus,
    };
  });
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
  const groupIds = await groupDestinationIds(trip.id, id);
  const existingAttrs = await fetchAttractions(trip.id);
  const maxOrder = existingAttrs
    .filter((a) => groupIds.includes(a.destinationId))
    .reduce((m, a) => Math.max(m, a.orderIndex ?? -1), -1);
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

itineraryRouter.post("/destinations/:id/attractions/reorder", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const destId = String(req.params.id);
  const orderedIds: string[] = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
  const groupIds = await groupDestinationIds(trip.id, destId);
  const existingAttrs = await fetchAttractions(trip.id);
  const validIds = new Set(existingAttrs.filter((a) => groupIds.includes(a.destinationId)).map((a) => a.id));
  if (!orderedIds.length || orderedIds.some((id) => !validIds.has(id))) {
    return res.status(400).json({ error: "invalid_input" });
  }
  const batch = adminDb.batch();
  const attrCol = tripRef(trip.id).collection("attractions");
  orderedIds.forEach((attrId, i) => batch.update(attrCol.doc(attrId), { orderIndex: i }));
  await batch.commit();
  res.json({ attractions: await attractionsForDestination(trip.id, destId, req.userId!) });
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
  await attrRef.update({ [`marksByUser.${req.userId}`]: status });
  res.json({ attractions: await attractionsForDestination(trip.id, doc.data()!.destinationId, req.userId!) });
});
