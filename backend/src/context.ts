import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import { adminDb } from "./firebaseAdmin.js";

export interface TripRow {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  budget_total: number;
}

export async function getMyTrip(userId: string): Promise<TripRow | undefined> {
  const snap = await adminDb.collection("trips").where("memberIds", "array-contains", userId).limit(1).get();
  if (snap.empty) return undefined;
  const doc = snap.docs[0];
  const d = doc.data();
  return { id: doc.id, name: d.name, code: d.code, owner_id: d.ownerId, budget_total: d.budgetTotal || 0 };
}

export async function requireMembership(tripId: string, userId: string): Promise<boolean> {
  const doc = await adminDb.collection("trips").doc(tripId).collection("members").doc(userId).get();
  return doc.exists;
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
