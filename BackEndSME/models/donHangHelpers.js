// Refactor 2026-07-09: tách helper functions thuần (no I/O) ra khỏi donHangDAO.
// Tất cả đều stateless — nhận input, trả output, không đụng collection.
// Có thể import riêng từ bất kỳ module nào (CRUD, Inventory, ...).

import {
  STATUS,
  ORDER_TYPE,
  ITEM_TYPE,
  ALLOWED_ITEM_TYPES_BY_ORDER_TYPE,
  ALLOWED_TRANSITIONS_BY_TYPE,
  toObjectId,
} from "./donHangConstants.js";

/* ────────────────── Generators ────────────────── */
export function genOrderCode(prefix = "DH") {
  const d = new Date();
  const ymd =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}

/* ────────────────── Number coercion ────────────────── */
export function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/* ────────────────── Order type helpers ────────────────── */
export function ensureOrderType(loai_don) {
  return Object.values(ORDER_TYPE).includes(loai_don)
    ? loai_don
    : ORDER_TYPE.SALE;
}

export function getAllowedTransitions(loai_don) {
  const type = ensureOrderType(loai_don);
  return (
    ALLOWED_TRANSITIONS_BY_TYPE[type] ||
    ALLOWED_TRANSITIONS_BY_TYPE[ORDER_TYPE.SALE]
  );
}

/* ────────────────── Item normalization ────────────────── */
export function normalizeItems(items = [], orderType) {
  if (!Array.isArray(items)) return [];
  const allowedTypes =
    ALLOWED_ITEM_TYPES_BY_ORDER_TYPE[orderType] || [];

  return items
    .filter(
      (it) => it && (it.san_pham_id || it.ma_sp || it.nguyen_lieu_id || it.ma_nl)
    )
    .map((it) => {
      let loai_hang = it.loai_hang;
      if (!loai_hang) {
        loai_hang = it.nguyen_lieu_id || it.ma_nl ? ITEM_TYPE.NGUYEN_LIEU : ITEM_TYPE.SAN_PHAM;
      }
      if (!allowedTypes.includes(loai_hang)) return null;

      if (loai_hang === ITEM_TYPE.SAN_PHAM) {
        const spId = toObjectId(it.san_pham_id);
        const don_gia = num(it.don_gia ?? it.don_gia_ban ?? it.gia_ban ?? it.don_gia, 0);
        const so_luong = Math.max(0, num(it.so_luong, 0));
        return {
          loai_hang,
          san_pham_id: spId || undefined,
          ma_sp: it.ma_sp || null,
          ten_sp: it.ten_sp || "",
          don_vi: it.don_vi || null,
          don_gia,
          so_luong,
          thuoc_tinh: typeof it.thuoc_tinh === "object" ? it.thuoc_tinh : {},
          thanh_tien: don_gia * so_luong,
        };
      }

      const nlId = toObjectId(it.nguyen_lieu_id);
      const don_gia = num(it.don_gia ?? it.gia_nhap ?? it.don_gia, 0);
      const so_luong = Math.max(0, num(it.so_luong, 0));
      return {
        loai_hang,
        nguyen_lieu_id: nlId || undefined,
        ma_nl: it.ma_nl || null,
        ten_nl: it.ten_nl || it.ten || "",
        don_vi: it.don_vi || null,
        don_gia,
        so_luong,
        thuoc_tinh: typeof it.thuoc_tinh === "object" ? it.thuoc_tinh : {},
        thanh_tien: don_gia * so_luong,
      };
    })
    .filter(Boolean);
}

/* ────────────────── Totals ────────────────── */
export function calcTotals(items, giam_gia = 0, thue_rate = 0, phi_vc = 0) {
  const subtotal = (items || []).reduce((s, it) => s + (Number(it.thanh_tien) || 0), 0);
  const discount = Math.max(0, num(giam_gia, 0));
  const base = Math.max(0, subtotal - discount);
  const taxRate = Math.max(0, num(thue_rate, 0));
  const taxAmount = base * taxRate;
  const shipping = Math.max(0, num(phi_vc, 0));
  const total = Math.max(0, base + taxAmount + shipping);
  return { subtotal, discount, taxRate, taxAmount, shipping, total };
}

/* ────────────────── Create validation ────────────────── */
export function validateCreateByType(dto) {
  const loai_don = ensureOrderType(dto.loai_don);

  if (!dto.nguoi_lap_id) return { error: new Error("Thiếu nguoi_lap_id") };

  if (loai_don === ORDER_TYPE.SALE && !dto.khach_hang_ten) {
    return { error: new Error("Thiếu khach_hang_ten (bán hàng)") };
  }

  if (loai_don === ORDER_TYPE.PURCHASE_RECEIPT && !dto.nha_cung_cap_ten) {
    return { error: new Error("Thiếu nha_cung_cap_ten (nhập mua)") };
  }

  return { ok: true, loai_don };
}

/* ────────────────── BOM from san_pham doc ────────────────── */
// BOM = san_pham.nguyen_lieu (định mức nguyên liệu trên 1 sản phẩm)
export function bomFromSanPhamDoc(sp) {
  const arr = Array.isArray(sp?.nguyen_lieu) ? sp.nguyen_lieu : [];
  return arr
    .map((x) => ({
      ma_nl: x?.ma_nl || x?.maNl || null,
      ten_nl: x?.ten_nl || x?.ten || x?.name || null,
      don_vi: x?.don_vi || x?.unit || null,
      dinh_muc: Number(x?.so_luong ?? x?.dinh_muc ?? x?.qty ?? 0) || 0,
    }))
    .filter((x) => x.ma_nl && x.dinh_muc > 0);
}
