// Refactored: 2026-04-02 | Issues fixed: R1, R2, R5 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/luong

import express from "express";
import LuongController from "../../controllers/luongControllers.js";
import { verifyToken, verifyAdmin, verifyApprover } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

/* ─── CHẤM CÔNG BULK (Thủ kho + Admin — ghi chấm công hộ nhân viên) ─── */
router.post("/cham-cong/bulk", verifyToken, verifyApprover, requireBody("ngay_thang", "items"), LuongController.chamCongBulk);

/* ─── CHẤM CÔNG 1 ─── */
router.post("/cham-cong", verifyToken, verifyApprover, requireBody("ma_nv", "ngay_thang"), LuongController.chamCong);

/* ─── GET / LIST (self read nên giữ verifyToken; controller scope-by-user nếu cần) ─── */
router.get("/cham-cong/by-day", verifyToken, LuongController.getChamCongByDay);
router.get("/cham-cong",        verifyToken, LuongController.listChamCong);

/* ─── DELETE (chỉ admin) ─── */
router.delete("/cham-cong/:id", verifyToken, verifyAdmin, LuongController.softDeleteChamCong);

/* ─── TÍNH LƯƠNG (chỉ Admin — payroll integrity) ─── */
router.post("/tinh-luong", verifyToken, verifyAdmin, requireBody("ma_nv", "thang", "nam"), LuongController.tinhLuongThang);

export default router;
