// Refactored: 2026-04-02 | Issues fixed: R1, R2, R4, R5 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/phongban-chucvu
// R4: POST /:id/restore → PATCH /:id/restore

import express from "express";
import PhongBanChucVuController from "../../controllers/phongban_chucvu.Controllers.js";
import { verifyToken } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

/* ─── PHÒNG BAN ─── */
router.post("/", verifyToken, requireBody("ten_phong_ban"), PhongBanChucVuController.create);
router.get("/",  verifyToken, PhongBanChucVuController.list);
router.get("/all/list", verifyToken, PhongBanChucVuController.getAllPhongBan);

/* ─── CHỨC VỤ (before /:id to avoid conflict) ─── */
router.post("/:id/chuc-vu", verifyToken, requireBody("ten_chuc_vu"), PhongBanChucVuController.addChucVu);
router.patch("/:id/chuc-vu/:chucVuId",        verifyToken, PhongBanChucVuController.updateChucVu);
router.delete("/:id/chuc-vu/:chucVuId",       verifyToken, PhongBanChucVuController.removeChucVu);
router.patch("/:id/chuc-vu/:chucVuId/status", verifyToken, requireBody("trang_thai"), PhongBanChucVuController.setTrangThaiChucVu);

/* ─── PHÒNG BAN CRUD ─── */
router.get("/:id",    verifyToken, PhongBanChucVuController.getById);
router.patch("/:id",  verifyToken, PhongBanChucVuController.updatePhongBan);
router.delete("/:id", verifyToken, PhongBanChucVuController.softDelete);

router.patch("/:id/restore", verifyToken, PhongBanChucVuController.restore); // R4: was POST
router.delete("/:id/hard",   verifyToken, PhongBanChucVuController.hardDelete);

export default router;
