import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip } from "../context.js";
import { publicUser, ensureUser, getUserDoc, patchUser } from "../users.js";
import { recordTermsAcceptance } from "../consent.js";
import { TERMS_VERSION } from "../legal.js";

export const authRouter = Router();

// Called once right after a Firebase Auth signup, with a verified Firebase ID token.
// Password verification itself is handled entirely by Firebase Auth, not here. This does NOT
// record terms acceptance by itself — the frontend's signup flow calls POST /accept-terms right
// after this succeeds, once the UI has confirmed the checkbox was actually checked. Keeping the
// two steps separate means a partially-failed signup never ends up with a false "accepted" record.
authRouter.post("/bootstrap", requireAuth, async (req: AuthedRequest, res) => {
  const { name, email } = req.body || {};
  const user = await ensureUser(req.userId!, name, email);
  const trip = await getMyTrip(req.userId!);
  res.json({ user: publicUser(req.userId!, user), trip: trip ? { id: trip.id, name: trip.name } : null, currentTermsVersion: TERMS_VERSION });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await getUserDoc(req.userId!);
  if (!user) return res.status(404).json({ error: "not_found", message: "לא הצלחנו לטעון את הפרופיל שלך, נסה/י שוב" });
  const trip = await getMyTrip(req.userId!);
  res.json({ user: publicUser(req.userId!, user), trip: trip ? { id: trip.id, name: trip.name } : null, currentTermsVersion: TERMS_VERSION });
});

// Deliberately NOT gated by requireTermsAccepted — a user has to be able to call this in order to
// ever satisfy it. Records acceptance of whatever TERMS_VERSION currently is; the client cannot
// specify a version or a timestamp (see recordTermsAcceptance).
authRouter.post("/accept-terms", requireAuth, async (req: AuthedRequest, res) => {
  await recordTermsAcceptance(req.userId!);
  const user = await getUserDoc(req.userId!);
  res.json({ user: publicUser(req.userId!, user!), currentTermsVersion: TERMS_VERSION });
});

// Profile photos are stored on the user document as a small inline JPEG (the client crops and
// shrinks it to ~256px first), so an `<img>` can show it with no extra authenticated request.
// Only that shape is accepted: not an arbitrary URL (which would let a profile make every member's
// browser fetch a third-party address) and capped well under the JSON body limit.
const PHOTO_PREFIX = "data:image/jpeg;base64,";
const PHOTO_MAX_CHARS = 80_000;
function isValidPhoto(v: unknown): boolean {
  return v === null || (typeof v === "string" && v.startsWith(PHOTO_PREFIX) && v.length <= PHOTO_MAX_CHARS && /^[A-Za-z0-9+/=]+$/.test(v.slice(PHOTO_PREFIX.length)));
}

authRouter.patch("/me", requireAuth, async (req: AuthedRequest, res) => {
  const body = req.body || {};
  if ("photoUrl" in body && !isValidPhoto(body.photoUrl)) return res.status(400).json({ error: "invalid_photo" });
  const patch: Record<string, any> = {};
  for (const key of ["name", "avatarColor", "photoUrl", "darkMode", "palette", "uiLang", "baseCurrency"]) {
    if (key in body) patch[key] = body[key];
  }
  if (body.prefs) {
    for (const key of ["weather", "offlineSave", "autoSync"]) {
      if (key in body.prefs) patch[`prefs.${key}`] = !!body.prefs[key];
    }
  }
  if (body.notifPrefs) {
    for (const key of ["newAttraction", "newDestination", "reschedule", "newExpense"]) {
      if (key in body.notifPrefs) patch[`notifPrefs.${key}`] = !!body.notifPrefs[key];
    }
  }
  const user = Object.keys(patch).length ? await patchUser(req.userId!, patch) : await getUserDoc(req.userId!);
  res.json({ user: publicUser(req.userId!, user!) });
});
