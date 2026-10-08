/**
 * Instant Bot Notification Service (Telegram & Zalo ZNS Webhook)
 * Đẩy thông báo tức thì khi có biến động kho, đơn hàng lớn, hoặc duyệt chi lương/quỹ
 */

import logger from "../utils/logger.js";

export class BotNotifierService {
  /**
   * Gửi tin nhắn cảnh báo tới Telegram Group Quản lý
   */
  static async sendTelegramAlert(text) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      logger.info("[Telegram Notifier] Simulated alert:", { message: text });
      return { simulated: true, message: text };
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
      return { success: true, data };
    } catch (err) {
      logger.error("[Telegram Notifier] Error sending message", { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Cảnh báo tồn kho nguy cấp
   */
  static async notifyLowStockAlert({ itemName, currentStock, minStock, unit = "cái" }) {
    const text = `⚠️ <b>[CẢNH BÁO TỒN KHO AN TOÀN]</b>\n` +
      `📦 Mặt hàng: <b>${itemName}</b>\n` +
      `🔻 Tồn hiện tại: <b>${currentStock} ${unit}</b> (Dưới ngưỡng an toàn: ${minStock} ${unit})\n` +
      `⚡ Vui lòng kiểm tra và tạo đơn nhập mua/sản xuất bổ sung kịp thời!`;

    return this.sendTelegramAlert(text);
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

    return this.sendTelegramAlert(text);
  }
}
