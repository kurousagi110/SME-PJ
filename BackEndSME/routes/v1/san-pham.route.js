// Refactored: 2026-04-02 | Issues fixed: R1, R2, R4, R5 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/san-pham
// R4: POST /:id/restore → PATCH /:id/restore
// R5: validate middleware applied on POST/PATCH routes

import express from "express";
import SanPhamController from "../../controllers/sanPhamControllers.js";
import { verifyToken } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

/* ─── CREATE ─── */
router.post("/", verifyToken, requireBody("ma_sp", "ten_sp"), SanPhamController.create);

/* ─── LIST / SEARCH / STOCK ─── */
router.get("/",              verifyToken, SanPhamController.list);
router.get("/search",        verifyToken, SanPhamController.search);
router.get("/stock",         verifyToken, SanPhamController.getAllStock);

/* ─── STATS (before /:id to avoid conflict) ─── */
router.get("/stats/summary",   verifyToken, SanPhamController.stats);
router.get("/stats/low-stock", verifyToken, SanPhamController.lowStock);

/* ─── STOCK ADJUST ─── */
router.post("/bulk/adjust-stock", verifyToken, SanPhamController.bulkAdjustStock);
router.post("/:id/adjust-stock",  verifyToken, SanPhamController.adjustStock);

/* ─── READ ONE ─── */
router.get("/:id", verifyToken, SanPhamController.getById);

/* ─── UPDATE ─── */
router.patch("/:id", verifyToken, SanPhamController.update);

/* ─── STATUS ─── */
router.patch("/:id/status", verifyToken, requireBody("status"), SanPhamController.setStatus); // R4: was POST

/* ─── DELETE / RESTORE ─── */
router.delete("/:id",        verifyToken, SanPhamController.softDelete);
router.patch("/:id/restore", verifyToken, SanPhamController.restore); // R4: was POST
router.delete("/:id/hard",   verifyToken, SanPhamController.hardDelete);

export default router;
