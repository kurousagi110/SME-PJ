// Refactored: 2026-04-02 | Issues fixed: R1, R2, R4 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/users via server.js
// R4: POST /:id/restore → PATCH /:id/restore

import express from "express";
import UsersController from "../../controllers/usersControllers.js";
import { verifyToken, verifyAdmin, verifySelfOrAdmin } from "../../middleware/auth.js";
import { requireBody } from "../../middleware/validate.js";

const router = express.Router();

/* ─── AUTH (Public) ─── */
router.post("/register",    requireBody("ho_ten", "tai_khoan", "password"), UsersController.register);
router.post("/login",       requireBody("tai_khoan", "password"),           UsersController.login);
router.post("/refresh",     requireBody("userId", "refreshToken"),          UsersController.refreshToken);
router.post("/logout",      verifyToken, requireBody("userId", "refreshToken"), UsersController.logout);
router.post("/logout-all",  verifyToken, requireBody("userId"),              UsersController.logoutAll);

/* ─── EMPLOYEE LIST ─── */
router.get("/danh-sach-nhan-vien", verifyToken, UsersController.getDanhSachNhanVien);

/* ─── USER INFO (Protected) ─── */
router.get("/",        verifyToken, UsersController.getUsers);
router.get("/me/:id",  verifyToken, UsersController.getMyUser);
router.get("/:id",     verifyToken, UsersController.getUserById);

/* ─── PROFILE / PASSWORD — chỉ chính chủ hoặc admin ─── */
router.patch("/:id/profile",  verifyToken, verifySelfOrAdmin, UsersController.updateProfile);
router.patch("/:id/password", verifyToken, verifySelfOrAdmin, requireBody("oldPassword", "newPassword"), UsersController.updatePassword);

/* ─── CHỨC VỤ — chỉ admin ─── */
router.put("/:id/chuc-vu",    verifyToken, verifyAdmin, UsersController.setChucVu);
router.patch("/:id/chuc-vu",  verifyToken, verifyAdmin, UsersController.updateChucVu);
router.delete("/:id/chuc-vu", verifyToken, verifyAdmin, UsersController.clearChucVu);

/* ─── PHÒNG BAN — chỉ admin ─── */
router.put("/:id/phong-ban",    verifyToken, verifyAdmin, UsersController.setPhongBan);
router.patch("/:id/phong-ban",  verifyToken, verifyAdmin, UsersController.updatePhongBan);
router.delete("/:id/phong-ban", verifyToken, verifyAdmin, UsersController.clearPhongBan);

/* ─── TRẠNG THÁI — chỉ admin ─── */
router.delete("/:id",         verifyToken, verifyAdmin, UsersController.softDelete);
router.patch("/:id/restore",  verifyToken, verifyAdmin, UsersController.restore);

export default router;
