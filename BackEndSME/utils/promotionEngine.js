/**
 * Pure Business Logic Engine for Promotions, Loyalty Points & POS Shift Reconciliation.
 * Không phụ thuộc trực tiếp MongoDB để dễ dàng unit test và tái sử dụng.
 */

export const DEFAULT_PROMOTIONS = [
  {
    code: "SME5",
    name: "Ưu đãi khách hàng thân thiết 5%",
    type: "percent", // "percent" | "fixed" | "freeship"
    value: 5,
    max_discount: 0, // 0 = không giới hạn
    min_order_amount: 0,
    max_usage: 0, // 0 = không giới hạn
    per_customer_limit: 0,
    customer_groups: [], // rỗng = áp dụng mọi nhóm
    is_active: true,
    description: "Áp dụng giảm 5% giá trị đơn hàng",
  },
  {
    code: "SME10",
    name: "Ưu đãi đơn hàng B2B 10%",
    type: "percent",
    value: 10,
    max_discount: 0,
    min_order_amount: 10_000_000,
    max_usage: 0,
    per_customer_limit: 0,
    customer_groups: [],
    is_active: true,
    description: "Áp dụng giảm 10% giá trị đơn hàng từ 10.000.000 đ (Ưu đãi B2B)",
  },
  {
    code: "VIP50K",
    name: "Voucher giảm ngay 50.000 đ",
    type: "fixed",
    value: 50_000,
    max_discount: 50_000,
    min_order_amount: 0,
    max_usage: 0,
    per_customer_limit: 0,
    customer_groups: [],
    is_active: true,
    description: "Áp dụng voucher giảm ngay 50.000 đ",
  },
  {
    code: "FREESHIP",
    name: "Hỗ trợ phí vận chuyển 30.000 đ",
    type: "freeship",
    value: 30_000,
    max_discount: 30_000,
    min_order_amount: 0,
    max_usage: 0,
    per_customer_limit: 0,
    customer_groups: [],
    is_active: true,
    description: "Hỗ trợ phí vận chuyển 30.000 đ",
  },
];

export const DEFAULT_LOYALTY_CONFIG = {
  enabled: true,
  vnd_per_point: 10_000, // 10.000 đ = 1 điểm
  vnd_per_redeem_point: 1_000, // 1 điểm = 1.000 đ khi quy đổi
  max_redeem_pct: 50, // tối đa giảm 50% giá trị đơn hàng bằng điểm
  tier_silver: 500,
  tier_gold: 2_000,
  tier_platinum: 5_000,
};

/**
 * Kiểm tra điều kiện hợp lệ và tính số tiền giảm của một chương trình khuyến mãi.
 */
export function evaluatePromotion(
  promo,
  {
    orderAmount = 0,
    customerGroup = "",
    customerUsedCount = 0,
    now = new Date(),
  } = {}
) {
  if (!promo || !promo.is_active || promo.trang_thai === "deleted") {
    return {
      valid: false,
      code: "INVALID_COUPON",
      message: "Mã ưu đãi không hợp lệ hoặc đã ngừng áp dụng",
      discountAmount: 0,
    };
  }

  const amount = Math.max(0, Number(orderAmount) || 0);
  const currentTime = now instanceof Date ? now : new Date(now);

  if (promo.start_date && new Date(promo.start_date) > currentTime) {
    return {
      valid: false,
      code: "COUPON_NOT_STARTED",
      message: "Mã ưu đãi chưa đến thời gian áp dụng",
      discountAmount: 0,
    };
  }

  if (promo.end_date && new Date(promo.end_date) < currentTime) {
    return {
      valid: false,
      code: "COUPON_EXPIRED",
      message: "Mã ưu đãi đã hết hạn sử dụng",
      discountAmount: 0,
    };
  }

  const maxUsage = Number(promo.max_usage || 0);
  const usedCount = Number(promo.used_count || 0);
  if (maxUsage > 0 && usedCount >= maxUsage) {
    return {
      valid: false,
      code: "COUPON_USAGE_EXCEEDED",
      message: "Mã ưu đãi đã hết lượt sử dụng",
      discountAmount: 0,
    };
  }

  const perCustomerLimit = Number(promo.per_customer_limit || 0);
  if (perCustomerLimit > 0 && Number(customerUsedCount || 0) >= perCustomerLimit) {
    return {
      valid: false,
      code: "COUPON_CUSTOMER_LIMIT",
      message: "Khách hàng đã dùng hết số lượt cho phép của mã ưu đãi này",
      discountAmount: 0,
    };
  }

  const minOrder = Number(promo.min_order_amount || 0);
  if (minOrder > 0 && amount < minOrder) {
    return {
      valid: false,
      code: "COUPON_MIN_ORDER",
      message: `Mã ${promo.code} chỉ áp dụng cho đơn hàng từ ${minOrder.toLocaleString("vi-VN")} đ`,
      discountAmount: 0,
    };
  }

  const allowedGroups = Array.isArray(promo.customer_groups) ? promo.customer_groups.filter(Boolean) : [];
  if (allowedGroups.length > 0 && (!customerGroup || !allowedGroups.includes(customerGroup))) {
    return {
      valid: false,
      code: "COUPON_GROUP_RESTRICTED",
      message: `Mã ${promo.code} chỉ áp dụng cho nhóm khách hàng: ${allowedGroups.join(", ")}`,
      discountAmount: 0,
    };
  }

  let discountAmount = 0;
  const type = String(promo.type || "fixed").toLowerCase();
  const value = Math.max(0, Number(promo.value || 0));
  const maxDiscount = Math.max(0, Number(promo.max_discount || 0));

  if (type === "percent") {
    discountAmount = Math.round((amount * Math.min(100, value)) / 100);
    if (maxDiscount > 0) {
      discountAmount = Math.min(discountAmount, maxDiscount);
    }
  } else if (type === "freeship") {
    discountAmount = value;
  } else {
    discountAmount = Math.min(amount, value);
  }

  return {
    valid: true,
    code: promo.code,
    discountAmount: Math.max(0, Math.round(discountAmount)),
    message: promo.description || promo.name || `Áp dụng mã ${promo.code} thành công`,
    type,
  };
}

/**
 * Tính điểm thưởng tích lũy nhận được từ đơn hàng hoàn thành.
 */
export function calculateLoyaltyEarn(netAmount = 0, config = DEFAULT_LOYALTY_CONFIG) {
  const cfg = { ...DEFAULT_LOYALTY_CONFIG, ...(config || {}) };
  if (!cfg.enabled) return 0;
  const unit = Math.max(1, Number(cfg.vnd_per_point) || 10_000);
  const amt = Math.max(0, Number(netAmount) || 0);
  return Math.floor(amt / unit);
}

/**
 * Kiểm tra & quy đổi điểm tích lũy thành tiền giảm giá trên đơn hàng.
 */
export function calculateLoyaltyRedeem(
  pointsToRedeem = 0,
  availablePoints = 0,
  orderAmount = 0,
  config = DEFAULT_LOYALTY_CONFIG
) {
  const cfg = { ...DEFAULT_LOYALTY_CONFIG, ...(config || {}) };
  if (!cfg.enabled) {
    return { valid: false, pointsUsed: 0, discountAmount: 0, message: "Chương trình tích điểm đang tắt" };
  }

  const reqPts = Math.floor(Math.max(0, Number(pointsToRedeem) || 0));
  const availPts = Math.floor(Math.max(0, Number(availablePoints) || 0));
  const amt = Math.max(0, Number(orderAmount) || 0);

  if (reqPts <= 0) {
    return { valid: true, pointsUsed: 0, discountAmount: 0, message: "Không sử dụng điểm" };
  }
  if (reqPts > availPts) {
    return {
      valid: false,
      pointsUsed: 0,
      discountAmount: 0,
      message: `Số điểm khả dụng không đủ (hiện có ${availPts} điểm)`,
    };
  }

  const vndPerPoint = Math.max(1, Number(cfg.vnd_per_redeem_point) || 1_000);
  const maxPct = Math.min(100, Math.max(0, Number(cfg.max_redeem_pct) || 50));
  const maxAllowedDiscount = Math.round((amt * maxPct) / 100);
  const rawDiscount = reqPts * vndPerPoint;

  if (rawDiscount > maxAllowedDiscount) {
    const cappedPoints = Math.floor(maxAllowedDiscount / vndPerPoint);
    return {
      valid: true,
      pointsUsed: cappedPoints,
      discountAmount: cappedPoints * vndPerPoint,
      capped: true,
      message: `Giới hạn tối đa ${maxPct}% giá trị đơn (${cappedPoints} điểm = ${(cappedPoints * vndPerPoint).toLocaleString("vi-VN")} đ)`,
    };
  }

  return {
    valid: true,
    pointsUsed: reqPts,
    discountAmount: rawDiscount,
    capped: false,
    message: `Quy đổi ${reqPts} điểm thành ${rawDiscount.toLocaleString("vi-VN")} đ`,
  };
}

/**
 * Xác định hạng thành viên theo tổng điểm tích lũy trọn đời.
 */
export function determineLoyaltyTier(lifetimePoints = 0, config = DEFAULT_LOYALTY_CONFIG) {
  const cfg = { ...DEFAULT_LOYALTY_CONFIG, ...(config || {}) };
  const pts = Math.max(0, Number(lifetimePoints) || 0);
  if (pts >= Number(cfg.tier_platinum || 5_000)) return { code: "platinum", label: "Bạch Kim" };
  if (pts >= Number(cfg.tier_gold || 2_000)) return { code: "gold", label: "Vàng" };
  if (pts >= Number(cfg.tier_silver || 500)) return { code: "silver", label: "Bạc" };
  return { code: "bronze", label: "Đồng" };
}

/**
 * Tổng hợp kiểm quỹ kết ca thu ngân POS.
 */
export function computePosShiftSummary({
  openingCash = 0,
  transactions = [],
  actualCash = null,
} = {}) {
  const open = Math.max(0, Number(openingCash) || 0);
  let cashSales = 0;
  let transferSales = 0;
  let cashRefunds = 0;
  let orderCount = 0;

  for (const tx of Array.isArray(transactions) ? transactions : []) {
    const amt = Math.max(0, Number(tx.amount) || 0);
    const method = String(tx.payment_method || tx.method || "tien_mat").toLowerCase();
    const kind = String(tx.kind || "sale").toLowerCase();

    if (kind === "refund") {
      if (method === "tien_mat") cashRefunds += amt;
    } else {
      orderCount += 1;
      if (method === "chuyen_khoan" || method === "transfer" || method === "vietqr") {
        transferSales += amt;
      } else {
        cashSales += amt;
      }
    }
  }

  const expectedCash = Math.round(open + cashSales - cashRefunds);
  const totalSales = Math.round(cashSales + transferSales);

  let variance = 0;
  let reconciliationStatus = "open";
  if (actualCash !== null && actualCash !== undefined) {
    const actual = Math.max(0, Number(actualCash) || 0);
    variance = Math.round(actual - expectedCash);
    if (variance === 0) reconciliationStatus = "balanced";
    else if (variance > 0) reconciliationStatus = "over";
    else reconciliationStatus = "short";
  }

  return {
    opening_cash: open,
    order_count: orderCount,
    cash_sales: Math.round(cashSales),
    transfer_sales: Math.round(transferSales),
    cash_refunds: Math.round(cashRefunds),
    total_sales: totalSales,
    expected_cash: expectedCash,
    actual_cash: actualCash !== null && actualCash !== undefined ? Math.max(0, Number(actualCash) || 0) : null,
    variance,
    reconciliation_status: reconciliationStatus,
  };
}
