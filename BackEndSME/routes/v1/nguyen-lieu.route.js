// Refactored: 2026-04-02 | Issues fixed: R1, R2, R4, R5 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/nguyen-lieu
// R4: POST /:id/restore → PATCH /:id/restore

import express from "express";
import NguyenLieuController from "../../controllers/nguyenLieuControllers.js";
import { verifyToken } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

/* ─── CREATE ─── */
router.post("/", verifyToken, requireBody("ma_nl", "ten_nl", "don_vi"), NguyenLieuController.create);

/* ─── LIST / SEARCH / STOCK ─── */
router.get("/",       verifyToken, NguyenLieuController.list);
router.get("/search", verifyToken, NguyenLieuController.search);
router.get("/stock",  verifyToken, NguyenLieuController.getAllStock);

/* ─── STATS ─── */
router.get("/stats/summary",   verifyToken, NguyenLieuController.stats);
router.get("/stats/low-stock", verifyToken, NguyenLieuController.lowStock);

/* ─── STOCK ADJUST ─── */
router.post("/:id/adjust-stock", verifyToken, requireBody("deltaQty"), NguyenLieuController.adjustStock);

/* ─── READ ONE ─── */
router.get("/:id",  verifyToken, NguyenLieuController.getById);

/* ─── UPDATE ─── */
router.patch("/:id", verifyToken, NguyenLieuController.update);

/* ─── DELETE / RESTORE ─── */
router.delete("/:id",        verifyToken, NguyenLieuController.softDelete);
router.patch("/:id/restore", verifyToken, NguyenLieuController.restore); // R4: was POST

export default router;
