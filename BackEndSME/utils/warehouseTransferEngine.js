/**
 * Multi-Warehouse, Bin Location & Internal Stock Transfer Engine (Pure Logic).
 */

export const DEFAULT_WAREHOUSES = [
  {
    code: "KHO-TONG",
    name: "Kho Tổng Thành Phẩm",
    type: "finished_goods",
    address: "Khu A — Kho chính trung tâm",
    manager_name: "Thủ kho chính",
    is_default_sale: true,
    is_active: true,
  },
  {
    code: "KHO-XUONG",
    name: "Kho Xưởng Nguyên Vật Liệu",
    type: "raw_material",
    address: "Khu B — Xưởng sản xuất",
    manager_name: "Quản đốc xưởng",
    is_default_production: true,
    is_active: true,
  },
  {
    code: "KHO-SHOWROOM",
    name: "Kho Cửa Hàng / POS Showroom",
    type: "retail",
    address: "Tầng 1 — Showroom trưng bày & POS",
    manager_name: "Trưởng quầy POS",
    is_active: true,
  },
  {
    code: "KHO-QC",
    name: "Kho Kiểm Định QC & Hàng Lỗi",
    type: "quarantine",
    address: "Khu C — Cách ly kiểm định & RMA",
    manager_name: "Phụ trách QC",
    is_active: true,
  },
];

export const TRANSFER_STATUS = {
  DRAFT: "draft",
  IN_TRANSIT: "in_transit",
  RECEIVED: "received",
  CANCELLED: "cancelled",
};

export const ALLOWED_TRANSFER_TRANSITIONS = {
  [TRANSFER_STATUS.DRAFT]: [TRANSFER_STATUS.IN_TRANSIT, TRANSFER_STATUS.CANCELLED],
  [TRANSFER_STATUS.IN_TRANSIT]: [TRANSFER_STATUS.RECEIVED, TRANSFER_STATUS.CANCELLED],
  [TRANSFER_STATUS.RECEIVED]: [],
  [TRANSFER_STATUS.CANCELLED]: [],
};

export function canTransitionTransfer(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSFER_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Kiểm tra tính hợp lệ của phiếu điều chuyển kho và đối chiếu tồn kho nguồn.
 */
export function validateTransferDraft({
  fromWarehouse,
  toWarehouse,
  items = [],
  sourceStockMap = new Map(),
}) {
  const from = String(fromWarehouse || "").trim().toUpperCase();
  const to = String(toWarehouse || "").trim().toUpperCase();

  if (!from || !to) {
    return { valid: false, message: "Vui lòng chọn đầy đủ Kho xuất và Kho nhập" };
  }
  if (from === to) {
    return { valid: false, message: "Kho xuất và Kho nhập không được trùng nhau" };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, message: "Phiếu chuyển kho cần ít nhất 1 mặt hàng" };
  }

  const normalizedItems = [];
  const shortages = [];

  for (const raw of items) {
    const itemId = String(raw.item_id || raw.san_pham_id || raw.nguyen_lieu_id || "").trim();
    const itemType = raw.item_type === "nguyen_lieu" ? "nguyen_lieu" : "san_pham";
    const qty = Math.max(0, Number(raw.quantity ?? raw.so_luong ?? 0));

    if (!itemId || qty <= 0) {
      return { valid: false, message: "Mỗi dòng hàng chuyển kho cần có mã hàng hợp lệ và số lượng > 0" };
    }

    const available = Number(sourceStockMap.get(`${itemType}:${itemId}`) ?? 0);
    if (available < qty) {
      shortages.push({
        item_id: itemId,
        item_code: raw.item_code || raw.ma_sp || raw.ma_nl || itemId,
        item_name: raw.item_name || raw.ten_sp || raw.ten_nl || "",
        requested: qty,
        available,
      });
    }

    normalizedItems.push({
      item_id: itemId,
      item_type: itemType,
      item_code: String(raw.item_code || raw.ma_sp || raw.ma_nl || "").trim(),
      item_name: String(raw.item_name || raw.ten_sp || raw.ten_nl || "").trim(),
      unit: String(raw.unit || raw.don_vi || "cái").trim(),
      quantity: qty,
      from_bin: String(raw.from_bin || "").trim(),
      to_bin: String(raw.to_bin || "").trim(),
    });
  }

  if (shortages.length > 0) {
    const first = shortages[0];
    return {
      valid: false,
      code: "INSUFFICIENT_SOURCE_STOCK",
      message: `Kho xuất ${from} không đủ tồn cho "${first.item_name || first.item_code}" (cần ${first.requested}, hiện có ${first.available})`,
      shortages,
    };
  }

  return { valid: true, from_warehouse: from, to_warehouse: to, items: normalizedItems };
}

/**
 * Tính chênh lệch giữa số lượng xuất chuyển và số lượng thực nhận tại kho đích.
 */
export function computeTransferReceiptDelta(dispatchedItems = [], receivedOverrides = []) {
  const overrideMap = new Map();
  for (const r of Array.isArray(receivedOverrides) ? receivedOverrides : []) {
    const key = `${r.item_type || "san_pham"}:${String(r.item_id)}`;
    overrideMap.set(key, Math.max(0, Number(r.received_qty ?? r.so_luong_nhan ?? 0)));
  }

  let totalDispatched = 0;
  let totalReceived = 0;
  let totalLoss = 0;

  const lines = (Array.isArray(dispatchedItems) ? dispatchedItems : []).map((it) => {
    const key = `${it.item_type || "san_pham"}:${String(it.item_id)}`;
    const dispatched = Math.max(0, Number(it.quantity || 0));
    const received = overrideMap.has(key) ? Math.min(dispatched, overrideMap.get(key)) : dispatched;
    const loss = Math.max(0, dispatched - received);

    totalDispatched += dispatched;
    totalReceived += received;
    totalLoss += loss;

    return {
      ...it,
      dispatched_qty: dispatched,
      received_qty: received,
      loss_qty: loss,
    };
  });

  return {
    lines,
    total_dispatched: totalDispatched,
    total_received: totalReceived,
    total_loss: totalLoss,
    has_discrepancy: totalLoss > 0,
  };
}
