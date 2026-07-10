// Refactor 2026-07-09: tách CRUD (create + read + update items/pricing) ra file riêng.
// Tất cả method public của DAO đều re-export từ đây qua facade `donHangDAO.js`.

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import { state } from "./donHangState.js";
import {
  STATUS,
  ORDER_TYPE,
} from "./donHangConstants.js";
import {
  genOrderCode,
  num,
  ensureOrderType,
  getAllowedTransitions,
  normalizeItems,
  calcTotals,
  validateCreateByType,
} from "./donHangHelpers.js";

/* ══════════════ CREATE ══════════════ */
export async function taoDonHang({
  loai_don = ORDER_TYPE.SALE,
  khach_hang_ten = "",
  nha_cung_cap_ten = "",
  nguoi_lap_id,
  san_pham = [],
  giam_gia = 0,
  thue_rate = 0,
  phi_vc = 0,
  thanh_toan = null,
  trang_thai = STATUS.DRAFT,
  ghi_chu = "",
}) {
  const v = validateCreateByType({
    loai_don,
    khach_hang_ten,
    nha_cung_cap_ten,
    nguoi_lap_id,
  });
  if (v?.error) return v;
  loai_don = v.loai_don;

  const items = normalizeItems(san_pham, loai_don);
  if (!items.length)
    return { error: new Error("Chứng từ cần ít nhất 1 dòng hàng hóa") };

  const totals = calcTotals(items, giam_gia, thue_rate, phi_vc);
  const now = new Date();

  const transitions = getAllowedTransitions(loai_don);
  const allowedStart = Object.keys(transitions);
  const finalStatus = allowedStart.includes(trang_thai)
    ? trang_thai
    : STATUS.DRAFT;

  const prefix = loai_don === ORDER_TYPE.SALE ? "DH" : "PN";

  const doc = {
    ma_dh: genOrderCode(prefix),
    loai_don,

    khach_hang_ten: khach_hang_ten
      ? String(khach_hang_ten).trim()
      : undefined,
    nha_cung_cap_ten: nha_cung_cap_ten
      ? String(nha_cung_cap_ten).trim()
      : undefined,

    nguoi_lap_id: new ObjectId(String(nguoi_lap_id)),

    ngay_dat: now,
    san_pham: items,

    tam_tinh: totals.subtotal,
    giam_gia: totals.discount,
    thue_rate: totals.taxRate,
    thue_tien: totals.taxAmount,
    phi_vc: totals.shipping,
    tong_tien: totals.total,

    thanh_toan: thanh_toan
      ? {
          method: thanh_toan.method || null,
          amount: num(thanh_toan.amount, 0),
          status: thanh_toan.status || "unpaid",
          trans_id: thanh_toan.trans_id || null,
        }
      : { method: null, amount: 0, status: "unpaid", trans_id: null },

    trang_thai: finalStatus,
    ghi_chu,

    lich_su: [
      {
        hanh_dong: "create",
        trang_thai: finalStatus,
        at: now,
        by: new ObjectId(String(nguoi_lap_id)),
      },
    ],

    created_at: now,
    updated_at: now,
  };

  if (loai_don === ORDER_TYPE.SALE) delete doc.nha_cung_cap_ten;
  if (loai_don === ORDER_TYPE.PURCHASE_RECEIPT) delete doc.khach_hang_ten;

  try {
    const res = await state.don_hang.insertOne(doc);
    return { insertedId: res.insertedId, ma_dh: doc.ma_dh };
  } catch (e) {
    if (e?.code === 11000) return { error: new Error("Mã chứng từ đã tồn tại") };
    logger.error("taoDonHang error", { error: e.message });
    return { error: e };
  }
}

/* ══════════════ READ ══════════════ */
export async function getDonHangById(id, { includeDeleted = false } = {}) {
  try {
    const _id = new ObjectId(id);

    const match = { _id };
    if (!includeDeleted) match.trang_thai = { $ne: STATUS.DELETED };

    const [doc] = await state.don_hang
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: "users",
            localField: "nguoi_lap_id",
            foreignField: "_id",
            as: "nguoi_lap",
          },
        },
        {
          $addFields: {
            nguoi_lap_ten: {
              $let: {
                vars: { u: { $arrayElemAt: ["$nguoi_lap", 0] } },
                in: {
                  $ifNull: [
                    "$$u.ho_ten",
                    { $ifNull: ["$$u.name", { $ifNull: ["$$u.full_name", "$$u.email"] }] },
                  ],
                },
              },
            },
          },
        },
        { $project: { nguoi_lap: 0 } },
      ])
      .toArray();

    if (!doc) return { error: new Error("Không tìm thấy chứng từ") };
    return doc;
  } catch (e) {
    logger.error("getDonHangById error", { error: e.message });
    return { error: e };
  }
}

export async function getByCode(ma_dh) {
  try {
    const doc = await state.don_hang.findOne({
      ma_dh,
      trang_thai: { $ne: STATUS.DELETED },
    });
    if (!doc) return { error: new Error("Không tìm thấy chứng từ") };
    return doc;
  } catch (e) {
    logger.error("getByCode error", { error: e.message });
    return { error: e };
  }
}

export async function listDonHang({
  q = "",
  loai_don,
  khach_hang_ten,
  nha_cung_cap_ten,
  nguoi_lap_id,
  trang_thai,
  date_from,
  date_to,
  page = 1,
  limit = 20,
  sortBy = "created_at",
  order = "desc",
  includeDeleted = false,
} = {}) {
  try {
    const filter = {};
    if (!includeDeleted) filter.trang_thai = { $ne: STATUS.DELETED };

    if (loai_don && Object.values(ORDER_TYPE).includes(loai_don))
      filter.loai_don = loai_don;
    if (trang_thai && Object.values(STATUS).includes(trang_thai))
      filter.trang_thai = trang_thai;

    if (khach_hang_ten)
      filter.khach_hang_ten = {
        $regex: String(khach_hang_ten).trim(),
        $options: "i",
      };
    if (nha_cung_cap_ten)
      filter.nha_cung_cap_ten = {
        $regex: String(nha_cung_cap_ten).trim(),
        $options: "i",
      };

    if (nguoi_lap_id && ObjectId.isValid(String(nguoi_lap_id))) {
      filter.nguoi_lap_id = new ObjectId(String(nguoi_lap_id));
    }

    if (date_from || date_to) {
      filter.created_at = {};
      if (date_from) filter.created_at.$gte = new Date(date_from);
      if (date_to) filter.created_at.$lte = new Date(date_to);
    }

    if (q && q.trim()) {
      const s = q.trim();
      filter.$or = [
        { ma_dh: { $regex: s, $options: "i" } },
        { khach_hang_ten: { $regex: s, $options: "i" } },
        { nha_cung_cap_ten: { $regex: s, $options: "i" } },
        { "san_pham.ten_sp": { $regex: s, $options: "i" } },
        { "san_pham.ten_nl": { $regex: s, $options: "i" } },
        { "thanh_toan.trans_id": { $regex: s, $options: "i" } },
      ];
    }

    const skip = Math.max(0, (Number(page) - 1) * Number(limit));
    const sortDir = order === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortDir };

    const [items, total] = await Promise.all([
      state.don_hang
        .aggregate([
          { $match: filter },
          { $sort: sort },
          { $skip: skip },
          { $limit: Number(limit) },
          {
            $lookup: {
              from: "users",
              localField: "nguoi_lap_id",
              foreignField: "_id",
              as: "nguoi_lap",
            },
          },
          {
            $addFields: {
              nguoi_lap_ten: {
                $let: {
                  vars: { u: { $arrayElemAt: ["$nguoi_lap", 0] } },
                  in: {
                    $ifNull: [
                      "$$u.ho_ten",
                      { $ifNull: ["$$u.name", { $ifNull: ["$$u.full_name", "$$u.email"] }] },
                    ],
                  },
                },
              },
            },
          },
          { $project: { nguoi_lap: 0 } },
        ])
        .toArray(),
      state.don_hang.countDocuments(filter),
    ]);

    return {
      items,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  } catch (e) {
    logger.error("listDonHang error", { error: e.message });
    return { error: e };
  }
}

/* ══════════════ UPDATE (items + pricing) ══════════════ */
async function recalcAndSave(id, updater = {}, { session } = {}) {
  const doc = await state.don_hang.findOne({ _id: new ObjectId(id) }, { session });
  if (!doc) return { error: new Error("Không tìm thấy chứng từ") };

  if (doc.trang_thai === STATUS.DELETED)
    return { error: new Error("Chứng từ đã xóa, không thể cập nhật") };
  if ([STATUS.COMPLETED, STATUS.CANCELLED].includes(doc.trang_thai)) {
    return { error: new Error("Chứng từ đã kết thúc, không thể chỉnh sửa") };
  }

  const payload = { ...updater };

  const items = normalizeItems(payload.san_pham ?? doc.san_pham, doc.loai_don);
  if (!items.length) return { error: new Error("Chứng từ cần ít nhất 1 dòng hàng hóa") };

  const giam_gia = num(payload.giam_gia ?? doc.giam_gia, 0);
  const thue_rate = num(payload.thue_rate ?? doc.thue_rate, 0);
  const phi_vc = num(payload.phi_vc ?? doc.phi_vc, 0);

  const totals = calcTotals(items, giam_gia, thue_rate, phi_vc);

  const next = {
    san_pham: items,
    tam_tinh: totals.subtotal,
    giam_gia: totals.discount,
    thue_rate: totals.taxRate,
    thue_tien: totals.taxAmount,
    phi_vc: totals.shipping,
    tong_tien: totals.total,
    ghi_chu: payload.ghi_chu !== undefined ? payload.ghi_chu : doc.ghi_chu,
    updated_at: new Date(),
  };

  if (payload.thanh_toan) {
    next.thanh_toan = {
      method: payload.thanh_toan.method ?? doc.thanh_toan?.method ?? null,
      amount: num(payload.thanh_toan.amount ?? doc.thanh_toan?.amount ?? 0, 0),
      status: payload.thanh_toan.status ?? doc.thanh_toan?.status ?? "unpaid",
      trans_id: payload.thanh_toan.trans_id ?? doc.thanh_toan?.trans_id ?? null,
    };
  }

  const res = await state.don_hang.updateOne(
    { _id: new ObjectId(id) },
    { $set: next },
    { session }
  );
  return { modifiedCount: res.modifiedCount };
}

export async function capNhatSanPham(id, items = [], opts = {}) {
  return recalcAndSave(id, { san_pham: items }, opts);
}
export async function themSanPham(id, item, opts = {}) {
  const doc = await state.don_hang.findOne({ _id: new ObjectId(id) }, opts);
  if (!doc) return { error: new Error("Không tìm thấy chứng từ") };
  const items = [...(doc.san_pham || []), item];
  return recalcAndSave(id, { san_pham: items }, opts);
}
export async function xoaSanPham(id, idxOrCode, opts = {}) {
  const doc = await state.don_hang.findOne({ _id: new ObjectId(id) }, opts);
  if (!doc) return { error: new Error("Không tìm thấy chứng từ") };
  let items = [...(doc.san_pham || [])];

  if (typeof idxOrCode === "number") items.splice(idxOrCode, 1);
  else items = items.filter((i) => i.ma_sp !== idxOrCode && i.ma_nl !== idxOrCode);

  return recalcAndSave(id, { san_pham: items }, opts);
}

export async function apDungGiamGia(id, giam_gia, opts = {}) {
  return recalcAndSave(id, { giam_gia }, opts);
}
export async function apDungThue(id, thue_rate, opts = {}) {
  return recalcAndSave(id, { thue_rate }, opts);
}
export async function setPhiVanChuyen(id, phi_vc, opts = {}) {
  return recalcAndSave(id, { phi_vc }, opts);
}
export async function capNhatThanhToan(id, thanh_toan, opts = {}) {
  return recalcAndSave(id, { thanh_toan }, opts);
}
export async function capNhatGhiChu(id, ghi_chu, opts = {}) {
  return recalcAndSave(id, { ghi_chu }, opts);
}
