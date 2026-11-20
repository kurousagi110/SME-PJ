import { getDB } from "../config/database.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  buildSafeSearchRegex,
  formatOmniSearchResults,
  getAllowedSearchScopes,
} from "../utils/omniSearch.js";

const findSafe = (db, collection, filter, projection, limit, sort) => {
  let cursor = db.collection(collection).find(filter, { projection });
  if (sort) cursor = cursor.sort(sort);
  return cursor.limit(limit).toArray();
};

export const omniSearch = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 4, 1), 10);

  const rx = buildSafeSearchRegex(q);
  if (!rx) {
    return res.json({ success: true, data: [] });
  }

  const scopes = getAllowedSearchScopes(req.user);
  const db = getDB();
  const empty = Promise.resolve([]);

  const [orders, products, materials, partners, contracts, batches] = await Promise.all([
    scopes.orders
      ? findSafe(
          db,
          "don_hang",
          {
            loai_don: { $in: scopes.orderTypes },
            $or: [{ ma_dh: rx }, { khach_hang_ten: rx }, { nha_cung_cap_ten: rx }],
          },
          { ma_dh: 1, khach_hang_ten: 1, nha_cung_cap_ten: 1, trang_thai: 1, loai_don: 1 },
          limit,
          { _id: -1 }
        )
      : empty,
    scopes.products
      ? findSafe(
          db,
          "san_pham",
          { $or: [{ ma_sp: rx }, { ten_sp: rx }] },
          { ma_sp: 1, ten_sp: 1, so_luong: 1, don_vi: 1 },
          limit
        )
      : empty,
    scopes.materials
      ? findSafe(
          db,
          "nguyen_lieu",
          { $or: [{ ma_nl: rx }, { ten_nl: rx }] },
          { ma_nl: 1, ten_nl: 1, so_luong: 1, don_vi: 1 },
          limit
        )
      : empty,
    scopes.partners
      ? findSafe(
          db,
          "doi_tac",
          { $or: [{ ma_doi_tac: rx }, { ten: rx }, { so_dien_thoai: rx }] },
          { ma_doi_tac: 1, ten: 1, so_dien_thoai: 1, loai_doi_tac: 1, nhom: 1 },
          limit
        )
      : empty,
    scopes.contracts
      ? findSafe(
          db,
          "hop_dong",
          { $or: [{ ma_hop_dong: rx }, { ten_hop_dong: rx }, { partner_name: rx }] },
          { ma_hop_dong: 1, ten_hop_dong: 1, partner_name: 1 },
          limit
        )
      : empty,
    scopes.batches
      ? findSafe(
          db,
          "lo_san_xuat",
          { $or: [{ so_lo: rx }, { ten_hang: rx }, { ma_hang: rx }] },
          { so_lo: 1, ten_hang: 1, so_luong_ton: 1 },
          limit
        )
      : empty,
  ]);

  const data = formatOmniSearchResults({ orders, products, materials, partners, contracts, batches });
  return res.json({ success: true, data });
});
