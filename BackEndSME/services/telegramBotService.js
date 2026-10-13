/**
 * Telegram Bot Notification & 1-Click Approval Service for SME ERP
 * Tự động hóa gửi tin nhắn cảnh báo, tóm tắt ngân quỹ buổi sáng,
 * và hỗ trợ Ban Giám Đốc phê duyệt phiếu chi / chứng từ 1-Click ngay trên Telegram.
 */

import logger from "../utils/logger.js";
import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";

export class TelegramBotService {
  /**
   * Lấy cấu hình Bot Token & Default Chat ID từ DB hoặc Environment
   */
  static async getConfig() {
    let token = process.env.TELEGRAM_BOT_TOKEN || "";
    let defaultChatId = process.env.TELEGRAM_CHAT_ID || "";

    try {
      const db = getDB();
      if (db) {
        const conf = await db.collection("ai_settings").findOne({ type: "telegram_bot" });
        if (conf) {
          if (conf.bot_token) token = conf.bot_token;
          if (conf.chat_id) defaultChatId = conf.chat_id;
        }
      }
    } catch {}

    return {
      token,
      defaultChatId,
      isConfigured: Boolean(token && defaultChatId),
    };
  }

  /**
   * Gửi tin nhắn Telegram chung
   */
  static async sendMessage({ chatId, text, parseMode = "HTML", replyMarkup = null }) {
    try {
      const { token, defaultChatId } = await this.getConfig();
      const targetChat = chatId || defaultChatId;

      if (!token || !targetChat) {
        logger.info("[TelegramBot] Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc CHAT_ID, bỏ qua gửi tin.");
        return { ok: false, message: "Chưa cấu hình Telegram Bot Token hoặc Chat ID" };
      }

      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const bodyPayload = {
        chat_id: targetChat,
        text,
        parse_mode: parseMode,
      };

      if (replyMarkup) {
        bodyPayload.reply_markup = replyMarkup;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();
      if (!data.ok) {
        logger.warn("[TelegramBot] Gửi tin thất bại", { error: data.description });
        return { ok: false, error: data.description };
      }

      return { ok: true, messageId: data.result?.message_id };
    } catch (err) {
      logger.error("[TelegramBot] Lỗi mạng khi gọi Telegram API", { error: err.message });
      return { ok: false, error: err.message };
    }
  }

  /**
   * Báo cáo Tóm tắt 8h Sáng Mỗi Ngày (Morning Briefing)
   */
  static async sendMorningBriefing({ chatId } = {}) {
    try {
      const db = getDB();
      if (!db) return { ok: false, message: "Database not connected" };

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
      yesterday.setHours(0, 0, 0, 0);
      const endYesterday = new Date(yesterday.getTime() + 24 * 3600 * 1000 - 1);

      // 1. Doanh thu hôm qua
      const orders = await db.collection("don_hang").find({
        loai_don: "sale",
        trang_thai: { $in: ["completed", "paid", "da_thanh_toan"] },
        $or: [
          { ngay_dat: { $gte: yesterday, $lte: endYesterday } },
          { created_at: { $gte: yesterday, $lte: endYesterday } },
        ],
      }).toArray();

      const yesterdayRevenue = orders.reduce((sum, o) => sum + Number(o.tong_tien || 0), 0);

      // 2. Số dư quỹ tiền mặt hiện tại
      const cashAgg = await db.collection("so_quy").aggregate([
        { $match: { trang_thai: "active" } },
        {
          $group: {
            _id: "$loai_phieu",
            total: { $sum: { $toDouble: { $ifNull: ["$so_tien", 0] } } },
          },
        },
      ]).toArray();

      let thu = 0;
      let chi = 0;
      for (const item of cashAgg) {
        if (item._id === "thu") thu = item.total;
        else if (item._id === "chi") chi = item.total;
      }
      const currentCash = Math.max(0, thu - chi);

      // 3. Số chứng từ đang chờ duyệt trong Approvals Hub
      const pendingPurchases = await db.collection("don_hang").countDocuments({
        loai_don: "purchase_receipt",
        trang_thai: "draft",
      });
      const pendingAdjustments = await db.collection("dieu_chinh_kho").countDocuments({
        trang_thai: "pending",
      });
      const totalPending = pendingPurchases + pendingAdjustments;

      // Soạn nội dung tin nhắn HTML
      const dateStr = now.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const message = `
☀️ <b>BÁO CÁO ĐẦU NGÀY SME ERP</b>
📅 <i>${dateStr}</i>

💰 <b>Số dư ngân quỹ hiện tại:</b> <code>${currentCash.toLocaleString("vi-VN")} đ</code>
📈 <b>Doanh thu hoàn thành hôm qua:</b> <code>${yesterdayRevenue.toLocaleString("vi-VN")} đ</code> (${orders.length} đơn)
⏳ <b>Hàng đợi chờ duyệt:</b> <b>${totalPending} chứng từ</b> (Mua hàng: ${pendingPurchases}, Kiểm kê: ${pendingAdjustments})

👉 <i>Đăng nhập hệ thống tại <a href="http://localhost">SME ERP Portal</a> để xem chi tiết!</i>
      `.trim();

      return await this.sendMessage({ chatId, text: message });
    } catch (err) {
      logger.error("[TelegramBot.sendMorningBriefing] Error", { error: err.message });
      return { ok: false, error: err.message };
    }
  }

  /**
   * Cảnh báo Chứng từ Chờ Duyệt kèm Nút Duyệt 1-Click (Inline Keyboard)
   */
  static async sendApprovalAlert({ docType, docCode, docId, requester, amount, details }) {
    const typeLabel = docType === "PURCHASE" ? "Đơn Mua Hàng" : docType === "ADJUSTMENT" ? "Kiểm Kê Kho" : "Phiếu Chi Tiền";
    const amountStr = amount ? `\n💵 <b>Số tiền:</b> <code>${Number(amount).toLocaleString("vi-VN")} đ</code>` : "";

    const text = `
🚨 <b>YÊU CẦU PHÊ DUYỆT MỚI</b>
📋 <b>Loại:</b> ${typeLabel}
🏷️ <b>Mã:</b> <code>${docCode}</code>
👤 <b>Người đề xuất:</b> ${requester || "Nhân viên"}${amountStr}
📝 <b>Chi tiết:</b> ${details || "Cần phê duyệt từ Giám đốc"}
    `.trim();

    // Nút Inline Keyboard
    const replyMarkup = {
      inline_keyboard: [
        [
          { text: "✅ Duyệt Ngay", callback_data: `APPROVE:${docType}:${docId}` },
          { text: "❌ Từ Chối", callback_data: `REJECT:${docType}:${docId}` },
        ],
      ],
    };

    return await this.sendMessage({ text, replyMarkup });
  }

  /**
   * Xử lý tương tác nút bấm Callback Query từ Telegram (1-Click Approval)
   */
  static async handleCallbackQuery(callbackQuery) {
    try {
      const data = callbackQuery.data; // e.g. "APPROVE:PURCHASE:6ac..."
      const messageId = callbackQuery.message?.message_id;
      const chatId = callbackQuery.message?.chat?.id;
      const user = callbackQuery.from?.first_name || "Giám đốc";

      if (!data || !data.includes(":")) {
        return { ok: false, message: "Invalid callback format" };
      }

      const [action, docType, docId] = data.split(":");
      const db = getDB();
      if (!db || !ObjectId.isValid(docId)) {
        return { ok: false, message: "Invalid DB or ID" };
      }

      const now = new Date();
      let resultText = "";

      if (action === "APPROVE") {
        if (docType === "PURCHASE") {
          await db.collection("don_hang").updateOne(
            { _id: new ObjectId(docId) },
            { $set: { trang_thai: "confirmed", approved_at: now, approved_by_name: user } }
          );
        } else if (docType === "ADJUSTMENT") {
          await db.collection("dieu_chinh_kho").updateOne(
            { _id: new ObjectId(docId) },
            { $set: { trang_thai: "approved", approved_at: now, approved_by: user } }
          );
        }
        resultText = `✅ <b>ĐÃ PHÊ DUYỆT</b> bởi <b>${user}</b> lúc ${now.toLocaleTimeString("vi-VN")}`;
      } else {
        if (docType === "PURCHASE") {
          await db.collection("don_hang").updateOne(
            { _id: new ObjectId(docId) },
            { $set: { trang_thai: "cancelled", rejected_at: now, rejected_by_name: user } }
          );
        } else if (docType === "ADJUSTMENT") {
          await db.collection("dieu_chinh_kho").updateOne(
            { _id: new ObjectId(docId) },
            { $set: { trang_thai: "rejected", rejected_at: now, rejected_by: user } }
          );
        }
        resultText = `❌ <b>ĐÃ TỪ CHỐI</b> bởi <b>${user}</b> lúc ${now.toLocaleTimeString("vi-VN")}`;
      }

      // Cập nhật lại tin nhắn Telegram để loại bỏ nút bấm và ghi nhận kết quả
      const { token } = await this.getConfig();
      if (token && chatId && messageId) {
        const editUrl = `https://api.telegram.org/bot${token}/editMessageText`;
        const oldText = callbackQuery.message?.text || "";
        await fetch(editUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `${oldText}\n\n${resultText}`,
            parse_mode: "HTML",
          }),
        });
      }

      return { ok: true, action, docType, docId, user };
    } catch (err) {
      logger.error("[TelegramBot.handleCallbackQuery] Error", { error: err.message });
      return { ok: false, error: err.message };
    }
  }
}

export default TelegramBotService;
