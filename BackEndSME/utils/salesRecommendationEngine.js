/**
 * salesRecommendationEngine.js — Gợi ý bán chéo (Cross-sell) & Cảnh báo biên lợi nhuận (Margin Guard)
 * (pure module, zero external dependencies)
 */

/**
 * Xây dựng ma trận sản phẩm thường mua cùng nhau (Co-occurrence) từ lịch sử đơn bán.
 * @param {Array<object>} salesOrders
 * @returns {Map<string, Map<string, number>>}
 */
export function buildCoOccurrenceMap(salesOrders = []) {
  const matrix = new Map();

  for (const order of salesOrders || []) {
    if (!order) continue;
    const status = String(order.trang_thai || "").toLowerCase();
    if (status === "cancelled" || status === "deleted") continue;

    const ids = [
      ...new Set(
        (order.san_pham || [])
          .map((item) => String(item?.san_pham_id || item?.ma_sp || "").trim())
          .filter(Boolean)
      ),
    ];

    if (ids.length < 2) continue;

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i];
        const b = ids[j];
        if (!matrix.has(a)) matrix.set(a, new Map());
        if (!matrix.has(b)) matrix.set(b, new Map());
        matrix.get(a).set(b, (matrix.get(a).get(b) || 0) + 1);
        matrix.get(b).set(a, (matrix.get(b).get(a) || 0) + 1);
      }
    }
  }

  return matrix;
}

/**
 * Gợi ý Top sản phẩm thường mua kèm theo danh sách sản phẩm trong giỏ hàng hiện tại.
 */
export function recommendCrossSellProducts({
  cartProductIds = [],
  coOccurrenceMap = new Map(),
  products = [],
  limit = 4,
} = {}) {
  const cartSet = new Set((cartProductIds || []).map((id) => String(id).trim()).filter(Boolean));
  const scores = new Map();

  for (const cartId of cartSet) {
    const neighbors = coOccurrenceMap.get(cartId);
    if (!neighbors) continue;
    for (const [otherId, count] of neighbors.entries()) {
      if (cartSet.has(otherId)) continue;
      scores.set(otherId, (scores.get(otherId) || 0) + count);
    }
  }

  const productById = new Map();
  const productByCode = new Map();
  for (const p of products || []) {
    if (!p || p.trang_thai === "deleted" || p.trang_thai === "ngung_kinh_doanh") continue;
    if (Number(p.so_luong ?? 0) <= 0) continue;
    if (p._id) productById.set(String(p._id), p);
    if (p.ma_sp) productByCode.set(String(p.ma_sp), p);
  }

  const ranked = [...scores.entries()]
    .map(([key, coCount]) => {
      const sp = productById.get(key) || productByCode.get(key);
      if (!sp) return null;
      return {
        san_pham_id: String(sp._id),
        ma_sp: sp.ma_sp || "",
        ten_sp: sp.ten_sp || "Sản phẩm",
        don_gia: Number(sp.don_gia || 0),
        gia_von: Number(sp.gia_von || 0),
        so_luong_ton: Number(sp.so_luong || 0),
        coOccurrenceCount: coCount,
        reason: `Thường mua kèm (${coCount} đơn)`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount)
    .slice(0, limit);

  return ranked;
}

/**
 * Margin Guard — Kiểm tra biên lợi nhuận ước tính của giỏ hàng sau chiết khấu/voucher.
 * Cảnh báo ngay khi giảm giá làm biên lợi nhuận ròng xuống dưới ngưỡng an toàn hoặc bị lỗ.
 */
export function evaluateCartMarginGuard({
  items = [],
  discountAmount = 0,
  minMarginPct = 10,
} = {}) {
  let grossSubtotal = 0;
  let totalCost = 0;
  let hasEstimatedCost = false;

  for (const item of items || []) {
    const qty = Math.max(0, Number(item?.so_luong ?? item?.qty ?? 0));
    const unitPrice = Math.max(0, Number(item?.don_gia ?? item?.price ?? 0));
    if (qty <= 0) continue;

    grossSubtotal += qty * unitPrice;
    const explicitCost = Number(item?.gia_von ?? item?.cost ?? 0);
    if (explicitCost > 0) {
      totalCost += qty * explicitCost;
    } else {
      hasEstimatedCost = true;
      totalCost += qty * Math.round(unitPrice * 0.55);
    }
  }

  const cleanDiscount = Math.max(0, Number(discountAmount || 0));
  const netRevenue = Math.max(0, grossSubtotal - cleanDiscount);
  const grossProfit = netRevenue - totalCost;
  const marginPct = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 1000) / 10 : 0;

  // Tính mức chiết khấu tối đa để vẫn giữ biên lợi nhuận >= minMarginPct
  // (grossSubtotal - maxDiscount - totalCost) / (grossSubtotal - maxDiscount) >= minMarginPct/100
  const minRatio = Math.min(0.9, Math.max(0, Number(minMarginPct || 10) / 100));
  const minAllowedRevenue = minRatio < 1 ? totalCost / (1 - minRatio) : totalCost;
  const maxSafeDiscount = Math.max(0, Math.floor(grossSubtotal - minAllowedRevenue));

  let status = "HEALTHY";
  let warningMessage = null;
  if (netRevenue > 0 && grossProfit < 0) {
    status = "LOSS";
    warningMessage = `CẢNH BÁO LỖ: Giảm giá vượt giá vốn, đơn hàng dự kiến lỗ ${Math.abs(Math.round(grossProfit)).toLocaleString("vi-VN")} đ (${marginPct}%).`;
  } else if (netRevenue > 0 && marginPct < minMarginPct) {
    status = "LOW_MARGIN";
    warningMessage = `Biên lợi nhuận mỏng (${marginPct}% < ngưỡng ${minMarginPct}%). Mức giảm giá an toàn tối đa: ${maxSafeDiscount.toLocaleString("vi-VN")} đ.`;
  }

  return {
    status, // "HEALTHY" | "LOW_MARGIN" | "LOSS"
    grossSubtotal: Math.round(grossSubtotal),
    discountAmount: Math.round(cleanDiscount),
    netRevenue: Math.round(netRevenue),
    totalCost: Math.round(totalCost),
    grossProfit: Math.round(grossProfit),
    marginPct,
    minMarginPct,
    maxSafeDiscount,
    hasEstimatedCost,
    warningMessage,
  };
}
