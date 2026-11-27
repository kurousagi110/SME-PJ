/**
 * Pure Business Engine for CRM Sales Pipeline, RFQ Matrix, 3-Way Matching & Vendor Scorecard.
 */

export const CRM_STAGES = [
  { code: "lead", label: "Tiềm năng (Lead)", defaultProbability: 15 },
  { code: "qualified", label: "Đủ điều kiện (Qualified)", defaultProbability: 35 },
  { code: "proposal", label: "Đã gửi Báo giá", defaultProbability: 60 },
  { code: "negotiation", label: "Đàm phán hợp đồng", defaultProbability: 80 },
  { code: "won", label: "Chốt thắng (Won)", defaultProbability: 100 },
  { code: "lost", label: "Thất bại (Lost)", defaultProbability: 0 },
];

export const VALID_CRM_STAGE_CODES = CRM_STAGES.map((s) => s.code);

export function getDefaultProbabilityForStage(stageCode) {
  const found = CRM_STAGES.find((s) => s.code === stageCode);
  return found ? found.defaultProbability : 15;
}

/**
 * Tổng hợp KPI phễu bán hàng CRM Pipeline (doanh thu dự kiến, weighted forecast, win rate, lịch chăm sóc quá hạn).
 */
export function computePipelineMetrics(opportunities = [], now = new Date()) {
  const currentTime = now instanceof Date ? now : new Date(now);
  const byStage = {};
  for (const s of CRM_STAGES) {
    byStage[s.code] = { code: s.code, label: s.label, count: 0, total_value: 0, weighted_value: 0 };
  }

  let openValue = 0;
  let weightedForecast = 0;
  let wonCount = 0;
  let wonValue = 0;
  let lostCount = 0;
  let overdueFollowUps = 0;

  for (const opp of Array.isArray(opportunities) ? opportunities : []) {
    const stage = VALID_CRM_STAGE_CODES.includes(opp.stage) ? opp.stage : "lead";
    const value = Math.max(0, Number(opp.expected_value || 0));
    const prob = Math.min(100, Math.max(0, Number(opp.probability ?? getDefaultProbabilityForStage(stage))));
    const weighted = Math.round((value * prob) / 100);

    byStage[stage].count += 1;
    byStage[stage].total_value += value;
    byStage[stage].weighted_value += weighted;

    if (stage === "won") {
      wonCount += 1;
      wonValue += value;
    } else if (stage === "lost") {
      lostCount += 1;
    } else {
      openValue += value;
      weightedForecast += weighted;
      if (opp.next_follow_up && new Date(opp.next_follow_up) < currentTime) {
        overdueFollowUps += 1;
      }
    }
  }

  const closedTotal = wonCount + lostCount;
  const winRatePct = closedTotal > 0 ? Math.round((wonCount / closedTotal) * 1000) / 10 : 0;

  return {
    total_opportunities: (opportunities || []).length,
    open_pipeline_value: Math.round(openValue),
    weighted_forecast_value: Math.round(weightedForecast),
    won_count: wonCount,
    won_value: Math.round(wonValue),
    lost_count: lostCount,
    win_rate_pct: winRatePct,
    overdue_follow_ups: overdueFollowUps,
    stages: CRM_STAGES.map((s) => byStage[s.code]),
  };
}

/**
 * So sánh và xếp hạng báo giá từ nhiều nhà cung cấp trong cùng 1 RFQ.
 * Trọng số đề xuất: Giá cạnh tranh (65%) + Thời gian giao nhanh (25%) + Hạn thanh toán linh hoạt (10%).
 */
export function rankRfqVendorQuotes(quotes = []) {
  if (!Array.isArray(quotes) || quotes.length === 0) return [];

  const normalized = quotes.map((q) => ({
    ...q,
    total_price: Math.max(0, Number(q.total_price || 0)),
    lead_time_days: Math.max(1, Number(q.lead_time_days || 7)),
    payment_terms_days: Math.max(0, Number(q.payment_terms_days || 0)),
  }));

  const validPrices = normalized.map((q) => q.total_price).filter((p) => p > 0);
  const minPrice = validPrices.length ? Math.min(...validPrices) : 1;
  const minLead = Math.min(...normalized.map((q) => q.lead_time_days));
  const maxTerms = Math.max(1, ...normalized.map((q) => q.payment_terms_days));

  const scored = normalized.map((q) => {
    const priceScore = q.total_price > 0 ? Math.min(100, (minPrice / q.total_price) * 100) : 0;
    const speedScore = Math.min(100, (minLead / q.lead_time_days) * 100);
    const termsScore = Math.min(100, (q.payment_terms_days / maxTerms) * 100);
    const compositeScore = Math.round((priceScore * 0.65 + speedScore * 0.25 + termsScore * 0.1) * 10) / 10;

    return {
      ...q,
      is_lowest_price: q.total_price > 0 && q.total_price === minPrice,
      is_fastest: q.lead_time_days === minLead,
      composite_score: compositeScore,
    };
  });

  scored.sort((a, b) => b.composite_score - a.composite_score);
  return scored.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    is_recommended: idx === 0,
  }));
}

/**
 * Đối soát 3 chiều (3-Way Matching): Đơn mua (PO) ↔ Phiếu nhập kho (GRN) ↔ Hóa đơn NCC (Invoice).
 */
export function evaluateThreeWayMatch({
  poQty = 0,
  poUnitPrice = 0,
  receivedQty = 0,
  invoicedQty = 0,
  invoicedUnitPrice = 0,
  priceTolerancePct = 2,
} = {}) {
  const poQ = Math.max(0, Number(poQty) || 0);
  const recQ = Math.max(0, Number(receivedQty) || 0);
  const invQ = Math.max(0, Number(invoicedQty) || 0);
  const poP = Math.max(0, Number(poUnitPrice) || 0);
  const invP = Math.max(0, Number(invoicedUnitPrice) || 0);

  const qtyMatched = invQ <= recQ && recQ <= poQ && invQ === recQ;
  const priceVariance = Math.round(invP - poP);
  const priceVariancePct = poP > 0 ? Math.round((Math.abs(priceVariance) / poP) * 10000) / 100 : 0;
  const priceMatched = priceVariancePct <= Math.max(0, Number(priceTolerancePct) || 0);

  let status = "MATCHED";
  if (!qtyMatched && !priceMatched) status = "BOTH_MISMATCH";
  else if (!qtyMatched) status = "QTY_MISMATCH";
  else if (!priceMatched) status = "PRICE_MISMATCH";

  return {
    status,
    approved_for_payment: status === "MATCHED",
    po_total: Math.round(poQ * poP),
    received_total: Math.round(recQ * poP),
    invoiced_total: Math.round(invQ * invP),
    qty_variance_vs_receipt: invQ - recQ,
    price_variance: priceVariance,
    price_variance_pct: priceVariancePct,
    message:
      status === "MATCHED"
        ? "Khớp đối soát 3 chiều (PO ↔ Nhập kho ↔ Hóa đơn) — Đủ điều kiện thanh toán"
        : status === "QTY_MISMATCH"
          ? `Lệch số lượng hóa đơn (${invQ}) so với thực nhập kho (${recQ})`
          : status === "PRICE_MISMATCH"
            ? `Đơn giá hóa đơn lệch ${priceVariancePct}% vượt ngưỡng cho phép (${priceTolerancePct}%)`
            : "Lệch cả số lượng thực nhập và đơn giá hóa đơn so với PO",
  };
}

/**
 * Chấm điểm Nhà cung cấp (Vendor Scorecard 0–100) dựa trên:
 * Giao đúng hạn / hoàn tất (40%) + Chất lượng không lỗi (35%) + Khối lượng / Độ ổn định hợp tác (25%).
 */
export function computeVendorScorecardRows(vendorStats = []) {
  return (Array.isArray(vendorStats) ? vendorStats : [])
    .map((v) => {
      const totalOrders = Math.max(0, Number(v.total_orders || 0));
      const completedOrders = Math.max(0, Number(v.completed_orders || 0));
      const onTimeOrders = Math.max(0, Number(v.on_time_orders ?? completedOrders));
      const defectCount = Math.max(0, Number(v.defect_orders || 0));

      const onTimeRate = totalOrders > 0 ? (onTimeOrders / totalOrders) * 100 : 0;
      const qualityRate = totalOrders > 0 ? Math.max(0, ((totalOrders - defectCount) / totalOrders) * 100) : 100;
      const reliabilityRate = totalOrders > 0 ? Math.min(100, (completedOrders / totalOrders) * 100) : 0;

      const score = Math.round((onTimeRate * 0.4 + qualityRate * 0.35 + reliabilityRate * 0.25) * 10) / 10;
      let grade = "D";
      if (score >= 90) grade = "A";
      else if (score >= 75) grade = "B";
      else if (score >= 60) grade = "C";

      return {
        vendor_name: v.vendor_name || "Nhà cung cấp",
        total_orders: totalOrders,
        completed_orders: completedOrders,
        total_spend: Math.round(Number(v.total_spend || 0)),
        on_time_rate: Math.round(onTimeRate * 10) / 10,
        quality_rate: Math.round(qualityRate * 10) / 10,
        score,
        grade,
      };
    })
    .sort((a, b) => b.score - a.score);
}
