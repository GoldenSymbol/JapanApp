import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip, createNotification } from "../context.js";
import { geocodePlace } from "../geocode.js";

export const itineraryRouter = Router();

function nightsBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function destinationsForTrip(tripId: string) {
  const rows = db
    .prepare(`SELECT * FROM destinations WHERE trip_id = ? ORDER BY order_index ASC`)
    .all(tripId) as any[];
  return rows.map((d) => {
    const count = (db.prepare("SELECT COUNT(*) c FROM attractions WHERE destination_id = ?").get(d.id) as any).c;
    return {
      id: d.id,
      order: d.order_index,
      nameHe: d.name_he,
      nameEn: d.name_en,
      nameJa: d.name_ja,
      startDate: d.start_date,
      endDate: d.end_date,
      transportIn: d.transport_in,
      colorKey: d.color_key,
      lat: d.lat,
      lng: d.lng,
      teaser: d.teaser,
      nights: nightsBetween(d.start_date, d.end_date),
      attractionCount: count,
    };
  });
}

function requireTrip(req: AuthedRequest, res: any): any {
  const trip = getMyTrip(req.userId!);
  if (!trip) {
    res.status(404).json({ error: "no_trip" });
    return null;
  }
  return trip;
}

itineraryRouter.get("/destinations", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  res.json({ destinations: destinationsForTrip(trip.id) });
});

itineraryRouter.post("/destinations", requireAuth, async (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  const { nameHe, nameEn, nameJa, startDate, endDate, colorKey, transportIn } = req.body || {};
  if (!nameHe || !startDate || !endDate) return res.status(400).json({ error: "invalid_input" });
  const maxOrder = (db.prepare("SELECT COALESCE(MAX(order_index), -1) m FROM destinations WHERE trip_id = ?").get(trip.id) as any).m;
  const id = randomUUID();
  const coords = await geocodePlace(nameEn || nameHe);
  db.prepare(
    `INSERT INTO destinations (id, trip_id, order_index, name_he, name_en, name_ja, start_date, end_date, transport_in, color_key, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, trip.id, maxOrder + 1, nameHe, nameEn || "", nameJa || "", startDate, endDate, transportIn || "train", colorKey || "stone", coords?.lat ?? null, coords?.lng ?? null);
  createNotification({
    tripId: trip.id,
    actorUserId: req.userId!,
    type: "new_destination",
    title: `יעד חדש נוסף למסלול: ${nameHe}`,
    targetScreen: "trip",
  });
  res.json({ destinations: destinationsForTrip(trip.id) });
});

itineraryRouter.patch("/destinations/:id", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  const allowed: Record<string, string> = { nameHe: "name_he", nameEn: "name_en", startDate: "start_date", endDate: "end_date" };
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, col] of Object.entries(allowed)) {
    if (k in (req.body || {})) {
      sets.push(`${col} = ?`);
      vals.push(req.body[k]);
    }
  }
  if (sets.length) {
    vals.push(req.params.id, trip.id);
    db.prepare(`UPDATE destinations SET ${sets.join(", ")} WHERE id = ? AND trip_id = ?`).run(...vals);
  }
  res.json({ destinations: destinationsForTrip(trip.id) });
});

itineraryRouter.delete("/destinations/:id", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  db.prepare("DELETE FROM destinations WHERE id = ? AND trip_id = ?").run(req.params.id, trip.id);
  res.json({ destinations: destinationsForTrip(trip.id) });
});

itineraryRouter.post("/destinations/:id/move", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  const dir = req.body?.direction === "up" ? -1 : 1;
  const list = db.prepare("SELECT id, order_index FROM destinations WHERE trip_id = ? ORDER BY order_index ASC").all(trip.id) as any[];
  const idx = list.findIndex((d) => d.id === req.params.id);
  const swapIdx = idx + dir;
  if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return res.json({ destinations: destinationsForTrip(trip.id) });
  const a = list[idx], b = list[swapIdx];
  db.prepare("UPDATE destinations SET order_index = ? WHERE id = ?").run(b.order_index, a.id);
  db.prepare("UPDATE destinations SET order_index = ? WHERE id = ?").run(a.order_index, b.id);
  res.json({ destinations: destinationsForTrip(trip.id) });
});

function attractionsForDestination(destId: string, userId: string) {
  const rows = db
    .prepare(`SELECT * FROM attractions WHERE destination_id = ? ORDER BY order_index ASC, created_at ASC`)
    .all(destId) as any[];
  return rows.map((a) => {
    const marks = db.prepare("SELECT user_id, status FROM attraction_marks WHERE attraction_id = ?").all(a.id) as any[];
    const mine = marks.find((m) => m.user_id === userId);
    const others = marks.filter((m) => m.user_id !== userId);
    return {
      id: a.id,
      nameHe: a.name_he,
      nameEn: a.name_en,
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
  });
}

itineraryRouter.get("/destinations/:id/attractions", requireAuth, (req: AuthedRequest, res) => {
  res.json({ attractions: attractionsForDestination(req.params.id, req.userId!) });
});

itineraryRouter.post("/destinations/:id/attractions", requireAuth, async (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  const dest = db.prepare("SELECT * FROM destinations WHERE id = ? AND trip_id = ?").get(req.params.id, trip.id) as any;
  if (!dest) return res.status(404).json({ error: "not_found" });
  const { nameHe, nameEn, tag, duration, day, hour, lat, lng, note } = req.body || {};
  if (!nameHe) return res.status(400).json({ error: "invalid_input" });
  const id = randomUUID();
  const maxOrder = (db.prepare("SELECT COALESCE(MAX(order_index), -1) m FROM attractions WHERE destination_id = ?").get(dest.id) as any).m;
  let coordLat = lat ?? null;
  let coordLng = lng ?? null;
  if (coordLat == null || coordLng == null) {
    const coords = await geocodePlace(nameEn || nameHe, dest.name_en || dest.name_he);
    coordLat = coords?.lat ?? null;
    coordLng = coords?.lng ?? null;
  }
  db.prepare(
    `INSERT INTO attractions (id, destination_id, order_index, name_he, name_en, tag, duration, day, hour, lat, lng, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, dest.id, maxOrder + 1, nameHe, nameEn || "", tag || "attraction", duration || null, day || null, hour || null, coordLat, coordLng, note || null, req.userId);
  createNotification({
    tripId: trip.id,
    actorUserId: req.userId!,
    type: "new_attraction",
    title: `אטרקציה חדשה ב${dest.name_he}: ${nameHe}`,
    targetScreen: "city",
    targetId: dest.id,
  });
  res.json({ attractions: attractionsForDestination(dest.id, req.userId!) });
});

itineraryRouter.patch("/attractions/:id", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  const a = db
    .prepare(`SELECT a.*, d.trip_id, d.name_he as dest_name FROM attractions a JOIN destinations d ON d.id = a.destination_id WHERE a.id = ?`)
    .get(req.params.id) as any;
  if (!a || a.trip_id !== trip.id) return res.status(404).json({ error: "not_found" });
  const allowed: Record<string, string> = {
    nameHe: "name_he",
    nameEn: "name_en",
    tag: "tag",
    duration: "duration",
    day: "day",
    hour: "hour",
    note: "note",
    lat: "lat",
    lng: "lng",
  };
  const sets: string[] = [];
  const vals: any[] = [];
  const rescheduling = "day" in (req.body || {});
  for (const [k, col] of Object.entries(allowed)) {
    if (k in (req.body || {})) {
      sets.push(`${col} = ?`);
      vals.push(req.body[k]);
    }
  }
  if (sets.length) {
    vals.push(req.params.id);
    db.prepare(`UPDATE attractions SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }
  if (rescheduling) {
    createNotification({
      tripId: trip.id,
      actorUserId: req.userId!,
      type: "reschedule",
      title: `${a.name_he} עברה ל${req.body.day ? "יום " + req.body.day : "ללא תאריך"}`,
      targetScreen: "today",
    });
  }
  res.json({ attractions: attractionsForDestination(a.destination_id, req.userId!) });
});

itineraryRouter.delete("/attractions/:id", requireAuth, (req: AuthedRequest, res) => {
  const a = db.prepare("SELECT * FROM attractions WHERE id = ?").get(req.params.id) as any;
  if (!a) return res.json({ ok: true });
  db.prepare("DELETE FROM attractions WHERE id = ?").run(req.params.id);
  res.json({ attractions: attractionsForDestination(a.destination_id, req.userId!) });
});

itineraryRouter.post("/attractions/:id/mark", requireAuth, (req: AuthedRequest, res) => {
  const status = req.body?.status || "none";
  const a = db.prepare("SELECT * FROM attractions WHERE id = ?").get(req.params.id) as any;
  if (!a) return res.status(404).json({ error: "not_found" });
  db.prepare(
    `INSERT INTO attraction_marks (attraction_id, user_id, status) VALUES (?, ?, ?)
     ON CONFLICT(attraction_id, user_id) DO UPDATE SET status = excluded.status`
  ).run(req.params.id, req.userId, status);
  res.json({ attractions: attractionsForDestination(a.destination_id, req.userId!) });
});

itineraryRouter.get("/today", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const dest = db
    .prepare(`SELECT * FROM destinations WHERE trip_id = ? AND start_date <= ? AND end_date >= ? ORDER BY order_index ASC LIMIT 1`)
    .get(trip.id, date, date) as any;

  const allDest = db.prepare("SELECT id, name_he, start_date, end_date FROM destinations WHERE trip_id = ? ORDER BY order_index ASC").all(trip.id) as any[];
  const days: { date: string; destinationId: string; cityHe: string }[] = [];
  for (const d of allDest) {
    let cur = new Date(d.start_date);
    const end = new Date(d.end_date);
    while (cur <= end) {
      days.push({ date: cur.toISOString().slice(0, 10), destinationId: d.id, cityHe: d.name_he });
      cur.setDate(cur.getDate() + 1);
    }
  }

  let scheduled: any[] = [];
  let unscheduled: any[] = [];
  if (dest) {
    scheduled = db
      .prepare(`SELECT * FROM attractions WHERE destination_id = ? AND day = ? ORDER BY hour ASC, order_index ASC`)
      .all(dest.id, date) as any[];
    unscheduled = db
      .prepare(`SELECT * FROM attractions WHERE destination_id = ? AND (day IS NULL OR day = '') ORDER BY order_index ASC`)
      .all(dest.id) as any[];
  }
  const mapAttr = (a: any) => {
    const marks = db.prepare("SELECT user_id, status FROM attraction_marks WHERE attraction_id = ?").all(a.id) as any[];
    const mine = marks.find((m) => m.user_id === req.userId);
    return {
      id: a.id,
      nameHe: a.name_he,
      tag: a.tag,
      duration: a.duration,
      day: a.day,
      hour: a.hour,
      note: a.note,
      myStatus: mine?.status || "none",
    };
  };

  res.json({
    date,
    destination: dest ? { id: dest.id, nameHe: dest.name_he, startDate: dest.start_date, endDate: dest.end_date } : null,
    days,
    scheduled: scheduled.map(mapAttr),
    unscheduled: unscheduled.map(mapAttr),
  });
});
