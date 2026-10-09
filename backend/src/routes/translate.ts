import { Router } from "express";
import { GoogleAuth } from "google-auth-library";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../db.js";
import { adminDb } from "../firebaseAdmin.js";
import { requireAuth, type AuthedRequest } from "../auth.js";

export const translateRouter = Router();

// Suggested travel phrases for the tap-to-fill list. Only the Hebrew text is used as a starting point;
// the translation itself always comes from Google Translate, not from this table.
translateRouter.get("/dictionary", requireAuth, (_req, res) => {
  const rows = db.prepare("SELECT he, en, ja, romaji, kind FROM translations ORDER BY kind DESC, rowid ASC").all();
  res.json({ entries: rows });
});

const LANGS = ["he", "en", "ja"] as const;
type Lang = (typeof LANGS)[number];
const MAX_CHARS = 500;

// Google Cloud Translation, called with the Cloud Run service's own credentials (no API key to store).
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

async function googleCall(path: string, body: unknown): Promise<any> {
  const [projectId, token] = await Promise.all([auth.getProjectId(), auth.getAccessToken()]);
  const res = await fetch(`https://translation.googleapis.com/v3/projects/${projectId}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "x-goog-user-project": projectId, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`translation api ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// The same phrase gets looked up again and again (the suggestions list, retyping), so keep recent
// results for a day instead of paying for each repeat. Bounded so it can't grow without limit.
const CACHE_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { at: number; value: { text: string; romaji: string | null } }>();

// Each user gets a modest allowance per minute, so a stuck loop or a script can't run up the bill.
// Per server instance, which is plenty to bound the cost.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 40;
const hits = new Map<string, number[]>();

// ---- Monthly allowance ----
// Google's free tier (500,000 characters a month) is shared by the whole project, so this budget is too:
// one counter for everyone, kept below the free tier, plus a per-person share so one user can't use it
// all up. Counted in characters sent for translation plus the characters romanized afterwards, since
// both are billed. Stored in Firestore (one small document per month) so it holds across server
// instances and restarts. Raise or lower these numbers to change the allowance.
const MONTHLY_CAP_ALL = 400_000;
const MONTHLY_CAP_PER_USER = 200_000;

function usageRef() {
  return adminDb.collection("translateUsage").doc(new Date().toISOString().slice(0, 7)); // e.g. "2026-10", UTC
}
async function readUsage(userId: string): Promise<{ all: number; mine: number }> {
  const d = (await usageRef().get()).data() as { total?: number; users?: Record<string, number> } | undefined;
  return { all: d?.total ?? 0, mine: d?.users?.[userId] ?? 0 };
}
async function recordUsage(userId: string, chars: number) {
  await usageRef().set({ total: FieldValue.increment(chars), users: { [userId]: FieldValue.increment(chars) } }, { merge: true });
}
function overLimit(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) { hits.set(userId, recent); return true; }
  recent.push(now);
  hits.set(userId, recent);
  return false;
}

translateRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const text = String(req.body?.text ?? "").trim();
  const from = req.body?.from as Lang;
  const to = req.body?.to as Lang;
  if (!text || text.length > MAX_CHARS || !LANGS.includes(from) || !LANGS.includes(to) || from === to) {
    return res.status(400).json({ error: "invalid_input" });
  }
  if (overLimit(req.userId!)) return res.status(429).json({ error: "too_many_requests" });

  const key = `${from}|${to}|${text}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return res.json(cached.value);

  // Checked before spending anything; a cache hit above never reaches this.
  const usage = await readUsage(req.userId!);
  if (usage.all + text.length > MONTHLY_CAP_ALL || usage.mine + text.length > MONTHLY_CAP_PER_USER) {
    return res.status(429).json({ error: "monthly_limit" });
  }

  try {
    const data = await googleCall("/locations/global:translateText", {
      contents: [text], sourceLanguageCode: from, targetLanguageCode: to, mimeType: "text/plain",
    });
    const translated: string = data.translations?.[0]?.translatedText ?? "";
    // Japanese output comes with its romaji reading, for saying it aloud.
    let romaji: string | null = null;
    let billedChars = text.length;
    if (to === "ja" && translated) {
      try {
        const r = await googleCall("/locations/global:romanizeText", { contents: [translated], sourceLanguageCode: "ja" });
        romaji = r.romanizations?.[0]?.romanizedText ?? null;
        billedChars += translated.length;
      } catch (err) {
        console.error("romanize failed", err);
      }
    }
    // Awaited rather than fired off: Cloud Run can stall work left running after the response is sent, which
    // would silently lose counts.
    await recordUsage(req.userId!, billedChars).catch((err) => console.error("usage record failed", err));
    const value = { text: translated, romaji };
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), value });
    res.json(value);
  } catch (err) {
    console.error("translate failed", err);
    res.status(502).json({ error: "translate_unavailable" });
  }
});
