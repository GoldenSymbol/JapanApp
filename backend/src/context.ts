import { adminDb } from "./firebaseAdmin.js";
import { FieldValue } from "firebase-admin/firestore";
import { getUserName } from "./users.js";

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

// titleKey + titleParams (rather than a pre-rendered string) is what lets each viewer see a
// notification in their own UI language: the frontend looks titleKey up in its own dictionary at
// read time instead of the server baking one fixed language into the stored text. Any nameHe/
// nameEn pair in titleParams is resolved to a single display name client-side the same way the
// rest of the app does (see LanguageContext's displayName). Kept optional alongside the legacy
// `title` field so already-stored notifications (written before this existed) still render via
// their frozen Hebrew text instead of breaking.
export async function createNotification(params: {
  tripId: string;
  actorUserId: string;
  type: string;
  titleKey: string;
  titleParams?: Record<string, string | number>;
  body?: string;
  targetScreen?: string;
  targetId?: string;
}) {
  const actorName = await getUserName(params.actorUserId);
  await adminDb.collection("trips").doc(params.tripId).collection("notifications").add({
    type: params.type,
    titleKey: params.titleKey,
    titleParams: params.titleParams || {},
    body: params.body || null,
    actorUserId: params.actorUserId,
    actorName,
    targetScreen: params.targetScreen || null,
    targetId: params.targetId || null,
    createdAt: FieldValue.serverTimestamp(),
    readBy: [],
    deletedBy: [],
  });
}
