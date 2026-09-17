import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin.js";
import { TERMS_VERSION } from "./legal.js";

// Records that `userId` accepted the CURRENT Terms of Service, right now, as measured by the
// server clock. Two things are written:
//  - `users/{userId}.termsAcceptedVersion` / `.termsAcceptedAt` — a fast-to-read "current status"
//    used to decide whether to show the terms gate on login.
//  - `consentLog` — an append-only audit trail (one immutable doc per acceptance event) so that
//    if a user accepts version 1.0 today and version 1.1 next year, both events stay on record —
//    overwriting the status field above would otherwise lose that history.
// There is no client-supplied version or timestamp anywhere in this function on purpose: both are
// always the server's own current value, so a user can never backdate an acceptance or claim to
// have accepted a version that was never actually shown to them.
export async function recordTermsAcceptance(userId: string) {
  const acceptedAt = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection("users").doc(userId), { termsAcceptedVersion: TERMS_VERSION, termsAcceptedAt: acceptedAt }, { merge: true });
  batch.set(adminDb.collection("consentLog").doc(), {
    userId,
    docType: "terms",
    version: TERMS_VERSION,
    acceptedAt,
  });
  await batch.commit();
}
