// Refactor 2026-07-09: tách shared state của donHangDAO ra file riêng.
// Tất cả module con (CRUD/Inventory/Status/Reports) đều đọc từ `state` ở đây.
// KHÔNG reassign state.X bên ngoài `setState` — sẽ phá vỡ các module khác.

import logger from "../utils/logger.js";

/**
 * Shared collection handles + initialized flag.
 * Inject qua `setState(...)` từ DonHangDAO.injectDB (facade) hoặc từ test setup.
 */
export const state = {
  don_hang: null,
  san_pham_col: null,
  nguyen_lieu_col: null,
  bom_col: null,
  users_col: null,
};

export function setState({ don_hang, san_pham_col, nguyen_lieu_col, bom_col, users_col }) {
  if (don_hang)      state.don_hang = don_hang;
  if (san_pham_col)  state.san_pham_col = san_pham_col;
  if (nguyen_lieu_col) state.nguyen_lieu_col = nguyen_lieu_col;
  if (bom_col)       state.bom_col = bom_col;
  if (users_col)     state.users_col = users_col;
}

/**
 * Tạo indexes cho các collection liên quan. Được gọi 1 lần khi injectDB.
 * Phase 2 fix: merge 4 text indexes của don_hang thành 1 (MongoDB chỉ cho phép
 * 1 text index / collection). Nếu collection đã có text index thì skip để
 * tránh lỗi "text index already exists".
 */
export async function injectIndexes(db) {
  const don_hang = db.collection("don_hang");
  const bom_col  = db.collection("bom_san_pham");

  // BOM indexes
  await bom_col.createIndex({ san_pham_id: 1 }, { unique: true });
  await bom_col.createIndex({ "items.nguyen_lieu_id": 1 });

  // don_hang indexes
  await don_hang.createIndex({ ma_dh: 1 }, { unique: true });
  await don_hang.createIndex({ loai_don: 1 });
  await don_hang.createIndex({ trang_thai: 1 });
  await don_hang.createIndex({ created_at: -1 });
  await don_hang.createIndex({ khach_hang_ten: 1 });
  await don_hang.createIndex({ nha_cung_cap_ten: 1 });
  await don_hang.createIndex({ nguoi_lap_id: 1 });

  // Text index — check trước khi tạo
  const existingIndexes = await don_hang.indexes();
  const hasTextIndex = existingIndexes.some(
    (i) => i.key?._fts || Object.values(i.key || {}).includes("text")
  );
  if (!hasTextIndex) {
    await don_hang.createIndex(
      {
        "san_pham.ten_sp": "text",
        "san_pham.ten_nl": "text",
        khach_hang_ten:    "text",
        nha_cung_cap_ten:  "text",
      },
      { name: "search_text", default_language: "none" }
    );
  }

  logger.info("[donHangState] Indexes ensured");
}
