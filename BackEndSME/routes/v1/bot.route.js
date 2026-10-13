import express from "express";
import TelegramBotController from "../../controllers/telegramBotController.js";
import { verifyToken, verifyAdmin } from "../../middleware/auth.js";

const router = express.Router();

/* Webhook public nhận callback từ Telegram */
router.post("/telegram/webhook", TelegramBotController.handleWebhook);

/* Quản trị & Test (Cần đăng nhập) */
router.get("/telegram/status",             verifyToken, TelegramBotController.getStatus);
router.post("/telegram/config",            verifyToken, verifyAdmin, TelegramBotController.updateConfig);
router.post("/telegram/test",              verifyToken, TelegramBotController.sendTestMessage);
router.post("/telegram/morning-briefing",   verifyToken, TelegramBotController.triggerMorningBriefing);

export default router;
