import "dotenv/config";
import express from "express";
import cors from "cors";
import "./db.js";
import { requireAuth, requireTermsAccepted } from "./auth.js";
import { authRouter } from "./routes/auth.js";
import { tripsRouter } from "./routes/trips.js";
import { itineraryRouter } from "./routes/itinerary.js";
import { budgetRouter } from "./routes/budget.js";
import { translateRouter } from "./routes/translate.js";
import { documentsRouter } from "./routes/documents.js";
import { runSeed } from "./seed.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
// /api/auth is intentionally the one router without requireTermsAccepted — see that
// middleware's own comment for why (it has to stay reachable to ever be satisfied).
// requireTermsAccepted needs req.userId, so requireAuth must run first — each router below
// also calls requireAuth again per-route (harmless: verifying the same already-valid token
// twice), left in place rather than stripped out of every route handler for this.
app.use("/api/auth", authRouter);
app.use("/api/trips", requireAuth, requireTermsAccepted, tripsRouter);
app.use("/api", requireAuth, requireTermsAccepted, itineraryRouter);
app.use("/api/budget", requireAuth, requireTermsAccepted, budgetRouter);
app.use("/api/translate", requireAuth, requireTermsAccepted, translateRouter);
app.use("/api", requireAuth, requireTermsAccepted, documentsRouter);

runSeed();

const port = Number(process.env.PORT || 4000);
app.listen(port, "0.0.0.0", () => {
  console.log(`Japan Trip 2027 API listening on http://localhost:${port}`);
});
