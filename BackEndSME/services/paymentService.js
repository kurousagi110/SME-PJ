/**
 * VietQR & Online Payment Gateway Service
 * Chuẩn định dạng QR Napas 247 và cổng thanh toán tự động (SePAY / Casso / Ngân hàng).
 */

import SystemSettingsDAO from "../models/systemSettingsDAO.js";

// Danh sách mã ngân hàng phổ biến (BIN code chuẩn Napas)
export const BANK_BINS = {
  vietinbank: "970415",
  vietcombank: "970436",
  mbbank: "970422",
  techcombank: "970407",
  bidv: "970418",
  acb: "970416",
  vpbank: "970432",
  tpbank: "970423",
  sacombank: "970403",
  hdbank: "970437",
};

export class PaymentService {
  /**
   * Tạo link ảnh VietQR chuẩn Napas qua dịch vụ VietQR API công khai
   * @param {Object} param0
   * @param {string} param0.bankBin - Mã ngân hàng hoặc BIN (vd: 'vietcombank', 'mbbank' hoặc '970422')
   * @param {string} param0.accountNumber - Số tài khoản nhận tiền
   * @param {string} param0.accountName - Tên chủ tài khoản
   * @param {number} param0.amount - Số tiền cần thanh toán
   * @param {string} param0.orderCode - Mã đơn hàng làm nội dung chuyển khoản
   * @param {string} [param0.template] - 'compact', 'compact2', 'qr_only', 'print'
   */
  static generateVietQR({
    bankBin,
    accountNumber,
    accountName,
    amount = 0,
    orderCode = "",
    template,
  }) {
    const cfg = SystemSettingsDAO.getCachedSync()?.vietqr || {};
    const resolvedBank = bankBin || cfg.bank_bin || process.env.PAYMENT_BANK_BIN || "MB";
    const resolvedAccountNo = accountNumber || cfg.account_number || process.env.PAYMENT_ACCOUNT_NO || "0987654321";
    const resolvedAccountName = accountName || cfg.account_name || process.env.PAYMENT_ACCOUNT_NAME || "CONG TY SME ERP";
    const resolvedTemplate = template || cfg.template || "compact2";

    const bin = BANK_BINS[String(resolvedBank).toLowerCase()] || resolvedBank;
    const memo = encodeURIComponent(orderCode.trim());
    const accName = encodeURIComponent(resolvedAccountName.trim());
    const qrUrl = `https://img.vietqr.io/image/${bin}-${resolvedAccountNo}-${resolvedTemplate}.png?amount=${Math.round(
      amount
    )}&addInfo=${memo}&accountName=${accName}`;

    return {
      qrUrl,
      bankBin: bin,
      accountNumber: resolvedAccountNo,
      accountName: resolvedAccountName,
      amount: Math.round(amount),
      orderCode,
      transferContent: orderCode,
    };
  }

  /**
   * Phân tích nội dung chuyển khoản để bóc tách mã đơn hàng
   * Hỗ trợ các mẫu: DH-xxxx, DHxxxx, HD-xxxx, ORD-xxxx, POS-xxxx
   */
  static extractOrderCode(description = "") {
    if (!description) return null;
    const cleaned = description.toUpperCase().trim();

    // Regex tìm mã đơn hàng đầy đủ (hỗ trợ DH-20261008-XXXX, POS-XXXX, ORD-XXXX)
    const regex = /(DH[-_A-Z0-9]+|HD[-_A-Z0-9]+|ORD[-_A-Z0-9]+|POS[-_A-Z0-9]+)/i;
    const match = cleaned.match(regex);
    if (match) {
      return match[1].trim();
    }
    return null;
  }
}
