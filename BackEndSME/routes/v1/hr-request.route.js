import express from "express";
import HrRequestController from "../../controllers/hrRequestController.js";
import { verifyToken, verifyAttendanceManager } from "../../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", HrRequestController.list);
router.get("/leave-balance", HrRequestController.getLeaveBalance);
router.post("/", HrRequestController.create);
router.post("/:id/decide", HrRequestController.decide);

// Smart Attendance: chỉ Quản lý chấm công / Nhân sự / Admin mới được sinh mã QR động tại quầy
router.get("/attendance/qr-token", verifyAttendanceManager, HrRequestController.generateQrToken);
router.post("/attendance/smart-check-in", HrRequestController.smartCheckIn);

export default router;
