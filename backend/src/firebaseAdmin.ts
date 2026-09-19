import { existsSync, readFileSync } from "node:fs";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json";
// Locally we read a downloaded service account key; on Cloud Run there is no key file,
// so we fall back to the runtime service account via Application Default Credentials.
const credential = existsSync(keyPath) ? cert(JSON.parse(readFileSync(keyPath, "utf-8"))) : applicationDefault();

// Default bucket is japan2027-d9ae6.firebasestorage.app, provisioned in us-central1 (not
// me-west1 like the rest of this project's infra) specifically to stay within Cloud Storage for
// Firebase's free tier, which only applies to US regions — see backend/src/routes/documents.ts.
const app = getApps().length ? getApps()[0] : initializeApp({ credential, storageBucket: "japan2027-d9ae6.firebasestorage.app" });
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminBucket = getStorage(app).bucket();
