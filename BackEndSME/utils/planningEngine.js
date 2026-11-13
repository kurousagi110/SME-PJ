/**
 * Pure Planning Engine Helpers (zero external dependencies)
 * - ATP (Available-to-Promise) delivery estimator
 * - Supplier Scorecard & Recommendation
 */

/**
 * Ước tính khả năng đáp ứng đơn hàng & ngày giao dự kiến (ATP).
 */
export function computeAtpEstimate({
  items = [],
  productMap = new Map(),
  bomMap = new Map(),
  materialMap = new Map(),
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
    const missingMaterials = [];

    if (bom && Array.isArray(bom.nguyen_lieu)) {
      for (const nlReq of bom.nguyen_lieu) {
        const nlId = String(nlReq.nguyen_lieu_id || nlReq.material_id || "");
        const mat = materialMap.get(nlId) || {};
        const matStock = Math.max(0, Number(mat.so_luong ?? mat.ton_kho ?? 0));
        const needed = shortfall * Math.max(0, Number(nlReq.so_luong || 0));
        if (matStock < needed) {
          needsMaterialPurchase = true;
          missingMaterials.push({
            nguyen_lieu_id: nlId,
            ten_nl: mat.ten_nl || nlReq.ten_nl || "Nguyên vật liệu",
            can: needed,
            ton_kho: matStock,
            thieu: Math.round((needed - matStock) * 100) / 100,
          });
        }
      }
    }

    const queueDelay = Math.floor(Math.max(0, Number(activeProductionCount) || 0) / 3);
    const prodDays = Math.max(2, Math.ceil(shortfall / 20) + queueDelay);
    const materialLeadDays = missingMaterials.length > 0 ? 5 : 0;
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
    const supplierName = String(po.doi_tac?.ten || po.nha_cung_cap?.ten || "").trim().toLowerCase();
    const key = supplierId || supplierName;
    if (!key) continue;

    const current = statsBySupplier.get(key) || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalSpend: 0,
      onTimeOrders: 0,
    };

    current.totalOrders += 1;
    if (po.trang_thai === "completed") {
      current.completedOrders += 1;
      current.totalSpend += Number(po.tong_tien || 0);
      // Nếu không quá hạn giao dự kiến thì tính là đúng hạn
      const expected = po.ngay_giao_du_kien ? new Date(po.ngay_giao_du_kien) : null;
      const done = po.updated_at ? new Date(po.updated_at) : null;
      if (!expected || !done || done <= expected) {
        current.onTimeOrders += 1;
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
      score,
      grade,
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}
