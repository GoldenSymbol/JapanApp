import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip, genInviteCode, requireMembership } from "../context.js";

export const tripsRouter = Router();

function memberList(tripId: string) {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.avatar_color, tm.role
       FROM trip_members tm JOIN users u ON u.id = tm.user_id
       WHERE tm.trip_id = ? ORDER BY tm.joined_at ASC`
    )
    .all(tripId) as any[];
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, avatarColor: r.avatar_color, role: r.role }));
}

tripsRouter.post("/", requireAuth, (req: AuthedRequest, res) => {
  const existing = getMyTrip(req.userId!);
  if (existing) return res.status(409).json({ error: "already_has_trip" });
  const id = randomUUID();
  const code = genInviteCode();
  const name = req.body?.name || "יפן 2027";
  db.prepare(`INSERT INTO trips (id, name, code, owner_id) VALUES (?, ?, ?, ?)`).run(id, name, code, req.userId);
  db.prepare(`INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'owner')`).run(id, req.userId);
  res.json({ trip: { id, name, code } });
});

tripsRouter.get("/preview", requireAuth, (req: AuthedRequest, res) => {
  const code = String(req.query.code || "").toUpperCase();
  const trip = db.prepare("SELECT * FROM trips WHERE code = ?").get(code) as any;
  if (!trip) return res.status(404).json({ error: "not_found", message: "לא נמצא טיול עם קוד ההזמנה הזה" });
  const owner = db.prepare("SELECT name FROM users WHERE id = ?").get(trip.owner_id) as any;
  const memberCount = (db.prepare("SELECT COUNT(*) c FROM trip_members WHERE trip_id = ?").get(trip.id) as any).c;
  const destCount = (db.prepare("SELECT COUNT(*) c FROM destinations WHERE trip_id = ?").get(trip.id) as any).c;
  const days = db.prepare("SELECT MIN(start_date) a, MAX(end_date) b FROM destinations WHERE trip_id = ?").get(trip.id) as any;
  res.json({
    name: trip.name,
    destinations: destCount,
    members: memberCount,
    ownerName: owner?.name,
    startDate: days?.a,
    endDate: days?.b,
  });
});

tripsRouter.post("/join", requireAuth, (req: AuthedRequest, res) => {
  const existing = getMyTrip(req.userId!);
  if (existing) return res.status(409).json({ error: "already_has_trip" });
  const code = String(req.body?.code || "").toUpperCase();
  const trip = db.prepare("SELECT * FROM trips WHERE code = ?").get(code) as any;
  if (!trip) return res.status(404).json({ error: "not_found", message: "לא נמצא טיול עם קוד ההזמנה הזה" });
  db.prepare(`INSERT OR IGNORE INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'member')`).run(trip.id, req.userId);
  const email = (db.prepare("SELECT email FROM users WHERE id = ?").get(req.userId) as any)?.email;
  if (email) {
    db.prepare("UPDATE invites SET status = 'joined' WHERE trip_id = ? AND email = ? AND status = 'pending'").run(trip.id, email);
  }
  res.json({ trip: { id: trip.id, name: trip.name, code: trip.code } });
});

tripsRouter.get("/current", requireAuth, (req: AuthedRequest, res) => {
  const trip = getMyTrip(req.userId!);
  if (!trip) return res.json({ trip: null });
  res.json({
    trip: {
      id: trip.id,
      name: trip.name,
      code: trip.code,
      ownerId: trip.owner_id,
      budgetTotal: trip.budget_total,
      members: memberList(trip.id),
      pendingInvites: db.prepare("SELECT email, created_at FROM invites WHERE trip_id = ? AND status = 'pending'").all(trip.id),
    },
  });
});

tripsRouter.post("/rotate-code", requireAuth, (req: AuthedRequest, res) => {
  const trip = getMyTrip(req.userId!);
  if (!trip) return res.status(404).json({ error: "no_trip" });
  const code = genInviteCode();
  db.prepare("UPDATE trips SET code = ? WHERE id = ?").run(code, trip.id);
  res.json({ code });
});

tripsRouter.post("/invite", requireAuth, (req: AuthedRequest, res) => {
  const trip = getMyTrip(req.userId!);
  if (!trip) return res.status(404).json({ error: "no_trip" });
  const email = String(req.body?.email || "").toLowerCase().trim();
  if (!email.includes("@")) return res.status(400).json({ error: "invalid_email" });
  db.prepare(`INSERT INTO invites (id, trip_id, email) VALUES (?, ?, ?)`).run(randomUUID(), trip.id, email);
  res.json({ ok: true });
});

tripsRouter.delete("/members/:userId", requireAuth, (req: AuthedRequest, res) => {
  const trip = getMyTrip(req.userId!);
  if (!trip) return res.status(404).json({ error: "no_trip" });
  if (req.params.userId === trip.owner_id) return res.status(400).json({ error: "cannot_remove_owner" });
  db.prepare("DELETE FROM trip_members WHERE trip_id = ? AND user_id = ?").run(trip.id, req.params.userId);
  res.json({ ok: true });
});

tripsRouter.post("/leave", requireAuth, (req: AuthedRequest, res) => {
  const trip = getMyTrip(req.userId!);
  if (!trip) return res.status(404).json({ error: "no_trip" });
  db.prepare("DELETE FROM trip_members WHERE trip_id = ? AND user_id = ?").run(trip.id, req.userId);
  res.json({ ok: true });
});
