// Refactored: 2026-04-02 | Issues fixed: R1, R2, R5 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/luong

import express from "express";
import LuongController from "../../controllers/luongControllers.js";
import { verifyToken, verifyAdmin, verifyApprover, verifySelfOrAdminByMaNV } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

/* ─── CHẤM CÔNG BULK (Thủ kho + Admin — ghi chấm công hộ nhân viên) ─── */
router.post("/cham-cong/bulk", verifyToken, verifyApprover, requireBody("ngay_thang", "items"), LuongController.chamCongBulk);

/* ─── CHẤM CÔNG 1 (Thủ kho + Admin — approver ghi hộ) ─── */
router.post("/cham-cong", verifyToken, verifyApprover, requireBody("ma_nv", "ngay_thang"), LuongController.chamCong);

/* ─── GET / LIST ───
 * SECURITY: payroll + attendance are PII. A non-privileged user may only
 * read their own record. verifySelfOrAdminByMaNV enforces this by
 * comparing req.user.ma_nv against ma_nv in body/query — admins/approvers
 * (Thủ kho + Giám đốc) bypass the self check.
 */
router.get("/cham-cong/by-day", verifyToken, verifySelfOrAdminByMaNV, LuongController.getChamCongByDay);
router.get("/cham-cong",        verifyToken, verifySelfOrAdminByMaNV, LuongController.listChamCong);

/* ─── DELETE (chỉ admin) ─── */
router.delete("/cham-cong/:id", verifyToken, verifyAdmin, LuongController.softDeleteChamCong);

/* ─── TÍNH LƯƠNG (chỉ Admin — payroll integrity) ─── */
router.post("/tinh-luong", verifyToken, verifyAdmin, requireBody("ma_nv", "thang", "nam"), LuongController.tinhLuongThang);

export default router;
