/**
 * Zero-dependency in-memory store for runtime company settings.
 * Giúp các pure services (EInvoiceService, LogisticsService, PaymentService) đọc cấu hình động
 * mà không phụ thuộc trực tiếp vào MongoDB hay Winston logger (thuận lợi cho unit testing độc lập).
 */

let runtimeSettings = {
  company: {
    ten_cong_ty: "CÔNG TY TNHH SME ERP VIỆT NAM",
    ma_so_thue: "0109876543",
    thue_vat_mac_dinh: 8,
  },
  vietqr: {
    bank_bin: process.env.PAYMENT_BANK_BIN || process.env.VIETQR_BANK_ID || "MB",
    account_number: process.env.PAYMENT_ACCOUNT_NO || process.env.VIETQR_ACCOUNT_NO || "0987654321",
    account_name: process.env.PAYMENT_ACCOUNT_NAME || process.env.VIETQR_ACCOUNT_NAME || "CONG TY SME ERP",
    template: "compact2",
  },
  integrations: {
    einvoice_provider: "mock",
    einvoice_mode: process.env.EINVOICE_MODE || "mock",
    einvoice_series: `1C${String(new Date().getFullYear()).slice(-2)}TMM`,
    logistics_default_carrier: "GHN",
    logistics_mode: "sandbox",
    sepay_enabled: false,
  },
};

export function getRuntimeSettings() {
  return runtimeSettings;
}

export function setRuntimeSettings(nextSettings) {
  if (nextSettings && typeof nextSettings === "object") {
    runtimeSettings = {
      ...runtimeSettings,
      ...nextSettings,
    };
  }
}
