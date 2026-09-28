import express from "express";
import rateLimit from "express-rate-limit";
import ImportController from "../../controllers/importController.js";
import { verifyToken, verifyApprover } from "../../middleware/auth.js";

const router = express.Router();

const importLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // max 15 imports per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Quá nhiều yêu cầu nhập dữ liệu hàng loạt. Vui lòng chờ 1 phút." },
});

/* ─── BULK IMPORT ─── */
router.post("/bulk", verifyToken, verifyApprover, importLimiter, ImportController.bulkImport);

export default router;
