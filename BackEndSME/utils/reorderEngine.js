/**
 * reorderEngine.js — Tính toán đặt hàng lại tự động (Auto-Reorder)
 * - Lọc nguyên vật liệu có tồn kho <= tồn tối thiểu (`ton_toi_thieu > 0`)
 * - Loại trừ vật tư đã có đơn mua hàng đang chờ duyệt / đang nhập
 * - Tính SL đặt = max(ton_toi_thieu * 2 - so_luong, MOQ)
 * - Nhóm theo nhà cung cấp gần nhất để tạo đơn nháp (chờ duyệt tại /approvals)
 */

const PENDING_PO_STATUSES = new Set(["draft", "pending", "cho_duyet", "approved", "ordered"]);

export function buildPendingMaterialIds(pendingPurchaseOrders = []) {
  const ids = new Set();
  const codes = new Set();

  for (const po of pendingPurchaseOrders) {
    if (!po) continue;
    if (po.trang_thai && !PENDING_PO_STATUSES.has(String(po.trang_thai).toLowerCase())) {
      continue;
    }
    for (const line of po.san_pham || []) {
      if (line?.nguyen_lieu_id) ids.add(String(line.nguyen_lieu_id));
      if (line?.ma_nl) codes.add(String(line.ma_nl).trim().toUpperCase());
    }
  }
  return { ids, codes };
}

export function buildLatestSupplierByMaterial(recentPurchaseOrders = []) {
  const sorted = [...recentPurchaseOrders].sort((a, b) => {
    const ta = new Date(a?.created_at || a?.ngay_dat || 0).getTime();
    const tb = new Date(b?.created_at || b?.ngay_dat || 0).getTime();
    return tb - ta;
  });

  const byId = new Map();
  const byCode = new Map();

  for (const po of sorted) {
    const supplier = String(po?.nha_cung_cap_ten || po?.nha_cung_cap?.ten || "").trim();
    if (!supplier) continue;
    for (const line of po?.san_pham || []) {
      const id = line?.nguyen_lieu_id ? String(line.nguyen_lieu_id) : "";
      const code = line?.ma_nl ? String(line.ma_nl).trim().toUpperCase() : "";
      if (id && !byId.has(id)) byId.set(id, supplier);
      if (code && !byCode.has(code)) byCode.set(code, supplier);
    }
  }
  return { byId, byCode };
}

export function computeReorderQty(material) {
  const stock = Number(material?.so_luong ?? 0);
  const minStock = Number(material?.ton_toi_thieu ?? 0);
  if (!Number.isFinite(minStock) || minStock <= 0) return 0;
  if (stock > minStock) return 0;

  const moq = Math.max(1, Number(material?.moq ?? material?.so_luong_dat_toi_thieu ?? 1) || 1);
  const desired = minStock * 2 - stock;
  return Math.max(1, Math.ceil(Math.max(desired, moq)));
}

export function planAutoReorderBatches({
  materials = [],
  pendingPurchaseOrders = [],
  recentPurchaseOrders = [],
  defaultSupplier = "Nhà cung cấp tổng hợp",
} = {}) {
  const pending = buildPendingMaterialIds(pendingPurchaseOrders);
  const latestSuppliers = buildLatestSupplierByMaterial(recentPurchaseOrders);
  const groups = new Map();
  let skippedDuplicateCount = 0;
  let totalItems = 0;

  for (const mat of materials) {
    if (!mat) continue;
    const status = String(mat.trang_thai || "active").toLowerCase();
    if (status === "deleted" || status === "inactive") continue;

    const qty = computeReorderQty(mat);
    if (qty <= 0) continue;

    const id = String(mat._id || "");
    const code = String(mat.ma_nl || "").trim().toUpperCase();
    if ((id && pending.ids.has(id)) || (code && pending.codes.has(code))) {
      skippedDuplicateCount++;
      continue;
    }

    const supplier =
      (id && latestSuppliers.byId.get(id)) ||
      (code && latestSuppliers.byCode.get(code)) ||
      String(mat.nha_cung_cap_ten || "").trim() ||
      defaultSupplier;

    if (!groups.has(supplier)) groups.set(supplier, []);
    groups.get(supplier).push({
      nguyen_lieu_id: id,
      ma_nl: mat.ma_nl,
      ten_nl: mat.ten_nl,
      so_luong: qty,
      don_gia: Number(mat.gia_nhap || 0),
      nha_cung_cap_ten: supplier,
    });
    totalItems++;
  }

  const batches = Array.from(groups.entries()).map(([nha_cung_cap_ten, items]) => ({
    nha_cung_cap_ten,
    items,
  }));

  return { batches, skippedDuplicateCount, totalItems };
}
