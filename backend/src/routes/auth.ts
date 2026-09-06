import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip } from "../context.js";

export const authRouter = Router();

function publicUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarColor: u.avatar_color,
    photoUrl: u.photo_url,
    darkMode: !!u.dark_mode,
    palette: u.palette,
    uiLang: u.ui_lang,
    baseCurrency: u.base_currency,
    prefs: {
      weather: !!u.pref_weather,
      offlineSave: !!u.pref_offline_save,
      autoSync: !!u.pref_auto_sync,
    },
    notifPrefs: {
      newAttraction: !!u.notif_new_attraction,
      newDestination: !!u.notif_new_destination,
      reschedule: !!u.notif_reschedule,
      newExpense: !!u.notif_new_expense,
    },
  };
}

// Called once right after a Firebase Auth signup, with a verified Firebase ID token.
// Creates the matching profile row in SQLite (keyed by the Firebase uid) if it doesn't exist yet —
// password verification itself is handled entirely by Firebase Auth, not here.
authRouter.post("/bootstrap", requireAuth, (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!existing) {
    const { name, email } = req.body || {};
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, '')`
    ).run(req.userId, name || "משתמש", String(email || "").toLowerCase());
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  const trip = getMyTrip(req.userId!);
  res.json({ user: publicUser(user), trip: trip ? { id: trip.id, name: trip.name } : null });
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId) as any;
  if (!user) return res.status(404).json({ error: "not_found" });
  const trip = getMyTrip(user.id);
  res.json({ user: publicUser(user), trip: trip ? { id: trip.id, name: trip.name } : null });
});

authRouter.patch("/me", requireAuth, (req: AuthedRequest, res) => {
  const allowed: Record<string, string> = {
    name: "name",
    avatarColor: "avatar_color",
    photoUrl: "photo_url",
    darkMode: "dark_mode",
    palette: "palette",
    uiLang: "ui_lang",
    baseCurrency: "base_currency",
  };
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [key, col] of Object.entries(allowed)) {
    if (key in (req.body || {})) {
      sets.push(`${col} = ?`);
      let v = req.body[key];
      if (typeof v === "boolean") v = v ? 1 : 0;
      vals.push(v);
    }
  }
  const prefMap: Record<string, string> = {
    weather: "pref_weather",
    offlineSave: "pref_offline_save",
    autoSync: "pref_auto_sync",
  };
  if (req.body?.prefs) {
    for (const [key, col] of Object.entries(prefMap)) {
      if (key in req.body.prefs) {
        sets.push(`${col} = ?`);
        vals.push(req.body.prefs[key] ? 1 : 0);
      }
    }
  }
  const notifMap: Record<string, string> = {
    newAttraction: "notif_new_attraction",
    newDestination: "notif_new_destination",
    reschedule: "notif_reschedule",
    newExpense: "notif_new_expense",
  };
  if (req.body?.notifPrefs) {
    for (const [key, col] of Object.entries(notifMap)) {
      if (key in req.body.notifPrefs) {
        sets.push(`${col} = ?`);
        vals.push(req.body.notifPrefs[key] ? 1 : 0);
      }
    }
  }
  if (sets.length) {
    vals.push(req.userId);
    db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ user: publicUser(user) });
});
