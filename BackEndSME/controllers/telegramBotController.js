import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import TelegramBotService from "../services/telegramBotService.js";
import { getDB } from "../config/database.js";

export class TelegramBotController {
  /**
   * Xem cấu hình Bot hiện tại
   * GET /api/v1/bot/telegram/status
   */
  static getStatus = asyncHandler(async (req, res) => {
    const config = await TelegramBotService.getConfig();
    return sendSuccess(res, {
      isConfigured: config.isConfigured,
      chatId: config.defaultChatId ? `${config.defaultChatId.slice(0, 4)}***` : "",
      hasToken: Boolean(config.token),
    }, "Lấy trạng thái cấu hình Telegram Bot thành công");
  });

  /**
   * Cập nhật cấu hình Bot Token & Chat ID
   * POST /api/v1/bot/telegram/config
   */
  static updateConfig = asyncHandler(async (req, res) => {
    const { bot_token, chat_id } = req.body || {};
    const db = getDB();
    if (!db) throw ApiError.internal("Database not connected");

    await db.collection("ai_settings").updateOne(
      { type: "telegram_bot" },
      {
        $set: {
          type: "telegram_bot",
          bot_token: String(bot_token || "").trim(),
          chat_id: String(chat_id || "").trim(),
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );

    return sendSuccess(res, { ok: true }, "Đã lưu cấu hình Telegram Bot");
  });

  /**
   * Gửi tin nhắn kiểm tra kết nối (Test message)
   * POST /api/v1/bot/telegram/test
   */
  static sendTestMessage = asyncHandler(async (req, res) => {
    const { chatId, message } = req.body || {};
    const text = message || "🔔 <b>SME ERP Test</b>: Kết nối Telegram Bot thành công!";
    const result = await TelegramBotService.sendMessage({ chatId, text });
    if (!result.ok) {
      throw ApiError.badRequest(result.error || result.message || "Gửi tin nhắn test thất bại");
    }
    return sendSuccess(res, result, "Đã gửi tin nhắn kiểm tra tới Telegram");
  });

  /**
   * Khởi chạy Báo cáo Buổi sáng
   * POST /api/v1/bot/telegram/morning-briefing
   */
  static triggerMorningBriefing = asyncHandler(async (req, res) => {
    const result = await TelegramBotService.sendMorningBriefing();
    if (!result.ok) {
      throw ApiError.badRequest(result.error || result.message || "Không thể gửi báo cáo sáng");
    }
    return sendSuccess(res, result, "Đã gửi Báo cáo Tóm tắt Buổi sáng tới Telegram");
  });

  /**
   * Webhook nhận tương tác từ Telegram (Duyệt chứng từ 1-Click)
   * POST /api/v1/bot/telegram/webhook (Public webhook)
   */
  static handleWebhook = asyncHandler(async (req, res) => {
    const body = req.body || {};
    if (body.callback_query) {
      await TelegramBotService.handleCallbackQuery(body.callback_query);
    }
    return res.status(200).json({ ok: true });
  });
}

export default TelegramBotController;
