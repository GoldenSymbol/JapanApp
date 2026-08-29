import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip, createNotification } from "../context.js";
import { getUsdRates, convert } from "../fx.js";

export const budgetRouter = Router();

function requireTrip(req: AuthedRequest, res: any): any {
  const trip = getMyTrip(req.userId!);
  if (!trip) {
    res.status(404).json({ error: "no_trip" });
    return null;
  }
  return trip;
}

function budgetSnapshot(tripId: string) {
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId) as any;
  const cats = db.prepare("SELECT * FROM budget_categories WHERE trip_id = ? ORDER BY order_index ASC").all(tripId) as any[];
  const categories = cats.map((c) => {
    const spent = (db.prepare("SELECT COALESCE(SUM(amount), 0) s FROM budget_transactions WHERE category_id = ?").get(c.id) as any).s;
    return {
      id: c.id,
      name: c.name,
      planned: c.planned_amount,
      spent,
      note: c.note,
      percent: c.planned_amount > 0 ? Math.min(999, Math.round((spent / c.planned_amount) * 100)) : 0,
    };
  });
  const paid = categories.reduce((s, c) => s + c.spent, 0);
  return { total: trip.budget_total, paid, categories };
}

budgetRouter.get("/", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  res.json(budgetSnapshot(trip.id));
});

budgetRouter.patch("/", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  if (typeof req.body?.total === "number") {
    db.prepare("UPDATE trips SET budget_total = ? WHERE id = ?").run(req.body.total, trip.id);
  }
  res.json(budgetSnapshot(trip.id));
});

budgetRouter.post("/categories", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  const { name, planned, note } = req.body || {};
  if (!name) return res.status(400).json({ error: "invalid_input" });
  const maxOrder = (db.prepare("SELECT COALESCE(MAX(order_index), -1) m FROM budget_categories WHERE trip_id = ?").get(trip.id) as any).m;
  const id = randomUUID();
  db.prepare(`INSERT INTO budget_categories (id, trip_id, order_index, name, planned_amount, note) VALUES (?, ?, ?, ?, ?, ?)`).run(
    id, trip.id, maxOrder + 1, name, planned || 0, note || null
  );
  res.json(budgetSnapshot(trip.id));
});

budgetRouter.patch("/categories/:id", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  const allowed: Record<string, string> = { name: "name", planned: "planned_amount", note: "note" };
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, col] of Object.entries(allowed)) {
    if (k in (req.body || {})) {
      sets.push(`${col} = ?`);
      vals.push(req.body[k]);
    }
  }
  if (sets.length) {
    vals.push(req.params.id, trip.id);
    db.prepare(`UPDATE budget_categories SET ${sets.join(", ")} WHERE id = ? AND trip_id = ?`).run(...vals);
  }
  res.json(budgetSnapshot(trip.id));
});

budgetRouter.delete("/categories/:id", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  db.prepare("DELETE FROM budget_categories WHERE id = ? AND trip_id = ?").run(req.params.id, trip.id);
  res.json(budgetSnapshot(trip.id));
});

budgetRouter.post("/categories/:id/transactions", requireAuth, (req: AuthedRequest, res) => {
  const trip = requireTrip(req, res);
  if (!trip) return;
  const cat = db.prepare("SELECT * FROM budget_categories WHERE id = ? AND trip_id = ?").get(req.params.id, trip.id) as any;
  if (!cat) return res.status(404).json({ error: "not_found" });
  let amount = Number(req.body?.amount || 0);
  if (req.body?.direction === "subtract") amount = -Math.abs(amount);
  else amount = Math.abs(amount);
  db.prepare(`INSERT INTO budget_transactions (id, category_id, amount, note) VALUES (?, ?, ?, ?)`).run(
    randomUUID(), cat.id, amount, req.body?.note || null
  );
  if (amount > 0) {
    createNotification({
      tripId: trip.id,
      actorUserId: req.userId!,
      type: "new_expense",
      title: `הוצאה חדשה ב${cat.name}: ${Math.round(amount)}₪`,
      targetScreen: "budget",
    });
  }
  res.json(budgetSnapshot(trip.id));
});

budgetRouter.get("/fx-rates", requireAuth, async (_req, res) => {
  const rates = await getUsdRates();
  res.json(rates);
});

budgetRouter.post("/fx-convert", requireAuth, async (req, res) => {
  const { amount, from, to } = req.body || {};
  if (typeof amount !== "number" || !from || !to) return res.status(400).json({ error: "invalid_input" });
  const result = await convert(amount, from, to);
  res.json({ result });
});
