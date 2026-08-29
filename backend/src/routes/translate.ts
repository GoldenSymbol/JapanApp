import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";

export const translateRouter = Router();

translateRouter.get("/dictionary", requireAuth, (_req, res) => {
  const rows = db.prepare("SELECT he, en, ja, romaji, kind FROM translations ORDER BY kind DESC, rowid ASC").all();
  res.json({ entries: rows });
});
