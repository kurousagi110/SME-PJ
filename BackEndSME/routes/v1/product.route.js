// Refactored: 2026-04-02 | Issues fixed: R1, R2, R4, R5 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/san-pham
// R4: POST /:id/restore → PATCH /:id/restore
// R5: validate middleware applied on POST/PATCH routes

import express from "express";
import SanPhamController from "../../controllers/sanPhamControllers.js";
import { verifyToken, verifyAdmin, verifyApprover } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

/* ─── CREATE ─── */
router.post("/", verifyToken, verifyAdmin, requireBody("ma_sp", "ten_sp"), SanPhamController.create);

/* ─── LIST / SEARCH / STOCK ─── */
router.get("/",              verifyToken, SanPhamController.list);
router.get("/search",        verifyToken, SanPhamController.search);
router.get("/stock",         verifyToken, SanPhamController.getAllStock);

/* ─── STATS (before /:id to avoid conflict) ─── */
router.get("/stats/summary",   verifyToken, SanPhamController.stats);
router.get("/stats/low-stock", verifyToken, SanPhamController.lowStock);

/* ─── STOCK ADJUST (Thủ kho + Admin) ─── */
router.post("/bulk/adjust-stock", verifyToken, verifyApprover, SanPhamController.bulkAdjustStock);
router.post("/:id/adjust-stock",  verifyToken, verifyApprover, SanPhamController.adjustStock);

/* ─── READ ONE ─── */
router.get("/:id", verifyToken, SanPhamController.getById);

/* ─── UPDATE (chỉ Admin) ─── */
router.patch("/:id", verifyToken, verifyAdmin, SanPhamController.update);

/* ─── STATUS (chỉ Admin) ─── */
router.patch("/:id/status", verifyToken, verifyAdmin, requireBody("status"), SanPhamController.setStatus);

/* ─── DELETE / RESTORE (chỉ Admin — irreversible / data loss) ─── */
router.delete("/:id",        verifyToken, verifyAdmin, SanPhamController.softDelete);
router.patch("/:id/restore", verifyToken, verifyAdmin, SanPhamController.restore);
router.delete("/:id/hard",   verifyToken, verifyAdmin, SanPhamController.hardDelete);

export default router;
