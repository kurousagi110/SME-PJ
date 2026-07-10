// Refactor 2026-07-09: tách inventory logic ra file riêng.
// - Batch-fetch helpers (eliminates N+1 queries trong applyInventory)
// - _applyInventoryOnCompleted: 3 nhánh theo loai_don (SALE / PURCHASE_RECEIPT / PROD_RECEIPT)
// - getProductionNeeds: API tính nhu cầu NL cho đơn nhập sản xuất
//
// Toàn bộ thao tác đều nhận `{ session }` để caller có thể chạy trong transaction.

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import { state } from "./donHangState.js";
import { STATUS, ORDER_TYPE, ITEM_TYPE, toObjectId } from "./donHangConstants.js";
import { ensureOrderType, bomFromSanPhamDoc } from "./donHangHelpers.js";

/* ══════════════ Batch-fetch helpers (eliminate N+1) ══════════════ */
export async function batchFetchSanPham(lines, { session } = {}) {
  const ids = [];
  const maSps = [];
  for (const ln of lines) {
    if (ln?.san_pham_id) { const oid = toObjectId(ln.san_pham_id); if (oid) ids.push(oid); }
    if (ln?.ma_sp)       maSps.push(ln.ma_sp);
  }
  const $or = [];
  if (ids.length)   $or.push({ _id: { $in: ids } });
  if (maSps.length) $or.push({ ma_sp: { $in: maSps } });
  if (!$or.length)  return { byId: new Map(), byMa: new Map() };

  const docs = await state.san_pham_col.find({ $or }, { session }).toArray();
  return {
    byId: new Map(docs.map(s => [s._id.toString(), s])),
    byMa: new Map(docs.filter(s => s.ma_sp).map(s => [s.ma_sp, s])),
  };
}

export function lookupSanPham({ byId, byMa }, ln) {
  if (ln?.san_pham_id) {
    const key = toObjectId(ln.san_pham_id)?.toString();
    if (key && byId.has(key)) return byId.get(key);
  }
  if (ln?.ma_sp && byMa.has(ln.ma_sp)) return byMa.get(ln.ma_sp);
  return null;
}

export async function batchFetchNguyenLieu(lines, { session } = {}) {
  const ids = [];
  const maNLs = [];
  for (const ln of lines) {
    if (ln?.nguyen_lieu_id) { const oid = toObjectId(ln.nguyen_lieu_id); if (oid) ids.push(oid); }
    if (ln?.ma_nl)          maNLs.push(String(ln.ma_nl).trim());
  }
  const $or = [];
  if (ids.length)   $or.push({ _id: { $in: ids } });
  if (maNLs.length) $or.push({ ma_nl: { $in: maNLs } });
  if (!$or.length)  return { byId: new Map(), byMa: new Map() };

  const docs = await state.nguyen_lieu_col.find({ $or }, { session }).toArray();
  return {
    byId: new Map(docs.map(nl => [nl._id.toString(), nl])),
    byMa: new Map(docs.filter(nl => nl.ma_nl).map(nl => [String(nl.ma_nl).trim(), nl])),
  };
}

export function lookupNguyenLieu({ byId, byMa }, ln) {
  if (ln?.nguyen_lieu_id) {
    const key = toObjectId(ln.nguyen_lieu_id)?.toString();
    if (key && byId.has(key)) return byId.get(key);
  }
  if (ln?.ma_nl) {
    const key = String(ln.ma_nl).trim();
    if (byMa.has(key)) return byMa.get(key);
  }
  return null;
}

/* Backward-compat single-item helpers (cho callers ngoài _applyInventory) */
export async function findSanPhamRef(line, { session } = {}) {
  if (line?.san_pham_id) {
    const sp = await state.san_pham_col.findOne({ _id: new ObjectId(line.san_pham_id) }, { session });
    if (sp) return sp;
  }
  if (line?.ma_sp) {
    const sp = await state.san_pham_col.findOne({ ma_sp: line.ma_sp }, { session });
    if (sp) return sp;
  }
  return null;
}

export async function findNguyenLieuByMaNL(ma_nl, { session } = {}) {
  if (!ma_nl) return null;
  return (
    (await state.nguyen_lieu_col.findOne(
      { ma_nl: String(ma_nl).trim() },
      { session }
    )) || null
  );
}

/* ══════════════ Inventory application (3 nhánh) ══════════════ */
// Phase 2 fix: N+1 eliminated — read lookups are batch-fetched trước update loop
export async function applyInventoryOnCompleted(doc, { session } = {}) {
  const loai_don = ensureOrderType(doc.loai_don);
  const lines = Array.isArray(doc.san_pham) ? doc.san_pham : [];

  // (1) SALE: trừ thành phẩm
  if (loai_don === ORDER_TYPE.SALE) {
    const spLines = lines.filter(ln => ln.loai_hang === ITEM_TYPE.SAN_PHAM && Number(ln.so_luong) > 0);
    if (!spLines.length) return;

    const spMap = await batchFetchSanPham(spLines, { session });

    // Pre-validate: kiểm tra đủ tồn tất cả trước khi trừ bất kỳ cái nào
    for (const ln of spLines) {
      const qty = Number(ln.so_luong);
      const sp = lookupSanPham(spMap, ln);
      if (!sp) throw new Error(`Không tìm thấy sản phẩm để xuất kho: ${ln.ma_sp || ln.ten_sp}`);
      if ((sp.so_luong ?? 0) < qty) {
        throw new Error(`Không đủ tồn sản phẩm: ${sp.ma_sp || sp.ten_sp} (cần ${qty}, tồn ${sp.so_luong ?? 0})`);
      }
    }

    for (const ln of spLines) {
      const qty = Number(ln.so_luong);
      const sp = lookupSanPham(spMap, ln);
      const res = await state.san_pham_col.updateOne(
        { _id: sp._id, so_luong: { $gte: qty } },
        { $inc: { so_luong: -qty } },
        { session }
      );
      if (res.matchedCount === 0) throw new Error(`Không đủ tồn sản phẩm: ${sp.ma_sp || sp.ten_sp}`);
    }
    return;
  }

  // (2) PURCHASE_RECEIPT: cộng tồn NL/SP
  if (loai_don === ORDER_TYPE.PURCHASE_RECEIPT) {
    const nlLines = lines.filter(ln => ln.loai_hang === ITEM_TYPE.NGUYEN_LIEU && Number(ln.so_luong) > 0);
    const spLines = lines.filter(ln => ln.loai_hang === ITEM_TYPE.SAN_PHAM && Number(ln.so_luong) > 0);

    const nlMap = nlLines.length ? await batchFetchNguyenLieu(nlLines, { session }) : { byId: new Map(), byMa: new Map() };
    const spMap = spLines.length ? await batchFetchSanPham(spLines, { session }) : { byId: new Map(), byMa: new Map() };

    for (const ln of nlLines) {
      const qty = Number(ln.so_luong);
      const nl = lookupNguyenLieu(nlMap, ln);
      if (!nl) throw new Error(`Không tìm thấy nguyên liệu để nhập kho: ${ln.ma_nl || ln.ten_nl}`);
      await state.nguyen_lieu_col.updateOne({ _id: nl._id }, { $inc: { so_luong: qty } }, { session });
      logger.info("[donHangInventory] Cộng kho NL", { ma_nl: nl.ma_nl || ln.ma_nl, qty });
    }

    for (const ln of spLines) {
      const qty = Number(ln.so_luong);
      const sp = lookupSanPham(spMap, ln);
      if (!sp) throw new Error(`Không tìm thấy sản phẩm để nhập kho: ${ln.ma_sp || ln.ten_sp}`);
      await state.san_pham_col.updateOne({ _id: sp._id }, { $inc: { so_luong: qty } }, { session });
      logger.info("[donHangInventory] Cộng kho SP", { ma_sp: sp.ma_sp || ln.ma_sp, qty });
    }
    return;
  }

  // (3) PROD_RECEIPT: cộng TP + trừ NL theo BOM = san_pham.nguyen_lieu
  if (loai_don === ORDER_TYPE.PROD_RECEIPT) {
    const spLines = lines.filter(ln => ln.loai_hang === ITEM_TYPE.SAN_PHAM && Number(ln.so_luong) > 0);
    if (!spLines.length) return;

    const spMap = await batchFetchSanPham(spLines, { session });

    // Collect all ma_nl từ tất cả BOMs (batch fetch NL 1 lần)
    const maNLSet = new Set();
    for (const ln of spLines) {
      const sp = lookupSanPham(spMap, ln);
      if (!sp) throw new Error(`Không tìm thấy sản phẩm để nhập thành phẩm: ${ln.ma_sp || ln.ten_sp}`);
      const bomList = bomFromSanPhamDoc(sp);
      if (!bomList.length) throw new Error(`Chưa khai báo BOM cho sản phẩm: ${sp.ma_sp || sp.ten_sp}`);
      for (const b of bomList) if (b.ma_nl) maNLSet.add(String(b.ma_nl).trim());
    }

    const maNLs = Array.from(maNLSet);
    const nlDocs = maNLs.length
      ? await state.nguyen_lieu_col.find({ ma_nl: { $in: maNLs } }, { session }).toArray()
      : [];
    const nlByMa = new Map(nlDocs.map(nl => [String(nl.ma_nl).trim(), nl]));

    // Pre-validate NL tồn trước khi trừ bất kỳ cái nào
    // Nếu fail ở đây thì kho chưa bị động → không cần rollback
    for (const ln of spLines) {
      const qtyTP = Number(ln.so_luong);
      const sp = lookupSanPham(spMap, ln);
      const bomList = bomFromSanPhamDoc(sp);
      for (const b of bomList) {
        const need = (Number(b.dinh_muc) || 0) * qtyTP;
        if (need <= 0) continue;
        const nl = nlByMa.get(String(b.ma_nl).trim());
        if (!nl) throw new Error(`BOM không map được nguyên liệu: ${b.ma_nl || b.ten_nl || "?"}`);
        if ((nl.so_luong ?? 0) < need) {
          throw new Error(`Không đủ tồn nguyên liệu: ${nl.ma_nl || b.ma_nl} (cần ${need}, tồn ${nl.so_luong ?? 0})`);
        }
      }
    }

    for (const ln of spLines) {
      const qtyTP = Number(ln.so_luong);
      const sp = lookupSanPham(spMap, ln);
      const bomList = bomFromSanPhamDoc(sp);

      // Trừ kho NL (guard $gte là lớp bảo vệ thứ 2 cho concurrent request)
      for (const b of bomList) {
        const need = (Number(b.dinh_muc) || 0) * qtyTP;
        if (need <= 0) continue;

        const nl = nlByMa.get(String(b.ma_nl).trim());
        const res = await state.nguyen_lieu_col.updateOne(
          { _id: nl._id, so_luong: { $gte: need } },
          { $inc: { so_luong: -need } },
          { session }
        );

        if (res.matchedCount === 0) {
          const nl2 = await state.nguyen_lieu_col.findOne({ _id: nl._id }, { session });
          throw new Error(
            `Không đủ tồn nguyên liệu: ${nl2?.ma_nl || b.ma_nl} (cần ${need}, tồn ${nl2?.so_luong ?? 0})`
          );
        }
      }

      // Cộng kho thành phẩm
      await state.san_pham_col.updateOne(
        { _id: sp._id },
        { $inc: { so_luong: qtyTP } },
        { session }
      );
    }
    return;
  }
}

/* ══════════════ Production needs (BOM aggregation) ══════════════ */
export async function getProductionNeeds(orderId, { session } = {}) {
  try {
    const _id = new ObjectId(String(orderId));
    const doc = await state.don_hang.findOne(
      { _id, loai_don: ORDER_TYPE.PROD_RECEIPT, trang_thai: { $ne: STATUS.DELETED } },
      { session }
    );
    if (!doc) return { error: new Error("Không tìm thấy đơn nhập sản xuất") };

    const lines = Array.isArray(doc.san_pham) ? doc.san_pham : [];
    const map = new Map(); // ma_nl -> {ma_nl, ten_nl, don_vi, so_luong_can}

    // Phase 2 fix: batch-fetch all san_pham trước loop (was N+1)
    const activeLines = lines.filter(ln =>
      (ln?.loai_hang || ITEM_TYPE.SAN_PHAM) === ITEM_TYPE.SAN_PHAM && Number(ln?.so_luong) > 0
    );
    const spMap = activeLines.length
      ? await batchFetchSanPham(activeLines, { session })
      : { byId: new Map(), byMa: new Map() };

    for (const ln of activeLines) {
      const qtyTP = Number(ln?.so_luong) || 0;

      const sp = lookupSanPham(spMap, ln);
      if (!sp) return { error: new Error(`Không tìm thấy sản phẩm: ${ln?.ma_sp || ln?.ten_sp}`) };

      const bomList = bomFromSanPhamDoc(sp);
      if (!bomList.length) {
        return { error: new Error(`Chưa khai báo BOM cho sản phẩm: ${sp.ma_sp || sp.ten_sp}`) };
      }

      for (const b of bomList) {
        const need = (Number(b.dinh_muc) || 0) * qtyTP;
        if (need <= 0) continue;

        const key = String(b.ma_nl).trim();
        const cur = map.get(key) || {
          ma_nl: key,
          ten_nl: b.ten_nl || null,
          don_vi: b.don_vi || null,
          so_luong_can: 0,
        };
        cur.so_luong_can += need;
        if (!cur.ten_nl && b.ten_nl) cur.ten_nl = b.ten_nl;
        if (!cur.don_vi && b.don_vi) cur.don_vi = b.don_vi;
        map.set(key, cur);
      }
    }

    const maNLs = Array.from(map.keys());
    const nls = maNLs.length
      ? await state.nguyen_lieu_col
        .find({ ma_nl: { $in: maNLs } }, { session })
        .toArray()
      : [];

    const stockMap = new Map();
    for (const nl of nls) stockMap.set(String(nl.ma_nl).trim(), nl);

    const items = maNLs.map((ma_nl) => {
      const need = map.get(ma_nl);
      const nl = stockMap.get(ma_nl);

      const ton = Number(nl?.so_luong ?? 0) || 0;
      const can = Number(need?.so_luong_can ?? 0) || 0;
      const ok = ton >= can;

      return {
        nguyen_lieu_id: nl?._id || null,
        ma_nl,
        ten_nl: need?.ten_nl || nl?.ten_nl || null,
        don_vi: need?.don_vi || nl?.don_vi || null,
        so_luong_can: can,
        ton_kho: ton,
        ton_toi_thieu: Number(nl?.ton_toi_thieu ?? 0) || 0,
        status: ok ? "đủ hàng" : "thiếu hàng",
      };
    });

    return { ok: true, items };
  } catch (e) {
    logger.error("getProductionNeeds error", { error: e.message });
    return { error: e };
  }
}
