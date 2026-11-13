/**
 * Multi-Channel Bot Notification Service (Telegram & Zalo OA / ZNS / Webhook)
 * Đẩy thông báo tức thì và cảnh báo tự động theo cấu hình của Admin.
 */

import logger from "../utils/logger.js";
import { getDB } from "../config/database.js";
import { DEFAULT_AUTOMATION_CONFIG, resolveTargetChannels } from "../utils/automationConfig.js";

function stripHtmlForPlainText(html = "") {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(b|strong|i|em|code|pre)>/gi, "")
    .trim();
}

export class BotNotifierService {
  /**
   * Lấy cấu hình tự động hóa & kênh gửi từ MongoDB (fallback .env nếu chưa cấu hình).
   */
  static async getAutomationConfig() {
    try {
      const db = getDB();
      const doc = db
        ? await db.collection("ai_settings").findOne({ type: "automation_config" })
        : null;
      const legacyTg = db
        ? await db.collection("ai_settings").findOne({ type: "telegram_bot" })
        : null;

      const cfg = structuredClone(DEFAULT_AUTOMATION_CONFIG);
      if (doc?.channels?.telegram) {
        cfg.channels.telegram = { ...cfg.channels.telegram, ...doc.channels.telegram };
      } else if (legacyTg?.bot_token && legacyTg?.chat_id) {
        cfg.channels.telegram = {
          enabled: true,
          bot_token: legacyTg.bot_token,
          chat_id: legacyTg.chat_id,
        };
      } else if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        cfg.channels.telegram = {
          enabled: true,
          bot_token: process.env.TELEGRAM_BOT_TOKEN,
          chat_id: process.env.TELEGRAM_CHAT_ID,
        };
      }

      if (doc?.channels?.zalo) {
        cfg.channels.zalo = { ...cfg.channels.zalo, ...doc.channels.zalo };
      }
      if (doc?.jobs) {
        for (const k of Object.keys(cfg.jobs)) {
          if (doc.jobs[k]) cfg.jobs[k] = { ...cfg.jobs[k], ...doc.jobs[k] };
        }
      }
      return cfg;
    } catch (err) {
      logger.warn("[BotNotifier] getAutomationConfig fallback", { error: err.message });
      return structuredClone(DEFAULT_AUTOMATION_CONFIG);
    }
  }

  /**
   * Gửi tin nhắn qua Telegram Bot API.
   */
  static async sendTelegramAlert(text, overrideCreds = {}) {
    const cfg = overrideCreds.bot_token && overrideCreds.chat_id
      ? overrideCreds
      : (await this.getAutomationConfig()).channels.telegram;

    const botToken = cfg.bot_token || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = cfg.chat_id || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return { success: false, skipped: true, error: "Chưa cấu hình Telegram Bot Token hoặc Chat ID" };
    }

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      });
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        return { success: false, error: data?.description || `HTTP ${response.status}` };
      }
      return { success: true, data };
    } catch (err) {
      logger.error("[Telegram Notifier] Error sending message", { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Gửi tin nhắn qua Zalo (Zalo OA API, Zalo ZNS, hoặc Webhook).
   */
  static async sendZaloAlert({ title = "Thông báo SME ERP", text }, overrideCreds = {}) {
    const cfg = overrideCreds.mode
      ? overrideCreds
      : (await this.getAutomationConfig()).channels.zalo;

    const plainText = stripHtmlForPlainText(text);
    const mode = cfg.mode || "oa_api";

    try {
      if (mode === "webhook") {
        if (!cfg.webhook_url) {
          return { success: false, skipped: true, error: "Chưa cấu hình Zalo Webhook URL" };
        }
        const resp = await fetch(cfg.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: "zalo",
            title,
            message: plainText,
            recipient_id: cfg.recipient_id || null,
            timestamp: new Date().toISOString(),
            source: "SME_ERP",
          }),
        });
        if (!resp.ok) {
          return { success: false, error: `Webhook HTTP ${resp.status}` };
        }
        return { success: true, mode: "webhook" };
      }

      if (!cfg.oa_access_token || !cfg.recipient_id) {
        return { success: false, skipped: true, error: "Chưa cấu hình Zalo OA Access Token hoặc Recipient ID" };
      }

      if (mode === "zns") {
        if (!cfg.template_id) {
          return { success: false, skipped: true, error: "Chưa cấu hình Zalo ZNS Template ID" };
        }
        const resp = await fetch("https://business.openapi.zalo.me/message/template", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            access_token: cfg.oa_access_token,
          },
          body: JSON.stringify({
            phone: cfg.recipient_id,
            template_id: cfg.template_id,
            template_data: {
              title: title.slice(0, 80),
              content: plainText.slice(0, 200),
            },
          }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || (data.error && data.error !== 0)) {
          return { success: false, error: data.message || `Zalo ZNS error ${data.error || resp.status}` };
        }
        return { success: true, mode: "zns", data };
      }

      // Default: Zalo OA Customer Service API v3
      const resp = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: cfg.oa_access_token,
        },
        body: JSON.stringify({
          recipient: { user_id: cfg.recipient_id },
          message: { text: `${title}\n\n${plainText}`.slice(0, 2000) },
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || (data.error && data.error !== 0)) {
        return { success: false, error: data.message || `Zalo OA error ${data.error || resp.status}` };
      }
      return { success: true, mode: "oa_api", data };
    } catch (err) {
      logger.error("[Zalo Notifier] Error sending message", { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Điều phối gửi thông báo đa kênh (Telegram / Zalo / Both) theo cấu hình Admin.
   */
  static async dispatchMultiChannelAlert({ title, message, jobChannel = "both", config = null }) {
    const cfg = config || (await this.getAutomationConfig());
    const targets = resolveTargetChannels(jobChannel, cfg.channels);
    const results = {};

    if (targets.includes("telegram")) {
      results.telegram = await this.sendTelegramAlert(message, cfg.channels.telegram);
    }
    if (targets.includes("zalo")) {
      results.zalo = await this.sendZaloAlert({ title, text: message }, cfg.channels.zalo);
    }

    return { targets, results };
  }

  /**
   * Cảnh báo tồn kho nguy cấp
   */
  static async notifyLowStockAlert({ itemName, currentStock, minStock, unit = "cái" }) {
    const text = `⚠️ <b>[CẢNH BÁO TỒN KHO AN TOÀN]</b>\n` +
      `📦 Mặt hàng: <b>${itemName}</b>\n` +
      `🔻 Tồn hiện tại: <b>${currentStock} ${unit}</b> (Dưới ngưỡng an toàn: ${minStock} ${unit})\n` +
      `⚡ Vui lòng kiểm tra và tạo đơn nhập mua/sản xuất bổ sung kịp thời!`;

    return this.dispatchMultiChannelAlert({
      title: "Cảnh báo tồn kho an toàn",
      message: text,
      jobChannel: "both",
    });
  }

  /**
   * Cảnh báo đơn hàng bán giá trị cao cần giám đốc chú ý
   */
  static async notifyBigSaleOrder({ orderCode, customerName, totalAmount }) {
    const text = `🎉 <b>[ĐƠN HÀNG MỚI GIÁ TRỊ LỚN]</b>\n` +
      `🧾 Mã đơn: <b>${orderCode}</b>\n` +
      `👤 Khách hàng: <b>${customerName}</b>\n` +
      `💰 Giá trị: <b>${Number(totalAmount).toLocaleString("vi-VN")} đ</b>\n` +
      `👉 Hệ thống đã ghi nhận và tự động cập nhật doanh số!`;

    return this.dispatchMultiChannelAlert({
      title: "Đơn hàng mới giá trị lớn",
      message: text,
      jobChannel: "both",
    });
  }
}
