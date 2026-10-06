import "dotenv/config";
import express from "express";
import cors from "cors";
import "./db.js";
import { requireAuth, requireTermsAccepted, type AuthedRequest } from "./auth.js";
import { adminDb } from "./firebaseAdmin.js";
import { FieldValue } from "firebase-admin/firestore";
import { getMyTrip } from "./context.js";
import { requestTrip } from "./requestContext.js";
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

// Every successful write bumps the trip's `rev` counter, which is what lets each member's app notice
// the other's changes by polling one cheap number (GET /api/sync/rev) instead of reloading everything.
// The bump happens before the response goes out rather than after it: Cloud Run throttles a
// container's CPU once a response is sent, so work started afterwards can stall until the next
// request. Notification read-marks are skipped: they're private to one user, nobody else needs a
// reload for them.
async function bumpTripRev(userId: string, tripId: string | undefined) {
  const id = tripId ?? (await getMyTrip(userId))?.id;
  if (id) await adminDb.collection("trips").doc(id).update({ rev: FieldValue.increment(1) });
}
app.use("/api", (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  requestTrip.run({}, () => {
    const store = requestTrip.getStore()!;
    const send = res.send.bind(res);
    let bumped = false;
    res.send = ((body?: any) => {
      const userId = (req as AuthedRequest).userId;
      if (bumped || res.statusCode >= 400 || !userId || req.path.startsWith("/notifications")) return send(body);
      bumped = true;
      bumpTripRev(userId, store.tripId).catch((err) => console.error("rev bump failed", err)).finally(() => send(body));
      return res;
    }) as typeof res.send;
    next();
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/sync/rev", requireAuth, requireTermsAccepted, async (req: AuthedRequest, res) => {
  const trip = await getMyTrip(req.userId!);
  if (!trip) return res.status(404).json({ error: "no_trip" });
  res.json({ rev: trip.rev });
});
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
