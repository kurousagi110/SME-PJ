import express from "express";
import SettingsController from "../../controllers/settingsController.js";
import { verifyToken, verifyAdmin } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

// Mọi user đã đăng nhập có thể đọc cấu hình công ty (để in hóa đơn, VietQR, POS, chấm công)
router.get("/", SettingsController.getSettings);
// Chỉ Admin / Ban Giám Đốc mới được thay đổi cấu hình hệ thống
router.put("/", verifyAdmin, SettingsController.updateSettings);

export default router;
