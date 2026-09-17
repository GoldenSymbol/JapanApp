import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "./firebaseAdmin.js";
import { getUserDoc } from "./users.js";
import { TERMS_VERSION } from "./legal.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "not_authenticated" });
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.userId = decoded.uid;
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

// Server-side enforcement that the signed-in user has accepted the current Terms of Service,
// independent of whatever the frontend's own gate does — a client can't bypass this by skipping
// the UI. Mounted on every router except auth itself, so /api/auth/me, /api/auth/accept-terms and
// logout (a purely client-side Firebase call) all keep working before acceptance, matching the
// product requirement that a user is never fully locked out while they still need to accept.
export async function requireTermsAccepted(req: AuthedRequest, res: Response, next: NextFunction) {
  // Must run after requireAuth (needs req.userId already set) — defends against a future
  // mounting mistake with a clear 401 instead of a Firestore path crash.
  if (!req.userId) return res.status(401).json({ error: "not_authenticated" });
  const user = await getUserDoc(req.userId);
  if (user?.termsAcceptedVersion !== TERMS_VERSION) {
    return res.status(403).json({ error: "terms_not_accepted", requiredVersion: TERMS_VERSION });
  }
  next();
}
