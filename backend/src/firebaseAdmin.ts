import { existsSync, readFileSync } from "node:fs";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json";
// Locally we read a downloaded service account key; on Cloud Run there is no key file,
// so we fall back to the runtime service account via Application Default Credentials.
const credential = existsSync(keyPath) ? cert(JSON.parse(readFileSync(keyPath, "utf-8"))) : applicationDefault();

const app = getApps().length ? getApps()[0] : initializeApp({ credential });
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
