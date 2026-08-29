import { Router } from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { signToken, requireAuth, type AuthedRequest } from "../auth.js";
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
      agentTips: !!u.pref_agent_tips,
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

authRouter.post("/signup", (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || String(password).length < 8) {
    return res.status(400).json({ error: "invalid_input", message: "שם, אימייל וסיסמה של 8 תווים לפחות" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(String(email).toLowerCase());
  if (existing) return res.status(409).json({ error: "email_taken", message: "האימייל הזה כבר רשום" });

  const id = randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`
  ).run(id, name, String(email).toLowerCase(), hash);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  res.json({ token: signToken(id), user: publicUser(user), trip: null });
});

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email || "").toLowerCase()) as any;
  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(401).json({ error: "invalid_credentials", message: "אימייל או סיסמה שגויים" });
  }
  const trip = getMyTrip(user.id);
  res.json({ token: signToken(user.id), user: publicUser(user), trip: trip ? { id: trip.id, name: trip.name } : null });
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
    agentTips: "pref_agent_tips",
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
