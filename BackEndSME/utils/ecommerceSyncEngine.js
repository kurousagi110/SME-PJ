/**
 * Omnichannel E-Commerce Sync Engine (Shopee / TikTok Shop / Lazada) — Pure Logic.
 * Chống bán âm kho (buffer stock), chuẩn hóa đơn hàng từ sàn & quyết toán tiền sàn sau phí.
 */

export const SUPPORTED_PLATFORMS = [
  { code: "shopee", name: "Shopee Mall / Shop", defaultFeePct: 11.5 },
  { code: "tiktok", name: "TikTok Shop", defaultFeePct: 12.0 },
  { code: "lazada", name: "Lazada", defaultFeePct: 10.5 },
];

/**
 * Tính số lượng tồn kho an toàn đẩy lên sàn TMĐT (chống oversell khi bán song song tại POS & B2B).
 */
export function computeSafeChannelStock({
  physicalStock = 0,
  reservedStock = 0,
  bufferStock = 0,
  maxPublishQty = 0,
} = {}) {
  const phys = Math.max(0, Math.floor(Number(physicalStock) || 0));
  const resv = Math.max(0, Math.floor(Number(reservedStock) || 0));
  const buf = Math.max(0, Math.floor(Number(bufferStock) || 0));
  let safe = Math.max(0, phys - resv - buf);

  const cap = Math.max(0, Math.floor(Number(maxPublishQty) || 0));
  if (cap > 0) {
    safe = Math.min(safe, cap);
  }
  return safe;
}

/**
 * Quyết toán doanh thu thực nhận từ sàn TMĐT sau khi trừ phí cố định, phí thanh toán, voucher shop & hoàn hàng.
 */
export function computeChannelSettlement({
  grossSales = 0,
  platformFeePct = 11,
  paymentFeePct = 3,
  shopVoucherCost = 0,
  shippingSubsidy = 0,
  returnAmount = 0,
} = {}) {
  const gross = Math.max(0, Number(grossSales) || 0);
  const returned = Math.min(gross, Math.max(0, Number(returnAmount) || 0));
  const netSales = Math.max(0, gross - returned);

  const platformFee = Math.round((netSales * Math.max(0, Number(platformFeePct) || 0)) / 100);
  const paymentFee = Math.round((netSales * Math.max(0, Number(paymentFeePct) || 0)) / 100);
  const voucher = Math.max(0, Number(shopVoucherCost) || 0);
  const shipping = Math.max(0, Number(shippingSubsidy) || 0);

  const totalDeductions = platformFee + paymentFee + voucher + shipping;
  const netPayout = Math.max(0, Math.round(netSales - totalDeductions));
  const effectiveFeeRatePct = netSales > 0 ? Math.round((totalDeductions / netSales) * 1000) / 10 : 0;

  return {
    gross_sales: Math.round(gross),
    return_amount: Math.round(returned),
    net_sales: Math.round(netSales),
    platform_fee: platformFee,
    payment_fee: paymentFee,
    shop_voucher_cost: Math.round(voucher),
    shipping_subsidy: Math.round(shipping),
    total_deductions: Math.round(totalDeductions),
    net_payout: netPayout,
    effective_fee_rate_pct: effectiveFeeRatePct,
  };
}

/**
 * Chuẩn hóa payload đơn hàng từ Shopee / TikTok Shop / Lazada sang cấu trúc chuẩn SME.
 */
export function normalizeExternalChannelOrder(platform = "shopee", rawOrder = {}) {
  const plat = String(platform || "shopee").trim().toLowerCase();
  const externalOrderId = String(
    rawOrder.external_order_id || rawOrder.order_sn || rawOrder.order_id || `EXT-${Date.now()}`
  ).trim();
  const customerName = String(
    rawOrder.customer_name || rawOrder.buyer_username || rawOrder.recipient_address?.name || `Khách ${plat.toUpperCase()}`
  ).trim();
  const customerPhone = String(
    rawOrder.customer_phone || rawOrder.recipient_address?.phone || ""
  ).trim();

  const items = (Array.isArray(rawOrder.items) ? rawOrder.items : []).map((it) => ({
    channel_sku: String(it.channel_sku || it.model_sku || it.sku || "").trim().toUpperCase(),
    name: String(it.name || it.item_name || "Sản phẩm sàn").trim(),
    quantity: Math.max(1, Math.floor(Number(it.quantity || 1))),
    unit_price: Math.max(0, Number(it.unit_price || it.price || 0)),
  }));

  const totalAmount =
    Number(rawOrder.total_amount || 0) ||
    items.reduce((s, it) => s + it.quantity * it.unit_price, 0);

  return {
    platform: plat,
    external_order_id: externalOrderId,
    customer_name: customerName,
    customer_phone: customerPhone,
    items,
    total_amount: Math.round(totalAmount),
  };
}
