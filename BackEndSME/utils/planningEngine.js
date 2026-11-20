/**
 * Pure Planning Engine Helpers (zero external dependencies)
 * - Demand Forecast v2 (Weighted MA + Outlier Capping + Confidence Bounds)
 * - Historical Supplier/Material Lead Time Estimator
 * - ATP (Available-to-Promise) delivery estimator
 * - Supplier Scorecard & Recommendation
 */

const clamp0 = (v) => Math.max(0, Number(v) || 0);

/**
 * Làm mượt các điểm đột biến (outlier winsorization theo IQR / median)
 * để một tháng Mega Sale không làm sai lệch dự báo các tháng kế tiếp.
 */
function winsorizeOutliers(values = []) {
  if (values.length < 4) return [...values];
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)];
  const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)];
  const iqr = q3 - q1;
  if (iqr <= 0) return [...values];
  const upperFence = q3 + 1.5 * iqr;
  const lowerFence = Math.max(0, q1 - 1.5 * iqr);
  return values.map((v) => Math.min(upperFence, Math.max(lowerFence, v)));
}

/**
 * Dự báo nhu cầu v2:
 * - Làm mượt nhiễu (outlier capping)
 * - Weighted Moving Average (ưu tiên tháng gần nhất: 0.2 / 0.3 / 0.5)
 * - Damped Linear Trend (hệ số giảm chấn 0.5 tránh dự báo bùng nổ)
 * - Khoảng tin cậy (forecast_min / forecast_max) và chỉ số biến động (volatility)
 */
export function computeDemandForecast(monthlyQty = []) {
  const clean = (monthlyQty || []).map(clamp0);
  const n = clean.length;
  if (n === 0) {
    return {
      t1: 0,
      t2: 0,
      t3: 0,
      avg_monthly: 0,
      forecast_min: 0,
      forecast_max: 0,
      std_dev: 0,
      volatility: "low",
      seasonality_index: 1,
    };
  }

  const avgMonthly = clean.reduce((s, v) => s + v, 0) / n;
  if (n < 3) {
    const r = Math.round(avgMonthly);
    return {
      t1: r,
      t2: r,
      t3: r,
      avg_monthly: Math.round(avgMonthly * 10) / 10,
      forecast_min: Math.max(0, Math.floor(avgMonthly * 0.8)),
      forecast_max: Math.ceil(avgMonthly * 1.2),
      std_dev: 0,
      volatility: "low",
      seasonality_index: 1,
    };
  }

  const smoothed = winsorizeOutliers(clean);
  const last3 = smoothed.slice(-3);
  // Weighted Moving Average (ưu tiên tháng gần nhất)
  const wma = last3[0] * 0.2 + last3[1] * 0.3 + last3[2] * 0.5;
  // Xu hướng có giảm chấn (damped slope) tránh ngoại suy quá đà
  const dampedTrend = ((last3[2] - last3[0]) / 2) * 0.5;

  // Hệ số mùa vụ nhẹ nếu có đủ >= 12 tháng lịch sử
  let seasonalityIndex = 1;
  if (n >= 12 && avgMonthly > 0) {
    const sameMonthLastYear = clean[n - 12];
    if (sameMonthLastYear > 0) {
      seasonalityIndex = Math.min(1.4, Math.max(0.7, sameMonthLastYear / avgMonthly));
    }
  }

  const rawT1 = clamp0((wma + dampedTrend) * (0.7 + 0.3 * seasonalityIndex));
  const rawT2 = clamp0(wma + 1.6 * dampedTrend);
  const rawT3 = clamp0(wma + 2.0 * dampedTrend);

  // Độ lệch chuẩn của chuỗi đã làm mượt
  const meanSmoothed = smoothed.reduce((s, v) => s + v, 0) / smoothed.length;
  const variance =
    smoothed.reduce((s, v) => s + (v - meanSmoothed) ** 2, 0) / smoothed.length;
  const stdDev = Math.sqrt(variance);
  const cv = meanSmoothed > 0 ? stdDev / meanSmoothed : 0;

  let volatility = "low";
  if (cv >= 0.45) volatility = "high";
  else if (cv >= 0.2) volatility = "medium";

  const margin = Math.round(stdDev * 1.28); // ~80% confidence band
  const t1 = Math.round(rawT1);

  return {
    t1,
    t2: Math.round(rawT2),
    t3: Math.round(rawT3),
    avg_monthly: Math.round(avgMonthly * 10) / 10,
    forecast_min: Math.max(0, t1 - margin),
    forecast_max: Math.max(t1, t1 + margin),
    std_dev: Math.round(stdDev * 10) / 10,
    volatility,
    seasonality_index: Math.round(seasonalityIndex * 100) / 100,
  };
}

/**
 * Tính thời gian giao hàng trung bình thực tế (Lead Time theo ngày) của từng nguyên vật liệu
 * từ lịch sử đơn mua hàng (purchase_receipt) đã hoàn thành.
 */
export function computeMaterialLeadTimeMap(purchaseOrders = [], defaultLeadDays = 5) {
  const stats = new Map(); // materialId -> { totalDays, count }

  for (const po of purchaseOrders || []) {
    if (!po || po.trang_thai !== "completed") continue;
    const start = po.ngay_dat || po.created_at ? new Date(po.ngay_dat || po.created_at) : null;
    const end = po.updated_at ? new Date(po.updated_at) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const rawDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    if (rawDays < 1 || rawDays > 60) continue;

    for (const line of po.san_pham || []) {
      const nlId = String(line?.nguyen_lieu_id || line?.material_id || "");
      if (!nlId) continue;
      const cur = stats.get(nlId) || { totalDays: 0, count: 0 };
      cur.totalDays += rawDays;
      cur.count += 1;
      stats.set(nlId, cur);
    }
  }

  const leadMap = new Map();
  for (const [nlId, st] of stats.entries()) {
    leadMap.set(nlId, Math.max(1, Math.round(st.totalDays / st.count)) || defaultLeadDays);
  }
  return leadMap;
}

/**
 * Ước tính khả năng đáp ứng đơn hàng & ngày giao dự kiến (ATP).
 */
export function computeAtpEstimate({
  items = [],
  productMap = new Map(),
  bomMap = new Map(),
  materialMap = new Map(),
  materialLeadTimeMap = new Map(),
  defaultMaterialLeadDays = 5,
  activeProductionCount = 0,
  now = new Date(),
}) {
  const details = [];
  let maxDays = 1;
  let allInStock = true;
  let needsMaterialPurchase = false;

  for (const reqItem of items) {
    const spId = String(reqItem.san_pham_id || "");
    const qtyRequested = Math.max(1, Number(reqItem.so_luong || 1));
    const sp = productMap.get(spId) || {};
    const inStock = Math.max(0, Number(sp.so_luong ?? sp.ton_kho ?? 0));
    const shortfall = Math.max(0, qtyRequested - inStock);

    if (shortfall === 0) {
      details.push({
        san_pham_id: spId,
        ten_sp: sp.ten_sp || reqItem.ten_sp || "Sản phẩm",
        yeu_cau: qtyRequested,
        ton_kho: inStock,
        can_san_xuat: 0,
        trang_thai: "du_ton_kho",
        so_ngay_du_kien: 1,
        nvl_thieu: [],
      });
      continue;
    }

    allInStock = false;
    const bom = bomMap.get(spId);
    const bomLines = Array.isArray(bom?.nguyen_lieu)
      ? bom.nguyen_lieu
      : Array.isArray(bom?.items)
      ? bom.items
      : [];
    const missingMaterials = [];
    let maxMaterialLead = 0;

    for (const nlReq of bomLines) {
      const nlId = String(nlReq.nguyen_lieu_id || nlReq.material_id || "");
      const mat = materialMap.get(nlId) || {};
      const matStock = Math.max(0, Number(mat.so_luong ?? mat.ton_kho ?? 0));
      const perUnit = Math.max(0, Number(nlReq.so_luong ?? nlReq.dinh_muc ?? nlReq.qty ?? 0));
      const needed = shortfall * perUnit;
      if (matStock < needed) {
        needsMaterialPurchase = true;
        const leadDays = Number(materialLeadTimeMap?.get(nlId)) || defaultMaterialLeadDays;
        if (leadDays > maxMaterialLead) maxMaterialLead = leadDays;
        missingMaterials.push({
          nguyen_lieu_id: nlId,
          ten_nl: mat.ten_nl || nlReq.ten_nl || nlReq.ten || "Nguyên vật liệu",
          can: needed,
          ton_kho: matStock,
          thieu: Math.round((needed - matStock) * 100) / 100,
          lead_time_days: leadDays,
        });
      }
    }

    const queueDelay = Math.floor(Math.max(0, Number(activeProductionCount) || 0) / 3);
    const prodDays = Math.max(2, Math.ceil(shortfall / 20) + queueDelay);
    const materialLeadDays = missingMaterials.length > 0 ? maxMaterialLead : 0;
    const itemDays = prodDays + materialLeadDays;
    if (itemDays > maxDays) maxDays = itemDays;

    details.push({
      san_pham_id: spId,
      ten_sp: sp.ten_sp || reqItem.ten_sp || "Sản phẩm",
      yeu_cau: qtyRequested,
      ton_kho: inStock,
      can_san_xuat: shortfall,
      trang_thai: missingMaterials.length > 0 ? "cho_nhap_nvl_va_sx" : "can_san_xuat",
      so_ngay_du_kien: itemDays,
      nvl_thieu: missingMaterials,
    });
  }

  const deliveryDate = new Date(now.getTime() + maxDays * 86_400_000);
  const estimatedDeliveryDate = deliveryDate.toISOString().slice(0, 10);

  return {
    canFulfillImmediately: allInStock,
    needsMaterialPurchase,
    estimatedDays: maxDays,
    estimatedDeliveryDate,
    activeProductionQueue: activeProductionCount,
    items: details,
  };
}

/**
 * Chấm điểm Nhà cung cấp (Supplier Scorecard, thang 100).
 */
export function computeSupplierScorecard(suppliers = [], purchaseOrders = []) {
  const statsBySupplier = new Map();

  for (const po of purchaseOrders) {
    const supplierId = String(po.doi_tac_id || po.nha_cung_cap_id || "");
    const supplierName = String(
      po.nha_cung_cap_ten || po.doi_tac?.ten || po.nha_cung_cap?.ten || ""
    )
      .trim()
      .toLowerCase();
    const key = supplierId || supplierName;
    if (!key) continue;

    const current = statsBySupplier.get(key) || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalSpend: 0,
      onTimeOrders: 0,
      totalLeadDays: 0,
      leadSamples: 0,
    };

    current.totalOrders += 1;
    if (po.trang_thai === "completed") {
      current.completedOrders += 1;
      current.totalSpend += Number(po.tong_tien || 0);
      const expected = po.ngay_giao_du_kien ? new Date(po.ngay_giao_du_kien) : null;
      const done = po.updated_at ? new Date(po.updated_at) : null;
      if (!expected || !done || done <= expected) {
        current.onTimeOrders += 1;
      }
      const created = po.ngay_dat || po.created_at ? new Date(po.ngay_dat || po.created_at) : null;
      if (created && done && done >= created) {
        const days = Math.round((done.getTime() - created.getTime()) / 86_400_000);
        if (days >= 1 && days <= 60) {
          current.totalLeadDays += days;
          current.leadSamples += 1;
        }
      }
    } else if (po.trang_thai === "cancelled" || po.trang_thai === "rejected") {
      current.cancelledOrders += 1;
    }

    statsBySupplier.set(key, current);
  }

  const scored = suppliers.map((sup) => {
    const idKey = String(sup._id || "");
    const nameKey = String(sup.ten_doi_tac || sup.ten || "").trim().toLowerCase();
    const st = statsBySupplier.get(idKey) || statsBySupplier.get(nameKey) || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalSpend: 0,
      onTimeOrders: 0,
      totalLeadDays: 0,
      leadSamples: 0,
    };

    const completionRate =
      st.totalOrders > 0 ? Math.round((st.completedOrders / st.totalOrders) * 100) : 80;
    const onTimeRate =
      st.completedOrders > 0 ? Math.round((st.onTimeOrders / st.completedOrders) * 100) : 85;
    const volumeBonus = Math.min(15, st.completedOrders * 3);

    const rawScore = Math.round(completionRate * 0.45 + onTimeRate * 0.4 + volumeBonus);
    const score = Math.min(100, Math.max(30, rawScore));

    let grade = "C";
    if (score >= 90) grade = "S";
    else if (score >= 80) grade = "A";
    else if (score >= 65) grade = "B";

    return {
      _id: sup._id,
      ma_doi_tac: sup.ma_doi_tac || null,
      ten_doi_tac: sup.ten_doi_tac || sup.ten || "Nhà cung cấp",
      so_dien_thoai: sup.so_dien_thoai || null,
      totalOrders: st.totalOrders,
      completedOrders: st.completedOrders,
      totalSpend: st.totalSpend,
      completionRate,
      onTimeRate,
      avgLeadTimeDays: st.leadSamples > 0 ? Math.round(st.totalLeadDays / st.leadSamples) : null,
      score,
      grade,
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}
