import { Router } from "express";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip } from "../context.js";

export const chatRouter = Router();

const MODEL = process.env.CHAT_MODEL || "claude-sonnet-5";
let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

function buildTripContext(tripId: string) {
  const dests = db.prepare("SELECT name_he, name_en, start_date, end_date FROM destinations WHERE trip_id = ? ORDER BY order_index ASC").all(tripId) as any[];
  const itinerary = dests.map((d) => `${d.name_he} (${d.name_en}): ${d.start_date} עד ${d.end_date}`).join("\n");
  const budget = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId) as any;
  return `אתה סוכן טיולים ידידותי בשם "הסוכן", עוזר לזוג שמתכנן טיול ליפן, 1 באפריל - 2 במאי 2027.
המסלול המתוכנן:
${itinerary || "(עדיין לא הוגדר מסלול)"}

תקציב כולל: ${budget?.budget_total ?? "לא הוגדר"} ש"ח.

ענה בעברית (אלא אם נשאלת ביפנית/אנגלית), בקצרה ולעניין, עם המלצות מעשיות: מסעדות, תחבורה ורכבות, מה לדחוס ביום אחד, ושינויים במסלול. אם אתה ממליץ לשנות את המסלול, ציין בבירור איזה יעד/תאריך.`;
}

chatRouter.get("/messages", requireAuth, (req: AuthedRequest, res) => {
  const trip = getMyTrip(req.userId!);
  if (!trip) return res.json({ messages: [] });
  const rows = db.prepare("SELECT * FROM chat_messages WHERE trip_id = ? ORDER BY created_at ASC LIMIT 200").all(trip.id) as any[];
  res.json({
    messages: rows.map((r) => ({ id: r.id, role: r.role, content: r.content, createdAt: r.created_at })),
  });
});

chatRouter.post("/messages", requireAuth, async (req: AuthedRequest, res) => {
  const trip = getMyTrip(req.userId!);
  if (!trip) return res.status(404).json({ error: "no_trip" });
  const content = String(req.body?.content || "").trim();
  if (!content) return res.status(400).json({ error: "invalid_input" });

  db.prepare(`INSERT INTO chat_messages (id, trip_id, user_id, role, content) VALUES (?, ?, ?, 'user', ?)`).run(
    randomUUID(), trip.id, req.userId, content
  );

  const anthropic = getClient();
  if (!anthropic) {
    const fallback = "לא הוגדר מפתח ANTHROPIC_API_KEY בשרת, אז אני לא יכול לענות כרגע. הוסיפו את המפתח כמשתנה סביבה כדי להפעיל את הסוכן.";
    const id = randomUUID();
    db.prepare(`INSERT INTO chat_messages (id, trip_id, user_id, role, content) VALUES (?, ?, NULL, 'assistant', ?)`).run(id, trip.id, fallback);
    return res.json({ message: { id, role: "assistant", content: fallback } });
  }

  const history = db.prepare("SELECT role, content FROM chat_messages WHERE trip_id = ? ORDER BY created_at ASC LIMIT 40").all(trip.id) as any[];

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: buildTripContext(trip.id),
      messages: history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim() || "מצטער, לא הצלחתי לענות כרגע.";
    const id = randomUUID();
    db.prepare(`INSERT INTO chat_messages (id, trip_id, user_id, role, content) VALUES (?, ?, NULL, 'assistant', ?)`).run(id, trip.id, text);
    res.json({ message: { id, role: "assistant", content: text } });
  } catch (err: any) {
    const message = "הייתה שגיאה בפנייה לסוכן ה-AI. נסו שוב בעוד רגע.";
    const id = randomUUID();
    db.prepare(`INSERT INTO chat_messages (id, trip_id, user_id, role, content) VALUES (?, ?, NULL, 'assistant', ?)`).run(id, trip.id, message);
    res.status(200).json({ message: { id, role: "assistant", content: message }, error: String(err?.message || err) });
  }
});
