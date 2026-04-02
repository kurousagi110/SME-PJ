// Refactored: 2026-04-02 | Issues fixed: R1, R2, R4 | Phase 2 – Routes v1
// R1: Mounted under /api/v1/users via server.js
// R4: POST /:id/restore → PATCH /:id/restore

import express from "express";
import UsersController from "../../controllers/usersControllers.js";
import { verifyToken } from "../../middleware/auth.js";
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

/* ─── PROFILE / PASSWORD ─── */
router.patch("/:id/profile",  verifyToken, UsersController.updateProfile);
router.patch("/:id/password", verifyToken, requireBody("oldPassword", "newPassword"), UsersController.updatePassword);

/* ─── CHỨC VỤ ─── */
router.put("/:id/chuc-vu",    verifyToken, UsersController.setChucVu);
router.patch("/:id/chuc-vu",  verifyToken, UsersController.updateChucVu);
router.delete("/:id/chuc-vu", verifyToken, UsersController.clearChucVu);

/* ─── PHÒNG BAN ─── */
router.put("/:id/phong-ban",    verifyToken, UsersController.setPhongBan);
router.patch("/:id/phong-ban",  verifyToken, UsersController.updatePhongBan);
router.delete("/:id/phong-ban", verifyToken, UsersController.clearPhongBan);

/* ─── TRẠNG THÁI ─── */
router.delete("/:id",         verifyToken, UsersController.softDelete);
router.patch("/:id/restore",  verifyToken, UsersController.restore); // R4: was POST

export default router;
