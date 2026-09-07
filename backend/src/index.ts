import "dotenv/config";
import express from "express";
import cors from "cors";
import "./db.js";
import { authRouter } from "./routes/auth.js";
import { tripsRouter } from "./routes/trips.js";
import { itineraryRouter } from "./routes/itinerary.js";
import { budgetRouter } from "./routes/budget.js";
import { translateRouter } from "./routes/translate.js";
import { runSeed } from "./seed.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/trips", tripsRouter);
app.use("/api", itineraryRouter);
app.use("/api/budget", budgetRouter);
app.use("/api/translate", translateRouter);

runSeed();

const port = Number(process.env.PORT || 4000);
app.listen(port, "0.0.0.0", () => {
  console.log(`Japan Trip 2027 API listening on http://localhost:${port}`);
});
