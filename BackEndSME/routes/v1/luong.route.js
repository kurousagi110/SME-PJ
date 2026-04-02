// Refactored: 2026-04-02 | Issues fixed: R1, R2, R5 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/luong

import express from "express";
import LuongController from "../../controllers/luongControllers.js";
import { verifyToken } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

/* ─── CHẤM CÔNG BULK ─── */
router.post("/cham-cong/bulk", verifyToken, requireBody("ngay_thang", "items"), LuongController.chamCongBulk);

/* ─── CHẤM CÔNG 1 ─── */
router.post("/cham-cong", verifyToken, requireBody("ma_nv", "ngay_thang"), LuongController.chamCong);

/* ─── GET / LIST ─── */
router.get("/cham-cong/by-day", verifyToken, LuongController.getChamCongByDay);
router.get("/cham-cong",        verifyToken, LuongController.listChamCong);

/* ─── DELETE ─── */
router.delete("/cham-cong/:id", verifyToken, LuongController.softDeleteChamCong);

/* ─── TÍNH LƯƠNG ─── */
router.post("/tinh-luong", verifyToken, requireBody("ma_nv", "thang", "nam"), LuongController.tinhLuongThang);

export default router;
