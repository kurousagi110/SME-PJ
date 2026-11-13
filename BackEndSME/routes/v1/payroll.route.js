// Refactored: 2026-04-02 | Issues fixed: R1, R2, R5 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/luong

import express from "express";
import LuongController from "../../controllers/luongControllers.js";
import {
  verifyToken,
  verifyAdmin,
  verifyAttendanceManager,
  verifyHRManager,
  verifyFinanceManager,
  verifySelfOrAdminByMaNV,
} from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

/* ─── CHẤM CÔNG BULK (Quản lý phòng ban / Nhân sự / Admin) ─── */
router.post("/cham-cong/bulk", verifyToken, verifyAttendanceManager, requireBody("ngay_thang", "items"), LuongController.chamCongBulk);

/* ─── CHẤM CÔNG 1 (Quản lý phòng ban / Nhân sự / Admin) ─── */
router.post("/cham-cong", verifyToken, verifyAttendanceManager, requireBody("ma_nv", "ngay_thang"), LuongController.chamCong);

/* ─── GET / LIST ───
 * SECURITY: payroll + attendance are PII. A non-privileged user may only
 * read their own record. verifySelfOrAdminByMaNV enforces this by
 * comparing req.user.ma_nv against ma_nv in body/query — admins/HR/managers
 * bypass the self check.
 */
router.get("/cham-cong/by-day", verifyToken, verifySelfOrAdminByMaNV, LuongController.getChamCongByDay);
router.get("/cham-cong",        verifyToken, verifySelfOrAdminByMaNV, LuongController.listChamCong);

/* ─── DELETE (chỉ admin) ─── */
router.delete("/cham-cong/:id", verifyToken, verifyAdmin, LuongController.softDeleteChamCong);

/* ─── TÍNH LƯƠNG & CHI TRẢ LƯƠNG (Kế toán trưởng / Nhân sự / Admin) ─── */
router.post("/tinh-luong",              verifyToken, verifyHRManager, requireBody("thang", "nam"), LuongController.tinhLuongThang);
router.post("/chi-tra-luong",          verifyToken, verifyFinanceManager, requireBody("thang", "nam"), LuongController.chiTraLuongThang);
router.get("/trang-thai-chi-luong",    verifyToken, verifyHRManager, LuongController.getTrangThaiChiLuong);

export default router;
