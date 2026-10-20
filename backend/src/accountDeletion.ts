import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminBucket, adminDb } from "./firebaseAdmin.js";

// Permanently removes a user and everything that is theirs alone, per the Terms of Service:
//  - personal budget (settings, categories, transactions), their attraction marks, their profile
//    and their login are deleted;
//  - things they added to a shared trip stay for the other members but are no longer linked to
//    them (uploader / author fields cleared, notifications they triggered removed);
//  - a trip they owned passes to the member who joined next; a trip they were the only member of
//    is deleted entirely, including its stored files.
// Idempotent on purpose: if it fails half way the user can simply run it again (their login is
// the very last thing removed, so the token keeps working until everything else is done).
// The terms-acceptance log (`consentLog`) is kept as proof of consent; it holds only the user id.

async function removeFromTrip(tripId: string, tripData: FirebaseFirestore.DocumentData, uid: string) {
  const tripRef = adminDb.collection("trips").doc(tripId);
  const memberIds: string[] = tripData.memberIds || [];
  const others = memberIds.filter((id) => id !== uid);

  if (others.length === 0) {
    await adminDb.recursiveDelete(tripRef);
    await adminBucket.deleteFiles({ prefix: `trips/${tripId}/` }).catch((err) => console.error("trip files delete failed", tripId, err));
    return;
  }

  const writer = adminDb.bulkWriter();

  if (tripData.ownerId === uid) {
    const membersSnap = await tripRef.collection("members").orderBy("joinedAt", "asc").get();
    const next = membersSnap.docs.find((d) => d.id !== uid)?.id ?? others[0];
    writer.update(tripRef, { ownerId: next });
    writer.set(tripRef.collection("members").doc(next), { role: "owner" }, { merge: true });
  }
  writer.update(tripRef, { memberIds: FieldValue.arrayRemove(uid), rev: FieldValue.increment(1) });
  writer.delete(tripRef.collection("members").doc(uid));

  // Personal budget: everything keyed to this user.
  writer.delete(tripRef.collection("personalBudgets").doc(uid));
  const personalCats = await tripRef.collection("personalBudgetCategories").where("userId", "==", uid).get();
  const catIds = new Set(personalCats.docs.map((d) => d.id));
  personalCats.docs.forEach((d) => writer.delete(d.ref));
  const personalTx = await tripRef.collection("personalBudgetTransactions").get();
  personalTx.docs.forEach((d) => {
    const t = d.data();
    if (t.userId === uid || catIds.has(t.categoryId)) writer.delete(d.ref);
  });

  // Shared content stays, minus the link to this person.
  const [attractions, sharedTx, documents, notifications] = await Promise.all([
    tripRef.collection("attractions").get(),
    tripRef.collection("budgetTransactions").get(),
    tripRef.collection("documents").get(),
    tripRef.collection("notifications").get(),
  ]);
  attractions.docs.forEach((d) => {
    if (d.data().marksByUser && uid in d.data().marksByUser) writer.update(d.ref, { [`marksByUser.${uid}`]: FieldValue.delete() });
  });
  sharedTx.docs.forEach((d) => {
    if (d.data().userId === uid) writer.update(d.ref, { userId: null });
  });
  documents.docs.forEach((d) => {
    if (d.data().uploadedBy === uid) writer.update(d.ref, { uploadedBy: null, uploadedByName: null });
  });
  notifications.docs.forEach((d) => {
    const n = d.data();
    if (n.actorUserId === uid) { writer.delete(d.ref); return; }
    const patch: Record<string, unknown> = {};
    if ((n.readBy || []).includes(uid)) patch.readBy = FieldValue.arrayRemove(uid);
    if ((n.deletedBy || []).includes(uid)) patch.deletedBy = FieldValue.arrayRemove(uid);
    if (Object.keys(patch).length) writer.update(d.ref, patch);
  });

  await writer.close();
}

export async function deleteAccount(uid: string) {
  const trips = await adminDb.collection("trips").where("memberIds", "array-contains", uid).get();
  for (const t of trips.docs) await removeFromTrip(t.id, t.data(), uid);

  // The per-user share of the monthly translation counters (the monthly total stays).
  const usage = await adminDb.collection("translateUsage").get();
  const cleanup = adminDb.bulkWriter();
  usage.docs.forEach((d) => {
    if (d.data().users && uid in d.data().users) cleanup.update(d.ref, { [`users.${uid}`]: FieldValue.delete() });
  });
  cleanup.delete(adminDb.collection("users").doc(uid));
  await cleanup.close();

  try {
    await adminAuth.deleteUser(uid);
  } catch (err: any) {
    if (err?.code !== "auth/user-not-found") throw err;
  }
}
