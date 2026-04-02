import express from "express";
import UsersController from "../controllers/usersControllers.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/* ===================== AUTH (Public) ===================== */
router.post("/register", UsersController.register);
router.post("/login", UsersController.login);
router.post("/refresh", UsersController.refreshToken);
router.post("/logout", verifyToken, UsersController.logout);
router.post("/logout-all", verifyToken, UsersController.logoutAll);

// GET /users/danh-sach-nhan-vien?q=...&phong_ban_id=...
router.get("/danh-sach-nhan-vien", verifyToken, UsersController.getDanhSachNhanVien);

/* ===================== USER INFO (Protected) ===================== */
router.get("/", verifyToken, UsersController.getUsers);
router.get("/:id", verifyToken, UsersController.getUserById);

router.get("/me/:id", verifyToken, UsersController.getMyUser);




/* ===================== PROFILE / PASSWORD (Protected) ===================== */
router.patch("/:id/profile", verifyToken, UsersController.updateProfile);
router.patch("/:id/password", verifyToken, UsersController.updatePassword);

/* ===================== CHỨC VỤ (Protected - admin quyền cao) ===================== */
router.put("/:id/chuc-vu", verifyToken, UsersController.setChucVu);
router.patch("/:id/chuc-vu", verifyToken, UsersController.updateChucVu);
router.delete("/:id/chuc-vu", verifyToken, UsersController.clearChucVu);

/* ===================== PHÒNG BAN (Protected) ===================== */
router.put("/:id/phong-ban", verifyToken, UsersController.setPhongBan);
router.patch("/:id/phong-ban", verifyToken, UsersController.updatePhongBan);
router.delete("/:id/phong-ban", verifyToken, UsersController.clearPhongBan);

/* ===================== TRẠNG THÁI USER (Protected - admin) ===================== */
router.delete("/:id", verifyToken, UsersController.softDelete);
router.post("/:id/restore", verifyToken, UsersController.restore);

export default router;
