import { Router } from "express";
import { query } from "../db";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/debug/db", async (_req, res, next) => {
  try {
    const r = await query("SELECT now() as now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (err) {
    next(err);
  }
});

export default router;
