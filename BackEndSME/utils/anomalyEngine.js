/**
 * anomalyEngine.js — Bộ máy phát hiện bất thường doanh nghiệp (pure module)
 *
 * So sánh chỉ số gần nhất với nền lịch sử (baseline) bằng Z-score / ngưỡng động:
 *  1. Phế phẩm QC sản xuất tăng đột biến (scrap rate)
 *  2. Doanh thu ngày/tuần sụt giảm mạnh so với trung bình 30 ngày
 *  3. Đơn bán hàng có tỷ lệ chiết khấu bất thường
 *  4. Phiếu chi vận hành (OPEX) vượt xa mức trung bình
 */

function meanAndStd(values = []) {
  const nums = (values || []).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  if (nums.length === 0) return { mean: 0, std: 0, count: 0 };
  const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
  const variance = nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length;
  return { mean, std: Math.sqrt(variance), count: nums.length };
}

/**
 * Phát hiện bất thường đa phân hệ từ tập số liệu đã truy vấn sẵn.
 */
export function detectEnterpriseAnomalies({
  dailyRevenueSeries = [], // mảng doanh thu theo ngày (cũ -> mới), phần tử cuối là ngày gần nhất
  recentSalesOrders = [],  // các đơn bán trong 24-48h gần nhất
  baselineExpenses = [],   // các phiếu chi OPEX 30 ngày qua
  recentExpenses = [],     // các phiếu chi OPEX 24-48h gần nhất
  productionOrders = [],   // lệnh sản xuất gần đây có ghi nhận sản lượng & phế phẩm
  thresholds = {},
} = {}) {
  const {
    revenueDropPct = 40,       // cảnh báo nếu tụt >= 40% so với trung bình 30 ngày
    discountAlertPct = 25,     // cảnh báo nếu chiết khấu > 25% giá trị đơn
    scrapRateAlertPct = 10,    // cảnh báo nếu tỷ lệ phế phẩm > 10%
    expenseZThreshold = 2.5,   // cảnh báo nếu phiếu chi vượt mean + 2.5*std
  } = thresholds;

  const anomalies = [];

  // 1. Bất thường sụt giảm doanh thu
  if (dailyRevenueSeries.length >= 7) {
    const baseline = dailyRevenueSeries.slice(0, -1);
    const latest = Number(dailyRevenueSeries[dailyRevenueSeries.length - 1] || 0);
    const { mean } = meanAndStd(baseline);
    if (mean > 0) {
      const dropPct = Math.round(((mean - latest) / mean) * 100);
      if (dropPct >= revenueDropPct) {
        anomalies.push({
          type: "REVENUE_DROP",
          severity: dropPct >= 60 ? "critical" : "warning",
          title: "Doanh thu sụt giảm bất thường",
          detail: `Doanh thu gần nhất (${Math.round(latest).toLocaleString("vi-VN")} đ) giảm ${dropPct}% so với trung bình ngày (${Math.round(mean).toLocaleString("vi-VN")} đ).`,
          metric: { latest, baselineMean: Math.round(mean), dropPct },
        });
      }
    }
  }

  // 2. Bất thường tỷ lệ phế phẩm QC trong sản xuất
  let totalProduced = 0;
  let totalScrap = 0;
  for (const po of productionOrders || []) {
    const qty = Number(po.so_luong_san_xuat ?? po.tong_so_luong ?? 0);
    const scrap = Number(po.so_luong_phe_pham ?? po.tong_phe_pham ?? 0);
    if (qty > 0) {
      totalProduced += qty;
      totalScrap += Math.max(0, scrap);
    }
  }
  if (totalProduced > 0) {
    const scrapRate = Math.round((totalScrap / totalProduced) * 1000) / 10;
    if (scrapRate > scrapRateAlertPct) {
      anomalies.push({
        type: "QC_SCRAP_SPIKE",
        severity: scrapRate >= scrapRateAlertPct * 1.5 ? "critical" : "warning",
        title: "Tỷ lệ phế phẩm QC vượt ngưỡng an toàn",
        detail: `Tỷ lệ phế phẩm đạt ${scrapRate}% (${totalScrap}/${totalProduced} sản phẩm), vượt ngưỡng cho phép ${scrapRateAlertPct}%.`,
        metric: { totalProduced, totalScrap, scrapRate },
      });
    }
  }

  // 3. Đơn bán hàng có chiết khấu cao bất thường
  for (const order of recentSalesOrders || []) {
    const subtotal = Number(order.tam_tinh || 0) || Number(order.tong_tien || 0) + Number(order.giam_gia || 0);
    const discount = Number(order.giam_gia || 0);
    if (subtotal <= 0 || discount <= 0) continue;
    const discountPct = Math.round((discount / subtotal) * 1000) / 10;
    if (discountPct > discountAlertPct) {
      anomalies.push({
        type: "ABNORMAL_DISCOUNT",
        severity: discountPct >= 35 ? "critical" : "warning",
        title: `Chiết khấu cao bất thường trên đơn ${order.ma_dh || "N/A"}`,
        detail: `Đơn ${order.ma_dh || ""} áp mức giảm giá ${discountPct}% (${discount.toLocaleString("vi-VN")} đ / ${subtotal.toLocaleString("vi-VN")} đ).`,
        metric: { ma_dh: order.ma_dh || null, discount, subtotal, discountPct },
      });
    }
  }

  // 4. Phiếu chi OPEX đột biến (Z-score trên nền 30 ngày)
  const baseAmounts = (baselineExpenses || [])
    .map((e) => Number(e.so_tien || 0))
    .filter((v) => v > 0);
  if (baseAmounts.length >= 5) {
    const { mean, std } = meanAndStd(baseAmounts);
    const cutoff = Math.max(mean * 2, mean + expenseZThreshold * std);
    for (const exp of recentExpenses || []) {
      const amount = Number(exp.so_tien || 0);
      if (amount > cutoff && amount > 0) {
        const zScore = std > 0 ? Math.round(((amount - mean) / std) * 10) / 10 : 9.9;
        anomalies.push({
          type: "OPEX_SPIKE",
          severity: zScore >= 3.5 || amount >= mean * 3 ? "critical" : "warning",
          title: `Phiếu chi đột biến ${exp.ma_phieu || ""}`.trim(),
          detail: `Khoản chi ${amount.toLocaleString("vi-VN")} đ (${exp.hang_muc || "OPEX"}) cao gấp ${(amount / mean).toFixed(1)}x mức chi trung bình (${Math.round(mean).toLocaleString("vi-VN")} đ).`,
          metric: { ma_phieu: exp.ma_phieu || null, amount, baselineMean: Math.round(mean), zScore },
        });
      }
    }
  }

  const criticalCount = anomalies.filter((a) => a.severity === "critical").length;
  const warningCount = anomalies.filter((a) => a.severity === "warning").length;

  return {
    hasAnomalies: anomalies.length > 0,
    totalAnomalies: anomalies.length,
    criticalCount,
    warningCount,
    anomalies,
  };
}
