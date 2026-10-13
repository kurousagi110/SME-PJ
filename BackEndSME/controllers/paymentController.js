import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import { PaymentService } from "../services/paymentService.js";
import DonHangDAO from "../models/donHangDAO.js";
import SoQuyDAO, { LOAI_PHIEU, PHUONG_THUC } from "../models/soQuyDAO.js";
import { getIO } from "../utils/socketManager.js";
import logger from "../utils/logger.js";
import { logAction } from "../utils/auditLogger.js";
import { state } from "../models/donHangState.js";
import { ObjectId } from "mongodb";
import { escapeRegex } from "../utils/escapeRegex.js";
import { getDB } from "../config/database.js";

export default class PaymentController {
  /**
   * Sinh mã VietQR kèm thông tin đơn hàng
   * GET /api/v1/payments/vietqr?orderCode=DH-xxx&amount=100000
   */
  static generateQR = asyncHandler(async (req, res) => {
    const { orderCode, amount, bankBin, accountNumber, accountName } = req.query;

    if (!orderCode) {
      throw ApiError.badRequest("Thiếu mã đơn hàng (orderCode)");
    }

    let targetAmount = Number(amount) || 0;

    // Nếu không truyền amount, tự động tra cứu từ đơn hàng
    if (!targetAmount) {
      const order = await DonHangDAO.getByCode(orderCode);
      if (order && !order.error) {
        targetAmount = order.tong_tien || 0;
      }
    }

    const qrData = PaymentService.generateVietQR({
      orderCode,
      amount: targetAmount,
      bankBin,
      accountNumber,
      accountName,
    });

    return sendSuccess(res, qrData, "Tạo mã VietQR thành công");
  });

  /**
   * Webhook xử lý biến động số dư từ SePAY / Casso / Ngân hàng
   * POST /api/v1/payments/webhook
   */
  static handleWebhook = asyncHandler(async (req, res) => {
    const payload = req.body || {};
    logger.info("[Payment Webhook] Nhận thông báo giao dịch", { payload });

    // 1. Xác thực Webhook Secret (nếu cấu hình PAYMENT_WEBHOOK_SECRET)
    const configuredSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (configuredSecret) {
      const incomingSecret =
        req.headers["x-api-key"] ||
        req.headers["authorization"]?.replace(/^Bearer\s+|^Apikey\s+/i, "") ||
        req.query?.secret;

      if (!incomingSecret || incomingSecret !== configuredSecret) {
        logger.warn("[Payment Webhook] Từ chối truy cập do sai secret/token");
        throw ApiError.unauthorized("Chữ ký hoặc mã khóa webhook không hợp lệ", "INVALID_WEBHOOK_SECRET");
      }
    }

    // Hỗ trợ cả payload của SePAY (content, transferAmount) và Casso (description, amount)
    const content = payload.content || payload.description || payload.orderCode || "";
    const amount = Number(payload.transferAmount || payload.amount || 0);
    const transId = payload.referenceCode || payload.id || payload.tid || String(Date.now());
    const gateway = payload.gateway || payload.bankName || "SEPAY/BANK";

    if (!amount || amount <= 0) {
      return sendSuccess(res, { processed: false, reason: "Số tiền không hợp lệ" });
    }

    // 2. Chống xử lý trùng lặp giao dịch (Idempotency Guard)
    const db = getDB();
    const webhookCol = db ? db.collection("payment_webhooks") : null;
    if (webhookCol && transId) {
      const existingTx = await webhookCol.findOne({ trans_id: String(transId) });
      if (existingTx) {
        logger.info(`[Payment Webhook] Giao dịch ${transId} đã được xử lý trước đó (Idempotent)`);
        return sendSuccess(res, {
          processed: true,
          idempotent: true,
          message: "Giao dịch đã được ghi nhận trước đó",
          orderCode: existingTx.order_code,
        });
      }
    }

    // Trích xuất mã đơn hàng từ nội dung chuyển khoản
    let matchedOrderCode = PaymentService.extractOrderCode(content);

    let order = null;
    if (matchedOrderCode) {
      const safeCode = escapeRegex(matchedOrderCode);
      // Tìm đơn hàng theo mã chính xác hoặc tương đương
      order = await state.don_hang.findOne({
        $or: [
          { ma_dh: matchedOrderCode },
          { ma_dh: `DH-${matchedOrderCode}` },
          { ma_dh: new RegExp(`^${safeCode}$`, "i") },
          { ma_dh: new RegExp(safeCode, "i") },
        ],
      });
    }

    // Fallback: Quét tìm mã đơn hàng tồn tại có xuất hiện trong chuỗi content
    if (!order && content) {
      const cleanTokens = content.toUpperCase().split(/[^A-Z0-9-]/).filter((t) => t.length >= 6);
      for (const token of cleanTokens) {
        const found = await state.don_hang.findOne({ ma_dh: new RegExp(escapeRegex(token), "i") });
        if (found) {
          order = found;
          break;
        }
      }
    }


    if (!order) {
      logger.warn(`[Payment Webhook] Không tìm thấy đơn hàng khớp với nội dung: "${content}"`);
      return sendSuccess(res, {
        processed: false,
        reason: "Không tìm thấy đơn hàng tương ứng",
      });
    }

    // Kiểm tra đơn hàng đã thanh toán chưa
    if (order.thanh_toan?.status === "paid" || order.thanh_toan?.status === "da_thanh_toan") {
      return sendSuccess(res, {
        processed: true,
        message: "Đơn hàng đã được thanh toán trước đó",
        orderId: order._id,
      });
    }

    // 1. Cập nhật trạng thái thanh toán của Đơn Hàng
    const currentPaid = Number(order.thanh_toan?.amount || 0) + amount;
    const isFullPaid = currentPaid >= (order.tong_tien || 0);

    await state.don_hang.updateOne(
      { _id: new ObjectId(order._id) },
      {
        $set: {
          "thanh_toan.method": "chuyen_khoan",
          "thanh_toan.amount": currentPaid,
          "thanh_toan.status": isFullPaid ? "paid" : "partially_paid",
          "thanh_toan.trans_id": transId,
          "thanh_toan.paid_at": new Date(),
          updated_at: new Date(),
        },
      }
    );

    // 2. Tự động sinh Phiếu Thu trong Sổ Quỹ (Closed-Loop Accounting)
    const phieuThuResult = await SoQuyDAO.taoPhieu({
      loai_phieu: LOAI_PHIEU.THU,
      hang_muc: "Thu tiền bán hàng",
      so_tien: amount,
      phuong_thuc: PHUONG_THUC.CHUYEN_KHOAN,
      doi_tuong: {
        loai: "khach_hang",
        id: order.khach_hang_id ? String(order.khach_hang_id) : null,
        ten: order.khach_hang_ten || "Khách mua lẻ",
      },
      ma_chung_tu: order.ma_dh,
      ngay_ghi_nhan: new Date(),
      ghi_chu: `Thanh toán chuyển khoản tự động qua ${gateway} (GD: ${transId}) - Đơn: ${order.ma_dh}`,
      user: {
        _id: "system_payment",
        username: "system_payment",
        ho_ten: "Cổng Thanh Toán Tự Động",
      },
    });

    // 3. Gửi Socket.io Realtime thông báo tới Quầy POS và Thu ngân
    try {
      const io = getIO();
      if (io) {
        io.emit("payment:success", {
          orderId: String(order._id),
          orderCode: order.ma_dh,
          amount,
          transId,
          isFullPaid,
          timestamp: new Date(),
        });
        io.emit("thong_bao_moi", {
          tieu_de: "Thanh toán thành công!",
          noi_dung: `Đơn hàng ${order.ma_dh} vừa nhận thanh toán ${amount.toLocaleString("vi-VN")} đ qua ngân hàng.`,
          loai: "thanh_toan",
        });
      }
    } catch (e) {
      logger.warn("[Payment Webhook] Không thể gửi socket notification", { error: e.message });
    }

    // 4. Lưu vết giao dịch để chống Replay Attack
    try {
      if (webhookCol && transId) {
        await webhookCol.insertOne({
          trans_id: String(transId),
          order_id: String(order._id),
          order_code: order.ma_dh,
          amount,
          gateway,
          content,
          created_at: new Date(),
        });
      }
    } catch (saveErr) {
      logger.warn("[Payment Webhook] Không thể lưu lịch sử webhook", { error: saveErr.message });
    }

    // 5. Ghi Audit Log
    logAction({
      req,
      action: "PAYMENT_WEBHOOK_RECEIVED",
      target: "ORDER",
      targetId: String(order._id),
      details: {
        orderCode: order.ma_dh,
        amount,
        transId,
        phieuThu: phieuThuResult?.data?.ma_phieu,
      },
      status: "SUCCESS",
    });

    return sendSuccess(
      res,
      {
        processed: true,
        orderCode: order.ma_dh,
        amount,
        isFullPaid,
        phieuThu: phieuThuResult?.data?.ma_phieu,
      },
      "Xử lý thanh toán webhook thành công"
    );
  });
}
