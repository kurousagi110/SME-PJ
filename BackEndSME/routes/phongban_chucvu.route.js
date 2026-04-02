import express from "express";
import PhongBanChucVuController from "../controllers/phongban_chucvu.Controllers.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/* ===================== PHÒNG BAN & CHỨC VỤ ===================== */

/* CREATE PHÒNG BAN */
router.post("/", verifyToken, PhongBanChucVuController.create);

/* LIST PHÒNG BAN */
router.get("/", verifyToken, PhongBanChucVuController.list);

/* ========== CHỨC VỤ TRONG PHÒNG BAN (đặt TRƯỚC /:id) ========== */

// Thêm 1 chức vụ vào phòng ban
router.post(
  "/:id/chuc-vu",
  verifyToken,
  PhongBanChucVuController.addChucVu
);

// Cập nhật 1 chức vụ
router.patch(
  "/:id/chuc-vu/:chucVuId",
  verifyToken,
  PhongBanChucVuController.updateChucVu
);

// Xoá 1 chức vụ
router.delete(
  "/:id/chuc-vu/:chucVuId",
  verifyToken,
  PhongBanChucVuController.removeChucVu
);

// Set trạng thái chức vụ
router.post(
  "/:id/chuc-vu/:chucVuId/status",
  verifyToken,
  PhongBanChucVuController.setTrangThaiChucVu
);

/* ========== PHÒNG BAN ========== */

// Lấy chi tiết 1 phòng ban
router.get("/:id", verifyToken, PhongBanChucVuController.getById);

// Get all phòng ban
router.get("/all/list", verifyToken, PhongBanChucVuController.getAllPhongBan);

// Update thông tin phòng ban
router.patch("/:id", verifyToken, PhongBanChucVuController.updatePhongBan);

// Soft delete / restore / hard delete
router.delete("/:id", verifyToken, PhongBanChucVuController.softDelete);
router.post("/:id/restore", verifyToken, PhongBanChucVuController.restore);
router.delete("/:id/hard", verifyToken, PhongBanChucVuController.hardDelete);

export default router;
