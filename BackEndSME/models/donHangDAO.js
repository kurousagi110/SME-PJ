import { ObjectId } from "mongodb";

let don_hang;
let san_pham_col;
let nguyen_lieu_col;
let bom_col; // vẫn inject nhưng PROD_RECEIPT sẽ ưu tiên san_pham.nguyen_lieu
let users_col;


const STATUS = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  PAID: "paid",
  SHIPPING: "shipping",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DELETED: "deleted",
};

const ORDER_TYPE = {
  SALE: "sale",
  PROD_RECEIPT: "prod_receipt",
  PURCHASE_RECEIPT: "purchase_receipt",
};

const ITEM_TYPE = {
  SAN_PHAM: "san_pham",
  NGUYEN_LIEU: "nguyen_lieu",
};

const ALLOWED_ITEM_TYPES_BY_ORDER_TYPE = {
  [ORDER_TYPE.SALE]: [ITEM_TYPE.SAN_PHAM],
  [ORDER_TYPE.PROD_RECEIPT]: [ITEM_TYPE.SAN_PHAM],
  [ORDER_TYPE.PURCHASE_RECEIPT]: [ITEM_TYPE.SAN_PHAM, ITEM_TYPE.NGUYEN_LIEU],
};

const ALLOWED_TRANSITIONS_BY_TYPE = {
[ORDER_TYPE.SALE]: {
  [STATUS.DRAFT]: [STATUS.CONFIRMED, STATUS.CANCELLED],

  // ✅ cho đi tắt confirmed -> completed
  [STATUS.CONFIRMED]: [STATUS.PAID, STATUS.COMPLETED, STATUS.CANCELLED],

  [STATUS.PAID]: [STATUS.SHIPPING, STATUS.CANCELLED],
  [STATUS.SHIPPING]: [STATUS.COMPLETED],
  [STATUS.COMPLETED]: [],
  [STATUS.CANCELLED]: [],
},
  [ORDER_TYPE.PROD_RECEIPT]: {
    [STATUS.DRAFT]: [STATUS.CONFIRMED, STATUS.CANCELLED],
    [STATUS.CONFIRMED]: [STATUS.COMPLETED, STATUS.CANCELLED],
    [STATUS.COMPLETED]: [],
    [STATUS.CANCELLED]: [],
  },
  [ORDER_TYPE.PURCHASE_RECEIPT]: {
    [STATUS.DRAFT]: [STATUS.CONFIRMED, STATUS.CANCELLED],
    [STATUS.CONFIRMED]: [STATUS.PAID, STATUS.COMPLETED, STATUS.CANCELLED],
    [STATUS.PAID]: [STATUS.COMPLETED, STATUS.CANCELLED],
    [STATUS.COMPLETED]: [],
    [STATUS.CANCELLED]: [],
  },
};

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  const s = String(id);
  return ObjectId.isValid(s) ? new ObjectId(s) : null;
}

export default class DonHangDAO {
  static async injectDB(conn) {
    if (don_hang && san_pham_col && nguyen_lieu_col) return;
    try {
      const db = conn.db(process.env.SME_DB_NAME || process.env.DB_NAME);

      don_hang = db.collection("don_hang");
      san_pham_col = db.collection("san_pham");
      nguyen_lieu_col = db.collection("nguyen_lieu");
      users_col = db.collection("users");


      // vẫn giữ bom_san_pham nếu bạn có dùng chỗ khác
      bom_col = db.collection("bom_san_pham");
      await bom_col.createIndex({ san_pham_id: 1 }, { unique: true });
      await bom_col.createIndex({ "items.nguyen_lieu_id": 1 });

      await don_hang.createIndex({ ma_dh: 1 }, { unique: true });
      await don_hang.createIndex({ loai_don: 1 });
      await don_hang.createIndex({ trang_thai: 1 });
      await don_hang.createIndex({ created_at: -1 });

      await don_hang.createIndex({ khach_hang_ten: 1 });
      await don_hang.createIndex({ nha_cung_cap_ten: 1 });
      await don_hang.createIndex({ nguoi_lap_id: 1 });

      // Phase 2 fix: merge 4 text indexes into 1 (MongoDB allows only 1 text index per collection)
      const existingIndexes = await don_hang.indexes();
      const hasTextIndex = existingIndexes.some(i => i.key?._fts || Object.values(i.key || {}).includes("text"));
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
    } catch (e) {
      console.error(`Unable to establish collection handles: ${e}`);
    }
  }

  /* ====================== Helpers ====================== */
  static _genOrderCode(prefix = "DH") {
    const d = new Date();
    const ymd =
      d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${ymd}-${rand}`;
  }

  static _num(v, def = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }

  static _ensureOrderType(loai_don) {
    return Object.values(ORDER_TYPE).includes(loai_don)
      ? loai_don
      : ORDER_TYPE.SALE;
  }

  static _getAllowedTransitions(loai_don) {
    const type = this._ensureOrderType(loai_don);
    return (
      ALLOWED_TRANSITIONS_BY_TYPE[type] ||
      ALLOWED_TRANSITIONS_BY_TYPE[ORDER_TYPE.SALE]
    );
  }

  static _normalizeItems(items = [], orderType) {
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
          const don_gia = this._num(it.don_gia ?? it.don_gia_ban ?? it.gia_ban ?? it.don_gia, 0);
          const so_luong = Math.max(0, this._num(it.so_luong, 0));
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
        const don_gia = this._num(it.don_gia ?? it.gia_nhap ?? it.don_gia, 0);
        const so_luong = Math.max(0, this._num(it.so_luong, 0));
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

  static _calcTotals(items, giam_gia = 0, thue_rate = 0, phi_vc = 0) {
    const subtotal = (items || []).reduce((s, it) => s + (Number(it.thanh_tien) || 0), 0);
    const discount = Math.max(0, this._num(giam_gia, 0));
    const base = Math.max(0, subtotal - discount);
    const taxRate = Math.max(0, this._num(thue_rate, 0));
    const taxAmount = base * taxRate;
    const shipping = Math.max(0, this._num(phi_vc, 0));
    const total = Math.max(0, base + taxAmount + shipping);
    return { subtotal, discount, taxRate, taxAmount, shipping, total };
  }

  static _validateCreateByType(dto) {
    const loai_don = this._ensureOrderType(dto.loai_don);

    if (!dto.nguoi_lap_id) return { error: new Error("Thiếu nguoi_lap_id") };

    if (loai_don === ORDER_TYPE.SALE && !dto.khach_hang_ten) {
      return { error: new Error("Thiếu khach_hang_ten (bán hàng)") };
    }

    if (loai_don === ORDER_TYPE.PURCHASE_RECEIPT && !dto.nha_cung_cap_ten) {
      return { error: new Error("Thiếu nha_cung_cap_ten (nhập mua)") };
    }

    return { ok: true, loai_don };
  }

  /* ====================== Create ====================== */
  static async taoDonHang({
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
    const v = this._validateCreateByType({
      loai_don,
      khach_hang_ten,
      nha_cung_cap_ten,
      nguoi_lap_id,
    });
    if (v?.error) return v;
    loai_don = v.loai_don;

    const items = this._normalizeItems(san_pham, loai_don);
    if (!items.length)
      return { error: new Error("Chứng từ cần ít nhất 1 dòng hàng hóa") };

    const totals = this._calcTotals(items, giam_gia, thue_rate, phi_vc);
    const now = new Date();

    const transitions = this._getAllowedTransitions(loai_don);
    const allowedStart = Object.keys(transitions);
    const finalStatus = allowedStart.includes(trang_thai)
      ? trang_thai
      : STATUS.DRAFT;

    const prefix = loai_don === ORDER_TYPE.SALE ? "DH" : "PN";

    const doc = {
      ma_dh: this._genOrderCode(prefix),
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
          amount: this._num(thanh_toan.amount, 0),
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
      const res = await don_hang.insertOne(doc);
      return { insertedId: res.insertedId, ma_dh: doc.ma_dh };
    } catch (e) {
      if (e?.code === 11000) return { error: new Error("Mã chứng từ đã tồn tại") };
      console.error(`taoDonHang error: ${e}`);
      return { error: e };
    }
  }

  /* ====================== Read ====================== */
  static async getDonHangById(id, { includeDeleted = false } = {}) {
    try {
      const _id = new ObjectId(id);

      const match = { _id };
      if (!includeDeleted) match.trang_thai = { $ne: STATUS.DELETED };

      const [doc] = await don_hang
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
      console.error(`getDonHangById error: ${e}`);
      return { error: e };
    }
  }


  static async getByCode(ma_dh) {
    try {
      const doc = await don_hang.findOne({
        ma_dh,
        trang_thai: { $ne: STATUS.DELETED },
      });
      if (!doc) return { error: new Error("Không tìm thấy chứng từ") };
      return doc;
    } catch (e) {
      console.error(`getByCode error: ${e}`);
      return { error: e };
    }
  }

  static async listDonHang({
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
        don_hang
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
        don_hang.countDocuments(filter),
      ]);

      return {
        items,
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      };
    } catch (e) {
      console.error(`listDonHang error: ${e}`);
      return { error: e };
    }
  }

  /* ====================== Update items/pricing ====================== */
  static async _recalcAndSave(id, updater = {}, { session } = {}) {
    const doc = await don_hang.findOne({ _id: new ObjectId(id) }, { session });
    if (!doc) return { error: new Error("Không tìm thấy chứng từ") };

    if (doc.trang_thai === STATUS.DELETED)
      return { error: new Error("Chứng từ đã xóa, không thể cập nhật") };
    if ([STATUS.COMPLETED, STATUS.CANCELLED].includes(doc.trang_thai)) {
      return { error: new Error("Chứng từ đã kết thúc, không thể chỉnh sửa") };
    }

    const payload = { ...updater };

    const items = this._normalizeItems(payload.san_pham ?? doc.san_pham, doc.loai_don);
    if (!items.length) return { error: new Error("Chứng từ cần ít nhất 1 dòng hàng hóa") };

    const giam_gia = this._num(payload.giam_gia ?? doc.giam_gia, 0);
    const thue_rate = this._num(payload.thue_rate ?? doc.thue_rate, 0);
    const phi_vc = this._num(payload.phi_vc ?? doc.phi_vc, 0);

    const totals = this._calcTotals(items, giam_gia, thue_rate, phi_vc);

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
        amount: this._num(payload.thanh_toan.amount ?? doc.thanh_toan?.amount ?? 0, 0),
        status: payload.thanh_toan.status ?? doc.thanh_toan?.status ?? "unpaid",
        trans_id: payload.thanh_toan.trans_id ?? doc.thanh_toan?.trans_id ?? null,
      };
    }

    const res = await don_hang.updateOne({ _id: new ObjectId(id) }, { $set: next }, { session });
    return { modifiedCount: res.modifiedCount };
  }

  static async capNhatSanPham(id, items = [], opts = {}) {
    return this._recalcAndSave(id, { san_pham: items }, opts);
  }
  static async themSanPham(id, item, opts = {}) {
    const doc = await don_hang.findOne({ _id: new ObjectId(id) }, opts);
    if (!doc) return { error: new Error("Không tìm thấy chứng từ") };
    const items = [...(doc.san_pham || []), item];
    return this._recalcAndSave(id, { san_pham: items }, opts);
  }
  static async xoaSanPham(id, idxOrCode, opts = {}) {
    const doc = await don_hang.findOne({ _id: new ObjectId(id) }, opts);
    if (!doc) return { error: new Error("Không tìm thấy chứng từ") };
    let items = [...(doc.san_pham || [])];

    if (typeof idxOrCode === "number") items.splice(idxOrCode, 1);
    else items = items.filter((i) => i.ma_sp !== idxOrCode && i.ma_nl !== idxOrCode);

    return this._recalcAndSave(id, { san_pham: items }, opts);
  }

  static async apDungGiamGia(id, giam_gia, opts = {}) {
    return this._recalcAndSave(id, { giam_gia }, opts);
  }
  static async apDungThue(id, thue_rate, opts = {}) {
    return this._recalcAndSave(id, { thue_rate }, opts);
  }
  static async setPhiVanChuyen(id, phi_vc, opts = {}) {
    return this._recalcAndSave(id, { phi_vc }, opts);
  }
  static async capNhatThanhToan(id, thanh_toan, opts = {}) {
    return this._recalcAndSave(id, { thanh_toan }, opts);
  }
  static async capNhatGhiChu(id, ghi_chu, opts = {}) {
    return this._recalcAndSave(id, { ghi_chu }, opts);
  }

  /* ====================== Inventory helpers ====================== */

  // Phase 2: batch-fetch helpers to eliminate N+1 queries

  /** Batch-fetch san_pham by _id and/or ma_sp, returns { byId: Map, byMa: Map } */
  static async _batchFetchSanPham(lines, { session } = {}) {
    const ids   = [];
    const maSps = [];
    for (const ln of lines) {
      if (ln?.san_pham_id) { const oid = toObjectId(ln.san_pham_id); if (oid) ids.push(oid); }
      if (ln?.ma_sp)       maSps.push(ln.ma_sp);
    }
    const $or = [];
    if (ids.length)   $or.push({ _id: { $in: ids } });
    if (maSps.length) $or.push({ ma_sp: { $in: maSps } });
    if (!$or.length)  return { byId: new Map(), byMa: new Map() };

    const docs = await san_pham_col.find({ $or }, { session }).toArray();
    return {
      byId: new Map(docs.map(s => [s._id.toString(), s])),
      byMa: new Map(docs.filter(s => s.ma_sp).map(s => [s.ma_sp, s])),
    };
  }

  static _lookupSanPham({ byId, byMa }, ln) {
    if (ln?.san_pham_id) {
      const key = toObjectId(ln.san_pham_id)?.toString();
      if (key && byId.has(key)) return byId.get(key);
    }
    if (ln?.ma_sp && byMa.has(ln.ma_sp)) return byMa.get(ln.ma_sp);
    return null;
  }

  /** Batch-fetch nguyen_lieu by _id and/or ma_nl, returns { byId: Map, byMa: Map } */
  static async _batchFetchNguyenLieu(lines, { session } = {}) {
    const ids   = [];
    const maNLs = [];
    for (const ln of lines) {
      if (ln?.nguyen_lieu_id) { const oid = toObjectId(ln.nguyen_lieu_id); if (oid) ids.push(oid); }
      if (ln?.ma_nl)          maNLs.push(String(ln.ma_nl).trim());
    }
    const $or = [];
    if (ids.length)   $or.push({ _id: { $in: ids } });
    if (maNLs.length) $or.push({ ma_nl: { $in: maNLs } });
    if (!$or.length)  return { byId: new Map(), byMa: new Map() };

    const docs = await nguyen_lieu_col.find({ $or }, { session }).toArray();
    return {
      byId: new Map(docs.map(nl => [nl._id.toString(), nl])),
      byMa: new Map(docs.filter(nl => nl.ma_nl).map(nl => [String(nl.ma_nl).trim(), nl])),
    };
  }

  static _lookupNguyenLieu({ byId, byMa }, ln) {
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

  // Keep single-item helpers for backward-compat with any callers outside _applyInventory
  static async _findSanPhamRef(line, { session } = {}) {
    if (line?.san_pham_id) {
      const sp = await san_pham_col.findOne({ _id: new ObjectId(line.san_pham_id) }, { session });
      if (sp) return sp;
    }
    if (line?.ma_sp) {
      const sp = await san_pham_col.findOne({ ma_sp: line.ma_sp }, { session });
      if (sp) return sp;
    }
    return null;
  }

  static async _findNguyenLieuByMaNL(ma_nl, { session } = {}) {
    if (!ma_nl) return null;
    return (
      (await nguyen_lieu_col.findOne(
        { ma_nl: String(ma_nl).trim() },
        { session }
      )) || null
    );
  }

  static _bomFromSanPhamDoc(sp) {
    // ✅ BOM = san_pham.nguyen_lieu
    const arr = Array.isArray(sp?.nguyen_lieu) ? sp.nguyen_lieu : [];
    return arr
      .map((x) => ({
        ma_nl: x?.ma_nl || x?.maNl || null,
        ten_nl: x?.ten_nl || x?.ten || x?.name || null,
        don_vi: x?.don_vi || x?.unit || null,
        dinh_muc: Number(x?.so_luong ?? x?.dinh_muc ?? x?.qty ?? 0) || 0, // ✅ định mức/1 SP
      }))
      .filter((x) => x.ma_nl && x.dinh_muc > 0);
  }

  /* ====================== Inventory logic ====================== */
  // Phase 2 fix: N+1 eliminated — all read lookups are batch-fetched before the update loop
  static async _applyInventoryOnCompleted(doc, { session } = {}) {
    const loai_don = this._ensureOrderType(doc.loai_don);
    const lines    = Array.isArray(doc.san_pham) ? doc.san_pham : [];

    // (1) SALE: trừ thành phẩm
    if (loai_don === ORDER_TYPE.SALE) {
      const spLines = lines.filter(ln => ln.loai_hang === ITEM_TYPE.SAN_PHAM && Number(ln.so_luong) > 0);
      if (!spLines.length) return;

      const spMap = await this._batchFetchSanPham(spLines, { session });

      for (const ln of spLines) {
        const qty = Number(ln.so_luong);
        const sp  = this._lookupSanPham(spMap, ln);
        if (!sp) throw new Error(`Không tìm thấy sản phẩm để xuất kho: ${ln.ma_sp || ln.ten_sp}`);

        const res = await san_pham_col.updateOne(
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
      const spLines = lines.filter(ln => ln.loai_hang === ITEM_TYPE.SAN_PHAM   && Number(ln.so_luong) > 0);

      const nlMap = nlLines.length ? await this._batchFetchNguyenLieu(nlLines, { session }) : { byId: new Map(), byMa: new Map() };
      const spMap = spLines.length ? await this._batchFetchSanPham(spLines, { session })   : { byId: new Map(), byMa: new Map() };

      for (const ln of nlLines) {
        const qty = Number(ln.so_luong);
        const nl  = this._lookupNguyenLieu(nlMap, ln);
        if (!nl) throw new Error(`Không tìm thấy nguyên liệu để nhập kho: ${ln.ma_nl || ln.ten_nl}`);
        await nguyen_lieu_col.updateOne({ _id: nl._id }, { $inc: { so_luong: qty } }, { session });
        console.log(`✅ Cộng kho: +${qty} [${nl.ma_nl || ln.ma_nl}] ${nl.ten_nl || ln.ten_nl || ""}`);
      }

      for (const ln of spLines) {
        const qty = Number(ln.so_luong);
        const sp  = this._lookupSanPham(spMap, ln);
        if (!sp) throw new Error(`Không tìm thấy sản phẩm để nhập kho: ${ln.ma_sp || ln.ten_sp}`);
        await san_pham_col.updateOne({ _id: sp._id }, { $inc: { so_luong: qty } }, { session });
        console.log(`✅ Cộng kho (SP): +${qty} [${sp.ma_sp || ln.ma_sp}] ${sp.ten_sp || ln.ten_sp || ""}`);
      }
      return;
    }

    // (3) PROD_RECEIPT: cộng TP + trừ NL theo BOM = san_pham.nguyen_lieu
    if (loai_don === ORDER_TYPE.PROD_RECEIPT) {
      const spLines = lines.filter(ln => ln.loai_hang === ITEM_TYPE.SAN_PHAM && Number(ln.so_luong) > 0);
      if (!spLines.length) return;

      // Batch fetch all san_pham
      const spMap = await this._batchFetchSanPham(spLines, { session });

      // Collect all ma_nl from all BOMs (batch fetch nguyen_lieu once)
      const maNLSet = new Set();
      for (const ln of spLines) {
        const sp = this._lookupSanPham(spMap, ln);
        if (!sp) throw new Error(`Không tìm thấy sản phẩm để nhập thành phẩm: ${ln.ma_sp || ln.ten_sp}`);
        const bomList = this._bomFromSanPhamDoc(sp);
        if (!bomList.length) throw new Error(`Chưa khai báo BOM cho sản phẩm: ${sp.ma_sp || sp.ten_sp}`);
        for (const b of bomList) if (b.ma_nl) maNLSet.add(String(b.ma_nl).trim());
      }

      const maNLs  = Array.from(maNLSet);
      const nlDocs = maNLs.length
        ? await nguyen_lieu_col.find({ ma_nl: { $in: maNLs } }, { session }).toArray()
        : [];
      const nlByMa = new Map(nlDocs.map(nl => [String(nl.ma_nl).trim(), nl]));

      for (const ln of spLines) {
        const qtyTP  = Number(ln.so_luong);
        const sp     = this._lookupSanPham(spMap, ln);
        const bomList = this._bomFromSanPhamDoc(sp);

        // Trừ kho nguyên liệu trước (fail ở đây thì không cộng TP)
        for (const b of bomList) {
          const need = (Number(b.dinh_muc) || 0) * qtyTP;
          if (need <= 0) continue;

          const nl = nlByMa.get(String(b.ma_nl).trim());
          if (!nl) throw new Error(`BOM không map được nguyên liệu: ${b.ma_nl || b.ten_nl || "?"}`);

          const res = await nguyen_lieu_col.updateOne(
            { _id: nl._id, so_luong: { $gte: need } },
            { $inc: { so_luong: -need } },
            { session }
          );

          if (res.matchedCount === 0) {
            const nl2 = await nguyen_lieu_col.findOne({ _id: nl._id }, { session });
            throw new Error(
              `Không đủ tồn nguyên liệu: ${nl2?.ma_nl || b.ma_nl} (cần=${need}, tồn=${nl2?.so_luong ?? 0})`
            );
          }
        }

        // Cộng kho thành phẩm
        await san_pham_col.updateOne(
          { _id: sp._id },
          { $inc: { so_luong: qtyTP } },
          { session }
        );
      }
      return;
    }
  }

  /* ====================== Needs API ====================== */
  static async getProductionNeeds(orderId, { session } = {}) {
    try {
      const _id = new ObjectId(String(orderId));
      const doc = await don_hang.findOne(
        { _id, loai_don: ORDER_TYPE.PROD_RECEIPT, trang_thai: { $ne: STATUS.DELETED } },
        { session }
      );
      if (!doc) return { error: new Error("Không tìm thấy đơn nhập sản xuất") };

      const lines = Array.isArray(doc.san_pham) ? doc.san_pham : [];
      const map = new Map(); // ma_nl -> {ma_nl, ten_nl, don_vi, so_luong_can}

      // Phase 2 fix: batch-fetch all san_pham before the loop (was N+1)
      const activeLines = lines.filter(ln =>
        (ln?.loai_hang || ITEM_TYPE.SAN_PHAM) === ITEM_TYPE.SAN_PHAM && Number(ln?.so_luong) > 0
      );
      const spMap = activeLines.length
        ? await this._batchFetchSanPham(activeLines, { session })
        : { byId: new Map(), byMa: new Map() };

      for (const ln of activeLines) {
        const qtyTP = Number(ln?.so_luong) || 0;

        const sp = this._lookupSanPham(spMap, ln);
        if (!sp) return { error: new Error(`Không tìm thấy sản phẩm: ${ln?.ma_sp || ln?.ten_sp}`) };

        const bomList = this._bomFromSanPhamDoc(sp);
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
        ? await nguyen_lieu_col
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
      console.error(`getProductionNeeds error: ${e}`);
      return { error: e };
    }
  }

  /* ====================== Status (kèm tồn kho + log) ====================== */
  static async capNhatTrangThaiVaTonKho(id, trang_thai_moi, { session, nguoi_thao_tac_id } = {}) {
    if (!Object.values(STATUS).includes(trang_thai_moi)) {
      return { error: new Error("Trạng thái không hợp lệ") };
    }

    const _id = new ObjectId(id);
    const doc = await don_hang.findOne({ _id }, { session });
    if (!doc) return { error: new Error("Không tìm thấy chứng từ") };

    if (doc.trang_thai === STATUS.DELETED) {
      return { error: new Error("Chứng từ đã xóa, không thể cập nhật") };
    }

    const transitions = this._getAllowedTransitions(doc.loai_don);
    const allowed = transitions[doc.trang_thai] || [];
    if (!allowed.includes(trang_thai_moi)) {
      return { error: new Error(`Không thể chuyển từ '${doc.trang_thai}' sang '${trang_thai_moi}'`) };
    }

    // PURCHASE_RECEIPT: cộng kho ngay khi "confirmed" (duyệt nhập hàng).
    // SALE / PROD_RECEIPT: vẫn xử lý kho khi "completed" như cũ.
    // Double-count guard: nếu PURCHASE_RECEIPT đã qua confirmed/paid → bỏ qua lần completed.
    const isPurchase = doc.loai_don === ORDER_TYPE.PURCHASE_RECEIPT;
    const purchaseAlreadyApplied =
      isPurchase &&
      trang_thai_moi === STATUS.COMPLETED &&
      [STATUS.CONFIRMED, STATUS.PAID].includes(doc.trang_thai);

    const shouldApplyInventory =
      !purchaseAlreadyApplied &&
      (trang_thai_moi === STATUS.COMPLETED ||
        (trang_thai_moi === STATUS.CONFIRMED && isPurchase));

    if (shouldApplyInventory) {
      await this._applyInventoryOnCompleted(doc, { session });
    }

    const now = new Date();
    const log = {
      hanh_dong: "status",
      from: doc.trang_thai,
      to: trang_thai_moi,
      at: now,
      by: toObjectId(nguoi_thao_tac_id) || doc.nguoi_lap_id,
    };

    const res = await don_hang.updateOne(
      { _id },
      {
        $set: { trang_thai: trang_thai_moi, updated_at: now },
        $push: { lich_su: log },
      },
      { session }
    );

    return { modifiedCount: res.modifiedCount };
  }

  /* ====================== Delete / Restore ====================== */
  static async softDeleteDonHang(id, { session } = {}) {
    const res = await don_hang.updateOne(
      { _id: new ObjectId(id) },
      { $set: { trang_thai: STATUS.DELETED, updated_at: new Date() } },
      { session }
    );
    return { modifiedCount: res.modifiedCount };
  }

  static async restoreDonHang(id, { session } = {}) {
    const res = await don_hang.updateOne(
      { _id: new ObjectId(id), trang_thai: STATUS.DELETED },
      { $set: { trang_thai: STATUS.DRAFT, updated_at: new Date() } },
      { session }
    );
    return { modifiedCount: res.modifiedCount };
  }

  static async hardDeleteDonHang(id) {
    try {
      const res = await don_hang.deleteOne({ _id: new ObjectId(id) });
      return { deletedCount: res.deletedCount };
    } catch (e) {
      console.error(`hardDeleteDonHang error: ${e}`);
      return { error: e };
    }
  }

  /* ====================== Reports ====================== */
  static async thongKeDoanhThu({ date_from, date_to } = {}) {
    try {
      const match = { loai_don: ORDER_TYPE.SALE, trang_thai: STATUS.COMPLETED };
      if (date_from || date_to) {
        match.created_at = {};
        if (date_from) match.created_at.$gte = new Date(date_from);
        if (date_to) match.created_at.$lte = new Date(date_to);
      }

      const [agg] = await don_hang
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              so_don: { $sum: 1 },
              doanh_thu: { $sum: "$tong_tien" },
              thue: { $sum: "$thue_tien" },
              giam_gia: { $sum: "$giam_gia" },
            },
          },
        ])
        .toArray();

      return {
        so_don: agg?.so_don || 0,
        doanh_thu: agg?.doanh_thu || 0,
        thue: agg?.thue || 0,
        giam_gia: agg?.giam_gia || 0,
      };
    } catch (e) {
      console.error(`thongKeDoanhThu error: ${e}`);
      return { error: e };
    }
  }
}
