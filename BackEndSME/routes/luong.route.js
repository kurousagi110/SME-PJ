import express from "express";
import LuongController from "../controllers/luongControllers.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/* ===================== LƯƠNG & CHẤM CÔNG ===================== */

/* ✅ CHẤM CÔNG BULK (nhận list) */
router.post("/cham-cong/bulk", verifyToken, LuongController.chamCongBulk);

/* ✅ CHẤM CÔNG (tạo / cập nhật 1 ngày 1 nhân viên) */
router.post("/cham-cong", verifyToken, LuongController.chamCong);

/* (Giữ lại nếu bạn vẫn dùng đâu đó) */
router.get("/cham-cong/by-day", verifyToken, LuongController.getChamCongByDay);

/**
 * ✅ LIST CHẤM CÔNG
 * - ngay_thang=YYYY-MM-DD  => list tất cả NV của ngày đó (đúng FE)
 * - ma_nv + ngay_thang      => 1 bản ghi
 * - ma_nv + from/to         => list lịch sử theo khoảng
 */
router.get("/cham-cong", verifyToken, LuongController.listChamCong);

/* SOFT DELETE 1 BẢN GHI CHẤM CÔNG */
router.delete("/cham-cong/:id", verifyToken, LuongController.softDeleteChamCong);

/* TÍNH LƯƠNG THÁNG */
router.post("/tinh-luong", verifyToken, LuongController.tinhLuongThang);

export default router;
