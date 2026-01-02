"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.get("/health", (_req, res) => {
    res.json({ ok: true });
});
router.get("/debug/db", async (_req, res, next) => {
    try {
        const r = await (0, db_1.query)("SELECT now() as now");
        res.json({ ok: true, now: r.rows[0].now });
    }
    catch (err) {
        next(err);
    }
});
// GET /health/db - detailed DB info (version, current database, now)
router.get("/health/db", async (_req, res, next) => {
    try {
        const versionResult = await (0, db_1.query)("SELECT version() as version");
        const dbResult = await (0, db_1.query)("SELECT current_database() as db");
        const nowResult = await (0, db_1.query)("SELECT now() as now");
        return res.json({
            success: true,
            data: {
                version: versionResult.rows[0].version,
                db: dbResult.rows[0].db,
                now: nowResult.rows[0].now,
            },
        });
    }
    catch (err) {
        console.error("[health/db] error:", err);
        return res.status(500).json({
            success: false,
            error: { message: err?.message || "DB error" },
        });
    }
});
exports.default = router;
