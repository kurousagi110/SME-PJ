// Phase 5: 2026-07-09 | Refactor — tách constants + utility functions ra khỏi donHangDAO
// donHangDAO.js giảm từ 1050 → ~970 dòng, dễ đọc & test hơn.

import { ObjectId } from "mongodb";

/* ── Status constants ─────────────────────────────────────────────────────── */
export const STATUS = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  PAID: "paid",
  SHIPPING: "shipping",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DELETED: "deleted",
};

/* ── Order type constants ─────────────────────────────────────────────────── */
export const ORDER_TYPE = {
  SALE: "sale",
  PROD_RECEIPT: "prod_receipt",
  PURCHASE_RECEIPT: "purchase_receipt",
};

/* ── Item type constants ──────────────────────────────────────────────────── */
export const ITEM_TYPE = {
  SAN_PHAM: "san_pham",
  NGUYEN_LIEU: "nguyen_lieu",
};

/* ── Quy tắc hàng hóa được phép theo loại đơn ─────────────────────────────── */
export const ALLOWED_ITEM_TYPES_BY_ORDER_TYPE = {
  [ORDER_TYPE.SALE]:              [ITEM_TYPE.SAN_PHAM],
  [ORDER_TYPE.PROD_RECEIPT]:      [ITEM_TYPE.SAN_PHAM],
  [ORDER_TYPE.PURCHASE_RECEIPT]:  [ITEM_TYPE.SAN_PHAM, ITEM_TYPE.NGUYEN_LIEU],
};

/* ── Workflow transitions ─────────────────────────────────────────────────── */
export const ALLOWED_TRANSITIONS_BY_TYPE = {
  [ORDER_TYPE.SALE]: {
    // Cho phép đi tắt confirmed → completed
    [STATUS.DRAFT]:     [STATUS.CONFIRMED, STATUS.CANCELLED],
    [STATUS.CONFIRMED]: [STATUS.PAID, STATUS.COMPLETED, STATUS.CANCELLED],
    [STATUS.PAID]:      [STATUS.SHIPPING, STATUS.CANCELLED],
    [STATUS.SHIPPING]:  [STATUS.COMPLETED],
    [STATUS.COMPLETED]: [],
    [STATUS.CANCELLED]: [],
  },
  [ORDER_TYPE.PROD_RECEIPT]: {
    [STATUS.DRAFT]:     [STATUS.CONFIRMED, STATUS.CANCELLED],
    [STATUS.CONFIRMED]: [STATUS.COMPLETED, STATUS.CANCELLED],
    [STATUS.COMPLETED]: [],
    [STATUS.CANCELLED]: [],
  },
  [ORDER_TYPE.PURCHASE_RECEIPT]: {
    [STATUS.DRAFT]:     [STATUS.CONFIRMED, STATUS.CANCELLED],
    [STATUS.CONFIRMED]: [STATUS.PAID, STATUS.COMPLETED, STATUS.CANCELLED],
    [STATUS.PAID]:      [STATUS.COMPLETED, STATUS.CANCELLED],
    [STATUS.COMPLETED]: [],
    [STATUS.CANCELLED]: [],
  },
};

/* ── Utilities ────────────────────────────────────────────────────────────── */
// escapeRegex is now sourced exclusively from ../utils/escapeRegex.js —
// keep this module focused on domain constants only.

export function toObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  const s = String(id);
  return ObjectId.isValid(s) ? new ObjectId(s) : null;
}
