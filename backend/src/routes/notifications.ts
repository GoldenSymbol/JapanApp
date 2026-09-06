import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip } from "../context.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await getMyTrip(req.userId!);
  if (!trip) return res.json({ notifications: [], unreadCount: 0 });
  const rows = db
    .prepare(
      `SELECT n.*, u.name as actor_name,
        EXISTS(SELECT 1 FROM notification_reads r WHERE r.notification_id = n.id AND r.user_id = ?) as is_read
       FROM notifications n LEFT JOIN users u ON u.id = n.actor_user_id
       WHERE n.trip_id = ?
         AND NOT EXISTS (SELECT 1 FROM notification_deletes d WHERE d.notification_id = n.id AND d.user_id = ?)
       ORDER BY n.created_at DESC LIMIT 100`
    )
    .all(req.userId, trip.id, req.userId) as any[];
  const notifications = rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    actorName: r.actor_name,
    targetScreen: r.target_screen,
    targetId: r.target_id,
    createdAt: r.created_at,
    read: !!r.is_read,
  }));
  res.json({ notifications, unreadCount: notifications.filter((n) => !n.read).length });
});

notificationsRouter.post("/:id/read", requireAuth, (req: AuthedRequest, res) => {
  db.prepare(`INSERT OR IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)`).run(req.params.id, req.userId);
  res.json({ ok: true });
});

notificationsRouter.post("/read-all", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await getMyTrip(req.userId!);
  if (!trip) return res.json({ ok: true });
  const ids = db.prepare("SELECT id FROM notifications WHERE trip_id = ?").all(trip.id) as any[];
  const stmt = db.prepare(`INSERT OR IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)`);
  const tx = db.transaction((rows: any[]) => {
    for (const r of rows) stmt.run(r.id, req.userId);
  });
  tx(ids);
  res.json({ ok: true });
});

notificationsRouter.delete("/:id", requireAuth, (req: AuthedRequest, res) => {
  db.prepare(`INSERT OR IGNORE INTO notification_deletes (notification_id, user_id) VALUES (?, ?)`).run(req.params.id, req.userId);
  res.json({ ok: true });
});

notificationsRouter.post("/delete-all", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await getMyTrip(req.userId!);
  if (!trip) return res.json({ ok: true });
  const ids = db.prepare("SELECT id FROM notifications WHERE trip_id = ?").all(trip.id) as any[];
  const stmt = db.prepare(`INSERT OR IGNORE INTO notification_deletes (notification_id, user_id) VALUES (?, ?)`);
  const tx = db.transaction((rows: any[]) => {
    for (const r of rows) stmt.run(r.id, req.userId);
  });
  tx(ids);
  res.json({ ok: true });
});
