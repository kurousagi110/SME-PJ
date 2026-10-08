/**
 * VietQR & Online Payment Gateway Service
 * Chuẩn định dạng QR Napas 247 và cổng thanh toán tự động (SePAY / Casso / Ngân hàng).
 */

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
    bankBin = process.env.PAYMENT_BANK_BIN || "MB",
    accountNumber = process.env.PAYMENT_ACCOUNT_NO || "0987654321",
    accountName = process.env.PAYMENT_ACCOUNT_NAME || "CONG TY SME ERP",
    amount = 0,
    orderCode = "",
    template = "compact2",
  }) {
    const bin = BANK_BINS[bankBin.toLowerCase()] || bankBin;
    const memo = encodeURIComponent(orderCode.trim());
    const accName = encodeURIComponent(accountName.trim());
    const qrUrl = `https://img.vietqr.io/image/${bin}-${accountNumber}-${template}.png?amount=${Math.round(
      amount
    )}&addInfo=${memo}&accountName=${accName}`;

    return {
      qrUrl,
      bankBin: bin,
      accountNumber,
      accountName,
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
    const cleaned = description.toUpperCase().replace(/\s+/g, "");

    // Regex tìm mã đơn hàng
    const regex = /(DH[-_]?[A-Z0-9]+|HD[-_]?[A-Z0-9]+|ORD[-_]?[A-Z0-9]+|POS[-_]?[A-Z0-9]+)/i;
    const match = cleaned.match(regex);
    if (match) {
      return match[1].replace(/[-_]/g, ""); // Chuẩn hóa mã
    }
    return null;
  }
}
