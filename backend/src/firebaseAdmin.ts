import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json";
const serviceAccount = JSON.parse(readFileSync(keyPath, "utf-8"));

const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
