import { randomUUID } from "node:crypto";
import { db } from "./db.js";

export interface TripRow {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  budget_total: number;
  created_at: string;
}

export function getMyTrip(userId: string): TripRow | undefined {
  return db
    .prepare(
      `SELECT t.* FROM trips t
       JOIN trip_members tm ON tm.trip_id = t.id
       WHERE tm.user_id = ?
       ORDER BY tm.joined_at ASC LIMIT 1`
    )
    .get(userId) as TripRow | undefined;
}

export function requireMembership(tripId: string, userId: string): boolean {
  const row = db
    .prepare(`SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?`)
    .get(tripId, userId);
  return !!row;
}

export function genInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `JPN-${code}`;
}

export function createNotification(params: {
  tripId: string;
  actorUserId: string;
  type: string;
  title: string;
  body?: string;
  targetScreen?: string;
  targetId?: string;
}) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO notifications (id, trip_id, actor_user_id, type, title, body, target_screen, target_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.tripId,
    params.actorUserId,
    params.type,
    params.title,
    params.body || null,
    params.targetScreen || null,
    params.targetId || null
  );
  return id;
}
