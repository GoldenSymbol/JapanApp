import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip } from "../context.js";
import { publicUser, ensureUser, getUserDoc, patchUser } from "../users.js";

export const authRouter = Router();

// Called once right after a Firebase Auth signup, with a verified Firebase ID token.
// Password verification itself is handled entirely by Firebase Auth, not here.
authRouter.post("/bootstrap", requireAuth, async (req: AuthedRequest, res) => {
  const { name, email } = req.body || {};
  const user = await ensureUser(req.userId!, name, email);
  const trip = await getMyTrip(req.userId!);
  res.json({ user: publicUser(req.userId!, user), trip: trip ? { id: trip.id, name: trip.name } : null });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await getUserDoc(req.userId!);
  if (!user) return res.status(404).json({ error: "not_found" });
  const trip = await getMyTrip(req.userId!);
  res.json({ user: publicUser(req.userId!, user), trip: trip ? { id: trip.id, name: trip.name } : null });
});

authRouter.patch("/me", requireAuth, async (req: AuthedRequest, res) => {
  const body = req.body || {};
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
