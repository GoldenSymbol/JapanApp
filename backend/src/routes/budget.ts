import { Router } from "express";
import { randomUUID } from "node:crypto";
import { adminDb } from "../firebaseAdmin.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { getMyTrip, createNotification } from "../context.js";
import { getUsdRates, convert } from "../fx.js";
import { getUserDoc } from "../users.js";

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

const SUPPORTED_CURRENCIES = ["ILS", "JPY", "USD", "EUR"];
// The shared budget is one currency for the whole group. Every stored amount is already in it.
const GENERAL_CURRENCY = "ILS";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
// Yen has no minor unit; everything else is kept to the cent.
function roundIn(amount: number, currency: string) {
  return currency === "JPY" ? Math.round(amount) : round2(amount);
}

// Turns a submitted expense into the document to store plus what to tell the client. A currency
// other than the budget's is converted once, now, at the current rate, and that rate is stored on
// the transaction so the total never drifts when rates move later. `amount` (in the budget's
// currency) is the only field the totals read; the original* fields are kept for history.
async function buildTransaction(categoryId: string, body: any, budgetCurrency: string, userId: string) {
  const raw = Math.abs(Number(body?.amount));
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const currency = SUPPORTED_CURRENCIES.includes(body?.currency) ? body.currency : budgetCurrency;
  const sign = body?.direction === "subtract" ? -1 : 1;
  let converted = raw;
  let rate = 1;
  let rateLive = true;
  if (currency !== budgetCurrency) {
    const fx = await getUsdRates();
    rate = (fx.rates[budgetCurrency] ?? 1) / (fx.rates[currency] ?? 1);
    converted = roundIn(raw * rate, budgetCurrency);
    rateLive = fx.live;
  }
  return {
    signed: sign * converted,
    doc: {
      categoryId,
      amount: sign * converted,
      originalAmount: sign * raw,
      originalCurrency: currency,
      rate,
      note: body?.note || null,
      userId,
      createdAtMs: Date.now(),
    },
    conversion: currency === budgetCurrency ? null : {
      originalAmount: sign * raw, originalCurrency: currency,
      amount: sign * converted, currency: budgetCurrency, rateLive,
    },
  };
}

// Newest first, capped, and only entries whose category still exists (deleting a category leaves its
// old transactions behind, which would otherwise show up here without a name). Older entries
// predate the original*/userId fields and simply come back with those as null.
function historyOf(txs: any[], cats: any[]) {
  const names = new Map<string, string>(cats.map((c) => [c.id, c.name]));
  return txs
    .filter((t) => names.has(t.categoryId))
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
    .slice(0, 200)
    .map((t) => ({
      id: t.id,
      categoryName: names.get(t.categoryId)!,
      amount: t.amount,
      originalAmount: t.originalAmount ?? null,
      originalCurrency: t.originalCurrency ?? null,
      userId: t.userId ?? null,
      createdAtMs: t.createdAtMs || 0,
    }));
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
    const spent = round2(spentByCategory.get(c.id) || 0);
    return {
      id: c.id,
      name: c.name,
      planned: c.plannedAmount,
      spent,
      note: c.note,
      percent: c.plannedAmount > 0 ? Math.min(999, Math.round((spent / c.plannedAmount) * 100)) : 0,
    };
  });
  const paid = round2(categories.reduce((s, c) => s + c.spent, 0));
  return { total: budgetTotal, paid, currency: GENERAL_CURRENCY, categories };
}

budgetRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  res.json(await budgetSnapshot(trip.id, trip.budget_total));
});

budgetRouter.get("/transactions", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const [cats, txs] = await Promise.all([fetchBudgetCategories(trip.id), fetchBudgetTransactions(trip.id)]);
  res.json({ transactions: historyOf(txs, cats) });
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
  const tx = await buildTransaction(catId, req.body, GENERAL_CURRENCY, req.userId!);
  if (!tx) return res.status(400).json({ error: "invalid_input" });
  const writeTx = tripRef(trip.id).collection("budgetTransactions").doc(randomUUID()).set(tx.doc);
  if (tx.signed > 0) {
    await Promise.all([
      writeTx,
      createNotification({
        tripId: trip.id,
        actorUserId: req.userId!,
        type: "new_expense",
        titleKey: "notif.newExpense",
        titleParams: { category: cat.name, amount: Math.round(tx.signed) },
        targetScreen: "budget",
      }),
    ]);
  } else {
    await writeTx;
  }
  res.json({ ...(await budgetSnapshot(trip.id, trip.budget_total)), conversion: tx.conversion });
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

// A personal budget's currency is the owner's currency setting, read once and then stored on the
// budget itself. Pinning it matters: the amounts already recorded are in that currency, so a later
// change in Settings must not silently relabel them.
async function personalCurrency(tripId: string, userId: string, pbDoc: any): Promise<string> {
  const stored = pbDoc.exists ? pbDoc.data()!.currency : null;
  if (SUPPORTED_CURRENCIES.includes(stored)) return stored;
  const user = await getUserDoc(userId);
  const currency = SUPPORTED_CURRENCIES.includes(user?.baseCurrency) ? user!.baseCurrency : "ILS";
  await tripRef(tripId).collection("personalBudgets").doc(userId).set({ currency }, { merge: true });
  return currency;
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
    const spent = round2(spentByCategory.get(c.id) || 0);
    return {
      id: c.id,
      name: c.name,
      planned: c.plannedAmount,
      spent,
      note: c.note,
      percent: c.plannedAmount > 0 ? Math.min(999, Math.round((spent / c.plannedAmount) * 100)) : 0,
    };
  });
  const paid = round2(categories.reduce((s, c) => s + c.spent, 0));
  const currency = await personalCurrency(tripId, userId, pbDoc);
  return { total: pbDoc.exists ? pbDoc.data()!.plannedTotal || 0 : 0, paid, currency, categories };
}

budgetRouter.get("/personal", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  res.json(await personalSnapshot(trip.id, req.userId!));
});

budgetRouter.get("/personal/transactions", requireAuth, async (req: AuthedRequest, res) => {
  const trip = await requireTrip(req, res);
  if (!trip) return;
  const [cats, txs] = await Promise.all([fetchPersonalCategories(trip.id, req.userId!), fetchPersonalTransactions(trip.id)]);
  res.json({ transactions: historyOf(txs, cats) });
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
  const pbDoc = await tripRef(trip.id).collection("personalBudgets").doc(req.userId!).get();
  const currency = await personalCurrency(trip.id, req.userId!, pbDoc);
  const tx = await buildTransaction(catId, req.body, currency, req.userId!);
  if (!tx) return res.status(400).json({ error: "invalid_input" });
  await tripRef(trip.id).collection("personalBudgetTransactions").doc(randomUUID()).set(tx.doc);
  res.json({ ...(await personalSnapshot(trip.id, req.userId!)), conversion: tx.conversion });
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
