import test from "node:test";
import assert from "node:assert/strict";
import { EInvoiceService } from "../services/einvoiceService.js";
import { LogisticsService } from "../services/logisticsService.js";
import {
  computeSafeChannelStock,
  computeChannelSettlement,
  normalizeExternalChannelOrder,
} from "../utils/ecommerceSyncEngine.js";

test("EInvoiceService Adapters - builds MISA & Viettel payloads and reports adapter status", () => {
  const status = EInvoiceService.getAdapterStatus();
  assert.equal(status.supported_providers.length, 4);

  const misaPayload = EInvoiceService.buildProviderPayload("misa", {
    orderCode: "DH-001",
    buyerName: "Công ty ABC",
    buyerTaxCode: "0101234567",
    subtotal: 10_000_000,
    taxRate: 8,
    taxAmount: 800_000,
    total: 10_800_000,
    items: [{ ma_sp: "SP01", ten_sp: "Bàn gỗ", so_luong: 2, don_gia: 5_000_000 }],
  });
  assert.equal(misaPayload.provider, "MISA_MEINVOICE");
  assert.equal(misaPayload.RefID, "DH-001");
  assert.equal(misaPayload.TotalAmountOC, 10_800_000);

  const viettelPayload = EInvoiceService.buildProviderPayload("viettel", {
    orderCode: "DH-002",
    buyerName: "Công ty XYZ",
    subtotal: 5_000_000,
    taxAmount: 400_000,
    total: 5_400_000,
  });
  assert.equal(viettelPayload.provider, "VIETTEL_SINVOICE");
  assert.equal(viettelPayload.summarizeInfo.totalAmountWithTax, 5_400_000);
});

test("LogisticsService Adapters - normalizes carrier webhook statuses and builds GHN payload", () => {
  assert.equal(LogisticsService.normalizeWebhookStatus("ready_to_pick"), "cho_lay_hang");
  assert.equal(LogisticsService.normalizeWebhookStatus("delivering"), "dang_giao");
  assert.equal(LogisticsService.normalizeWebhookStatus("delivered"), "da_giao");
  assert.equal(LogisticsService.normalizeWebhookStatus("returned"), "hoan_hang");

  const payload = LogisticsService.buildCarrierPayload("GHN", {
    orderCode: "DH-100",
    receiverName: "Nguyễn A",
    receiverPhone: "0901234567",
    receiverAddress: "Hà Nội",
    codAmount: 1_500_000,
    weightGram: 2500,
  });
  assert.equal(payload.client_order_code, "DH-100");
  assert.equal(payload.cod_amount, 1_500_000);
});

test("Omnichannel E-Commerce Sync - computes anti-oversell safe stock, settlement payout, and normalizes orders", () => {
  // Physical 20 - reserved 3 - buffer 5 = 12
  assert.equal(computeSafeChannelStock({ physicalStock: 20, reservedStock: 3, bufferStock: 5 }), 12);
  // Capped at maxPublishQty = 10
  assert.equal(computeSafeChannelStock({ physicalStock: 20, reservedStock: 0, bufferStock: 2, maxPublishQty: 10 }), 10);
  // Never negative
  assert.equal(computeSafeChannelStock({ physicalStock: 3, reservedStock: 2, bufferStock: 5 }), 0);

  // Settlement: Gross 100M, returns 10M => net 90M; 10% platform (9M) + 2% payment (1.8M) + 1.2M voucher = 12M deductions => 78M payout
  const settle = computeChannelSettlement({
    grossSales: 100_000_000,
    returnAmount: 10_000_000,
    platformFeePct: 10,
    paymentFeePct: 2,
    shopVoucherCost: 1_200_000,
  });
  assert.equal(settle.net_sales, 90_000_000);
  assert.equal(settle.total_deductions, 12_000_000);
  assert.equal(settle.net_payout, 78_000_000);

  const ord = normalizeExternalChannelOrder("shopee", {
    order_sn: "SHP20261127001",
    buyer_username: "khach_shopee",
    items: [{ model_sku: "sp-ban-01", item_name: "Bàn gỗ", quantity: 2, price: 2_500_000 }],
  });
  assert.equal(ord.platform, "shopee");
  assert.equal(ord.external_order_id, "SHP20261127001");
  assert.equal(ord.items[0].channel_sku, "SP-BAN-01");
  assert.equal(ord.total_amount, 5_000_000);
});
