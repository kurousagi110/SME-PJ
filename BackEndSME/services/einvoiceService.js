/**
 * Electronic Invoice (e-Invoice) Service — Provider Adapter Architecture
 * Chuẩn hóa khung phát hành hóa đơn điện tử theo Nghị định 123 / Thông tư 78.
 *
 * Bảo vệ tính trung thực (Fail-closed):
 * - EINVOICE_MODE=mock (mặc định): Trả về bản xem trước mô phỏng rõ ràng (`isMock: true`, `cqtCode: null`),
 *   KHÔNG tự sinh số hóa đơn hay mã CQT giả mạo.
 * - EINVOICE_MODE=live: Chỉ gọi API thật khi đã cấu hình đủ provider (MISA / VNPT / Viettel), endpoint HTTPS hợp lệ
 *   và thông tin xác thực; nếu thiếu sẽ ném lỗi rõ ràng.
 */

import ApiError from "../utils/ApiError.js";
import { getRuntimeSettings } from "../utils/runtimeSettingsStore.js";
import { validateExternalWebhookUrl } from "../utils/securityHelpers.js";

export const EINVOICE_PROVIDERS = {
  MOCK: "mock",
  MISA: "misa",
  VNPT: "vnpt",
  VIETTEL: "viettel",
};

export class EInvoiceService {
  /**
   * Trả về trạng thái cấu hình adapter HĐĐT hiện tại (an toàn để hiển thị trên UI /settings).
   */
  static getAdapterStatus() {
    const cfg = getRuntimeSettings()?.integrations || {};
    const mode = String(process.env.EINVOICE_MODE || cfg.einvoice_mode || "mock").trim().toLowerCase();
    const provider = String(process.env.EINVOICE_PROVIDER || cfg.einvoice_provider || "mock").trim().toLowerCase();
    const apiUrl = process.env.EINVOICE_API_URL || "";
    const hasCredentials = Boolean(apiUrl && (process.env.EINVOICE_API_KEY || process.env.EINVOICE_API_TOKEN));

    return {
      mode,
      provider,
      series: cfg.einvoice_series || `1C${String(new Date().getFullYear()).slice(-2)}TMM`,
      configured_for_live: mode === "live" && provider !== "mock" && hasCredentials,
      supported_providers: [
        { code: "mock", label: "Mô phỏng nội bộ (Mock Preview)" },
        { code: "misa", label: "MISA meInvoice (NĐ 123/TT 78)" },
        { code: "vnpt", label: "VNPT Invoice (NĐ 123/TT 78)" },
        { code: "viettel", label: "Viettel S-Invoice (NĐ 123/TT 78)" },
      ],
    };
  }

  /**
   * Chuẩn hóa payload hóa đơn điện tử theo đặc tả từng nhà cung cấp (MISA / VNPT / Viettel).
   */
  static buildProviderPayload(
    provider = "misa",
    {
      orderCode = "",
      buyerName = "",
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
      invoiceSeries = `1C${String(new Date().getFullYear()).slice(-2)}TMM`,
    } = {}
  ) {
    const normalizedProvider = String(provider || "misa").trim().toLowerCase();
    const company = getRuntimeSettings()?.company || {};

    const commonLines = (Array.isArray(items) ? items : []).map((it, idx) => ({
      lineNumber: idx + 1,
      itemCode: it.ma_sp || it.item_code || `SP-${idx + 1}`,
      itemName: it.ten_sp || it.ten || "Hàng hóa",
      unitName: it.don_vi || "Cái",
      quantity: Number(it.so_luong || 1),
      unitPrice: Number(it.don_gia || 0),
      amountWithoutTax: Number(it.thanh_tien || Number(it.so_luong || 1) * Number(it.don_gia || 0)),
      vatRate: Number(taxRate),
    }));

    if (normalizedProvider === EINVOICE_PROVIDERS.MISA) {
      return {
        provider: "MISA_MEINVOICE",
        RefID: orderCode,
        InvSeries: invoiceSeries,
        InvDate: new Date().toISOString().slice(0, 10),
        SellerTaxCode: company.ma_so_thue || "",
        BuyerLegalName: buyerName,
        BuyerTaxCode: buyerTaxCode,
        BuyerAddress: buyerAddress,
        BuyerEmail: buyerEmail,
        PaymentMethodName: paymentMethod,
        TotalSaleAmountOC: subtotal,
        TotalDiscountAmountOC: discount,
        TotalVATAmountOC: taxAmount,
        TotalAmountOC: total,
        OriginalInvoiceDetail: commonLines,
      };
    }

    if (normalizedProvider === EINVOICE_PROVIDERS.VIETTEL) {
      return {
        provider: "VIETTEL_SINVOICE",
        generalInvoiceInfo: {
          invoiceType: "1",
          templateCode: `1/${invoiceSeries}`,
          invoiceSeries,
          currencyCode: "VND",
          paymentStatus: true,
        },
        buyerInfo: {
          buyerName,
          buyerTaxCode,
          buyerAddressLine: buyerAddress,
          buyerEmail,
        },
        itemInfo: commonLines,
        summarizeInfo: {
          sumOfTotalLineAmountWithoutTax: subtotal,
          discountAmount: discount,
          totalTaxAmount: taxAmount,
          totalAmountWithTax: total,
        },
      };
    }

    return {
      provider: normalizedProvider === EINVOICE_PROVIDERS.VNPT ? "VNPT_INVOICE" : "STANDARD_TT78",
      orderCode,
      invoiceSeries,
      seller: {
        name: company.ten_cong_ty || "",
        taxCode: company.ma_so_thue || "",
      },
      buyer: {
        name: buyerName,
        taxCode: buyerTaxCode,
        address: buyerAddress,
        email: buyerEmail,
      },
      items: commonLines,
      summary: { subtotal, discount, taxRate, taxAmount, total, paymentMethod },
    };
  }

  /**
   * Phát hành hóa đơn điện tử (đồng bộ cho chế độ mock / guard an toàn chế độ live).
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
    const cfg = getRuntimeSettings()?.integrations || {};
    const invoiceSeries = cfg.einvoice_series || `1C${String(year).slice(-2)}TMM`;

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

  /**
   * Phát hành hóa đơn điện tử bất đồng bộ qua Adapter nhà cung cấp thật khi đã cấu hình API endpoint + token.
   */
  static async issueViaProvider(invoiceData = {}) {
    const status = this.getAdapterStatus();
    if (status.mode !== "live" || status.provider === "mock") {
      return this.generateInvoice(invoiceData);
    }

    const apiUrl = process.env.EINVOICE_API_URL || "";
    const apiToken = process.env.EINVOICE_API_TOKEN || process.env.EINVOICE_API_KEY || "";
    if (!apiUrl || !apiToken) {
      throw ApiError.badRequest(
        `Chưa cấu hình EINVOICE_API_URL / EINVOICE_API_TOKEN cho nhà cung cấp ${status.provider.toUpperCase()} ở chế độ EINVOICE_MODE=live.`
      );
    }

    const urlCheck = validateExternalWebhookUrl(apiUrl);
    if (!urlCheck.valid) {
      throw ApiError.badRequest(`Endpoint HĐĐT không an toàn: ${urlCheck.reason || "Invalid URL"}`);
    }

    const providerPayload = this.buildProviderPayload(status.provider, {
      ...invoiceData,
      invoiceSeries: status.series,
    });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(providerPayload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw ApiError.badRequest(`Nhà cung cấp HĐĐT (${status.provider}) trả lỗi HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const remote = await response.json();
    return {
      success: true,
      isMock: false,
      mode: "live",
      provider: status.provider.toUpperCase(),
      orderCode: invoiceData.orderCode || "",
      invoiceNumber: remote.invoiceNumber || remote.InvNo || null,
      invoiceSeries: remote.invoiceSeries || status.series,
      invoiceLookupCode: remote.lookupCode || remote.TransactionID || null,
      cqtCode: remote.cqtCode || remote.TaxAuthorityCode || null,
      issueDate: new Date(),
      status: "ISSUED",
      viewUrl: remote.viewUrl || null,
      pdfDownloadUrl: remote.pdfDownloadUrl || null,
    };
  }
}
