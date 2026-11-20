/**
 * Electronic Invoice (e-Invoice) Service
 * Chuẩn hóa khung phát hành hóa đơn điện tử theo Nghị định 123 / Thông tư 78.
 *
 * Bảo vệ tính trung thực:
 * - EINVOICE_MODE=mock (mặc định): Trả về bản xem trước mô phỏng rõ ràng (`isMock: true`, `cqtCode: null`),
 *   KHÔNG tự sinh số hóa đơn hay mã CQT giả mạo.
 * - EINVOICE_MODE=live: Chặn phát hành nếu chưa tích hợp API nhà cung cấp thật (MISA / VNPT / Viettel).
 */

import ApiError from "../utils/ApiError.js";

export class EInvoiceService {
  /**
   * Phát hành hóa đơn điện tử cho đơn bán hàng
   */
  static generateInvoice({
    orderCode,
    buyerName,
    buyerTaxCode = "",
    buyerAddress = "",
    buyerEmail = "",
    items = [],
    subtotal = 0,
    discount = 0,
    taxRate = 8,
    taxAmount = 0,
    total = 0,
    paymentMethod = "TM/CK",
  }) {
    const mode = String(process.env.EINVOICE_MODE || "mock").trim().toLowerCase();

    if (mode === "live") {
      throw ApiError.badRequest(
        "Chưa cấu hình kết nối nhà cung cấp hóa đơn điện tử thật (MISA / VNPT / Viettel). Không thể phát hành hóa đơn trong chế độ EINVOICE_MODE=live."
      );
    }

    const year = new Date().getFullYear();
    const invoiceSeries = `1C${String(year).slice(-2)}TMM`;

    return {
      success: true,
      isMock: true,
      mode: "mock",
      provider: "MOCK_SANDBOX",
      orderCode: orderCode || "",
      invoiceNumber: null,
      invoiceSeries,
      invoiceLookupCode: null,
      cqtCode: null,
      issueDate: new Date(),
      status: "MOCK_PREVIEW",
      warning:
        "Chế độ mô phỏng nội bộ (EINVOICE_MODE=mock). Chứng từ này không có giá trị pháp lý và chưa gửi lên Cơ quan thuế.",
      items,
      buyer: {
        name: buyerName,
        taxCode: buyerTaxCode,
        address: buyerAddress,
        email: buyerEmail,
      },
      summary: {
        subtotal,
        discount,
        taxRate,
        taxAmount,
        total,
        paymentMethod,
      },
      viewUrl: null,
      pdfDownloadUrl: null,
    };
  }
}
