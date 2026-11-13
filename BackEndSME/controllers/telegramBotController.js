import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import TelegramBotService from "../services/telegramBotService.js";
import { BotNotifierService } from "../services/botNotifierService.js";
import { mergeAutomationConfig, toPublicAutomationConfig } from "../utils/automationConfig.js";
import { runAutomationJob, getCronSchedulerStatus } from "../utils/cronScheduler.js";
import { logAction } from "../utils/auditLogger.js";
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

  /**
   * GET /api/v1/bot/automation-config (Admin only)
   */
  static getAutomationConfig = asyncHandler(async (req, res) => {
    const db = getDB();
    const cfg = await BotNotifierService.getAutomationConfig();
    const logs = db
      ? await db.collection("automation_logs").find({}).sort({ created_at: -1 }).limit(30).toArray()
      : [];

    return sendSuccess(
      res,
      {
        config: toPublicAutomationConfig(cfg),
        scheduler: getCronSchedulerStatus(),
        logs,
      },
      "Lấy cấu hình tự động hóa thành công"
    );
  });

  /**
   * PUT /api/v1/bot/automation-config (Admin only)
   */
  static updateAutomationConfig = asyncHandler(async (req, res) => {
    const db = getDB();
    if (!db) throw ApiError.internal("Database not connected");

    const existing = await BotNotifierService.getAutomationConfig();
    const merged = mergeAutomationConfig(existing, req.body || {});

    await db.collection("ai_settings").updateOne(
      { type: "automation_config" },
      {
        $set: {
          type: "automation_config",
          channels: merged.channels,
          jobs: merged.jobs,
          updated_at: new Date(),
          updated_by: req.user?.tai_khoan || "admin",
        },
      },
      { upsert: true }
    );

    // Đồng bộ ngược lại legacy telegram_bot để tương thích các luồng cũ
    if (merged.channels.telegram.bot_token || merged.channels.telegram.chat_id) {
      await db.collection("ai_settings").updateOne(
        { type: "telegram_bot" },
        {
          $set: {
            type: "telegram_bot",
            bot_token: merged.channels.telegram.bot_token,
            chat_id: merged.channels.telegram.chat_id,
            updated_at: new Date(),
          },
        },
        { upsert: true }
      );
    }

    logAction({
      action: "CONFIG_UPDATE",
      module: "automation_bot",
      targetId: "automation_config",
      description: "Cập nhật cấu hình Tự động hóa & Bot cảnh báo (Telegram / Zalo)",
      performedBy: req.user,
      ip: req.ip,
      before: toPublicAutomationConfig(existing),
      after: toPublicAutomationConfig(merged),
      severity: "warning",
    });

    return sendSuccess(
      res,
      { config: toPublicAutomationConfig(merged) },
      "Đã lưu cấu hình Tự động hóa & Kênh thông báo"
    );
  });

  /**
   * POST /api/v1/bot/test-channel (Admin only)
   * Body: { channel: "telegram" | "zalo", message?: string }
   */
  static testChannel = asyncHandler(async (req, res) => {
    const { channel = "telegram", message } = req.body || {};
    const text =
      message ||
      `🔔 <b>SME ERP Test</b>: Kết nối kênh <b>${String(channel).toUpperCase()}</b> hoạt động bình thường!`;

    let result;
    if (channel === "zalo") {
      result = await BotNotifierService.sendZaloAlert({
        title: "SME ERP - Kiểm tra kết nối Zalo",
        text,
      });
    } else {
      result = await BotNotifierService.sendTelegramAlert(text);
    }

    if (!result.success) {
      throw ApiError.badRequest(result.error || `Gửi tin nhắn test qua ${channel} thất bại`);
    }
    return sendSuccess(res, result, `Đã gửi tin nhắn kiểm tra qua ${channel.toUpperCase()} thành công`);
  });

  /**
   * POST /api/v1/bot/run-job (Admin only)
   * Body: { jobKey: "morning_briefing" | "low_stock_fefo_alert" | "overdue_debt_contract_alert" | "production_bottleneck_alert" }
   */
  static runJob = asyncHandler(async (req, res) => {
    const { jobKey } = req.body || {};
    if (!jobKey) throw ApiError.badRequest("Thiếu jobKey cần chạy");
    const result = await runAutomationJob(jobKey, "manual");
    if (!result.ok) {
      throw ApiError.badRequest(result.error || "Chạy tác vụ thất bại");
    }
    return sendSuccess(res, result, `Đã thực thi tác vụ ${jobKey} thành công`);
  });
}

export default TelegramBotController;
