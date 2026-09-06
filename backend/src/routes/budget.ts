import { Router } from "express";
import { randomUUID } from "node:crypto";
import { adminDb } from "../firebaseAdmin.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip, createNotification } from "../context.js";
import { getUsdRates, convert } from "../fx.js";

export const budgetRouter = Router();

function tripRef(tripId: string) {
  return adminDb.collection("trips").doc(tripId);
}

async function requireTrip(req: AuthedRequest, res: any): Promise<any> {
  const trip = await getMyTrip(req.userId!);
  if (!trip) {
    res.status(404).json({ error: "no_trip" });
    return null;
  }
  return trip;
}

async function fetchBudgetCategories(tripId: string) {
  const snap = await tripRef(tripId).collection("budgetCategories").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any)).sort((a, b) => a.orderIndex - b.orderIndex);
}

async function fetchBudgetTransactions(tripId: string) {
  const snap = await tripRef(tripId).collection("budgetTransactions").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
}

async function budgetSnapshot(tripId: string, budgetTotal: number) {
  const [cats, txs] = await Promise.all([fetchBudgetCategories(tripId), fetchBudgetTransactions(tripId)]);
  const spentByCategory = new Map<string, number>();
  for (const t of txs) spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) || 0) + t.amount);
  const categories = cats.map((c) => {
    const spent = spentByCategory.get(c.id) || 0;
    return {
      id: c.id,
      name: c.name,
      planned: c.plannedAmount,
      spent,
      note: c.note,
      percent: c.plannedAmount > 0 ? Math.min(999, Math.round((spent / c.plannedAmount) * 100)) : 0,
    };
  });
  const paid = categories.reduce((s, c) => s + c.spent, 0);
  return { total: budgetTotal, paid, categories };
}

budgetRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  res.json(await budgetSnapshot(trip.id, trip.budget_total));
});

budgetRouter.patch("/", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  let budgetTotal = trip.budget_total;
  if (typeof req.body?.total === "number") {
    budgetTotal = req.body.total;
    await tripRef(trip.id).update({ budgetTotal });
  }
  res.json(await budgetSnapshot(trip.id, budgetTotal));
});

budgetRouter.post("/categories", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const { name, planned, note } = req.body || {};
  if (!name) return res.status(400).json({ error: "invalid_input" });
  const existing = await fetchBudgetCategories(trip.id);
  const maxOrder = existing.reduce((m, c) => Math.max(m, c.orderIndex), -1);
  await tripRef(trip.id).collection("budgetCategories").doc(randomUUID()).set({
    orderIndex: maxOrder + 1,
    name,
    plannedAmount: planned || 0,
    note: note || null,
  });
  res.json(await budgetSnapshot(trip.id, trip.budget_total));
});

budgetRouter.patch("/categories/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const allowed: Record<string, string> = { name: "name", planned: "plannedAmount", note: "note" };
  const patch: Record<string, any> = {};
  for (const [k, field] of Object.entries(allowed)) {
    if (k in (req.body || {})) patch[field] = req.body[k];
  }
  if (Object.keys(patch).length) {
    await tripRef(trip.id).collection("budgetCategories").doc(String(req.params.id)).update(patch);
  }
  res.json(await budgetSnapshot(trip.id, trip.budget_total));
});

budgetRouter.delete("/categories/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  await tripRef(trip.id).collection("budgetCategories").doc(String(req.params.id)).delete();
  res.json(await budgetSnapshot(trip.id, trip.budget_total));
});

budgetRouter.post("/categories/:id/transactions", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const catId = String(req.params.id);
  const catDoc = await tripRef(trip.id).collection("budgetCategories").doc(catId).get();
  if (!catDoc.exists) return res.status(404).json({ error: "not_found" });
  const cat = catDoc.data()!;
  let amount = Number(req.body?.amount || 0);
  amount = req.body?.direction === "subtract" ? -Math.abs(amount) : Math.abs(amount);
  await tripRef(trip.id).collection("budgetTransactions").doc(randomUUID()).set({
    categoryId: catId,
    amount,
    note: req.body?.note || null,
    createdAtMs: Date.now(),
  });
  if (amount > 0) {
    await createNotification({
      tripId: trip.id,
      actorUserId: req.userId!,
      type: "new_expense",
      title: `הוצאה חדשה ב${cat.name}: ${Math.round(amount)}₪`,
      targetScreen: "budget",
    });
  }
  res.json(await budgetSnapshot(trip.id, trip.budget_total));
});

// Personal budgets: fully separate per-member spending, private to each member. Categories/
// transactions live in flat per-trip collections (matching the destinations/attractions
// pattern) so no composite index is ever required — reads for a given user filter in memory.
async function fetchPersonalCategories(tripId: string, userId: string) {
  const snap = await tripRef(tripId).collection("personalBudgetCategories").where("userId", "==", userId).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any)).sort((a, b) => a.orderIndex - b.orderIndex);
}

async function fetchPersonalTransactions(tripId: string) {
  const snap = await tripRef(tripId).collection("personalBudgetTransactions").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
}

async function personalSnapshot(tripId: string, userId: string) {
  const [pbDoc, cats, allTxs] = await Promise.all([
    tripRef(tripId).collection("personalBudgets").doc(userId).get(),
    fetchPersonalCategories(tripId, userId),
    fetchPersonalTransactions(tripId),
  ]);
  const catIds = new Set(cats.map((c) => c.id));
  const spentByCategory = new Map<string, number>();
  for (const t of allTxs) {
    if (catIds.has(t.categoryId)) spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) || 0) + t.amount);
  }
  const categories = cats.map((c) => {
    const spent = spentByCategory.get(c.id) || 0;
    return {
      id: c.id,
      name: c.name,
      planned: c.plannedAmount,
      spent,
      note: c.note,
      percent: c.plannedAmount > 0 ? Math.min(999, Math.round((spent / c.plannedAmount) * 100)) : 0,
    };
  });
  const paid = categories.reduce((s, c) => s + c.spent, 0);
  return { total: pbDoc.exists ? pbDoc.data()!.plannedTotal || 0 : 0, paid, categories };
}

budgetRouter.get("/personal", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  res.json(await personalSnapshot(trip.id, req.userId!));
});

budgetRouter.patch("/personal", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  if (typeof req.body?.total === "number") {
    await tripRef(trip.id).collection("personalBudgets").doc(req.userId!).set({ plannedTotal: req.body.total }, { merge: true });
  }
  res.json(await personalSnapshot(trip.id, req.userId!));
});

budgetRouter.post("/personal/categories", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const { name, planned, note } = req.body || {};
  if (!name) return res.status(400).json({ error: "invalid_input" });
  const existing = await fetchPersonalCategories(trip.id, req.userId!);
  const maxOrder = existing.reduce((m, c) => Math.max(m, c.orderIndex), -1);
  await tripRef(trip.id).collection("personalBudgetCategories").doc(randomUUID()).set({
    userId: req.userId,
    orderIndex: maxOrder + 1,
    name,
    plannedAmount: planned || 0,
    note: note || null,
  });
  res.json(await personalSnapshot(trip.id, req.userId!));
});

budgetRouter.patch("/personal/categories/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const catRef = tripRef(trip.id).collection("personalBudgetCategories").doc(String(req.params.id));
  const doc = await catRef.get();
  if (!doc.exists || doc.data()!.userId !== req.userId) return res.status(404).json({ error: "not_found" });
  const allowed: Record<string, string> = { name: "name", planned: "plannedAmount", note: "note" };
  const patch: Record<string, any> = {};
  for (const [k, field] of Object.entries(allowed)) {
    if (k in (req.body || {})) patch[field] = req.body[k];
  }
  if (Object.keys(patch).length) await catRef.update(patch);
  res.json(await personalSnapshot(trip.id, req.userId!));
});

budgetRouter.delete("/personal/categories/:id", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const catRef = tripRef(trip.id).collection("personalBudgetCategories").doc(String(req.params.id));
  const doc = await catRef.get();
  if (doc.exists && doc.data()!.userId === req.userId) await catRef.delete();
  res.json(await personalSnapshot(trip.id, req.userId!));
});

budgetRouter.post("/personal/categories/:id/transactions", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const catId = String(req.params.id);
  const catDoc = await tripRef(trip.id).collection("personalBudgetCategories").doc(catId).get();
  if (!catDoc.exists || catDoc.data()!.userId !== req.userId) return res.status(404).json({ error: "not_found" });
  let amount = Number(req.body?.amount || 0);
  amount = req.body?.direction === "subtract" ? -Math.abs(amount) : Math.abs(amount);
  await tripRef(trip.id).collection("personalBudgetTransactions").doc(randomUUID()).set({
    categoryId: catId,
    amount,
    note: req.body?.note || null,
    createdAtMs: Date.now(),
  });
  res.json(await personalSnapshot(trip.id, req.userId!));
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
