import express from "express";
import PaymentController from "../../controllers/paymentController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

// Sinh mã VietQR (đăng nhập hoặc gọi nội bộ từ POS)
router.get("/vietqr", verifyToken, PaymentController.generateQR);

// Webhook công khai nhận biến động số dư từ cổng thanh toán / ngân hàng
router.post("/webhook", PaymentController.handleWebhook);

export default router;
