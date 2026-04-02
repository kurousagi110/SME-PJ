import { ObjectId } from "mongodb";

let nguyen_lieu;

const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DELETED: "deleted",
};

/* ====================== Index Helpers ====================== */
function sameKey(a = {}, b = {}) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function isTextIndex(idx) {
  // text index key thường có _fts, _ftsx
  return !!idx?.key?._fts || Object.values(idx?.key || {}).includes("text");
}

function buildWeightsFromTextKey(keySpec = {}) {
  const w = {};
  for (const k of Object.keys(keySpec)) {
    if (keySpec[k] === "text") w[k] = 1;
  }
  return w;
}

async function ensureNormalIndex(col, keySpec, options = {}) {
  const indexes = await col.indexes();
  const existed = indexes.find((i) => sameKey(i.key, keySpec));

  // Nếu đã tồn tại cùng key:
  if (existed) {
    // Nếu unique/options khác nhau thì bỏ qua (tránh crash). Muốn rebuild thì tự drop ngoài DB.
    const wantUnique = !!options.unique;
    const haveUnique = !!existed.unique;
    if (wantUnique !== haveUnique) {
      console.warn(
        `[nguyen_lieu] Index key exists but unique mismatch. Skip. existing=${existed.name} wantUnique=${wantUnique}`
      );
    }
    return;
  }

  await col.createIndex(keySpec, options);
}

async function ensureTextIndex(col, keySpec, options = {}) {
  const rebuild = String(process.env.REBUILD_TEXT_INDEX || "").toLowerCase() === "true";
  const indexes = await col.indexes();

  const desiredWeights = options.weights || buildWeightsFromTextKey(keySpec);
  const desiredDefaultLang = options.default_language || "none";

  const existedText = indexes.find((i) => isTextIndex(i));

  // Nếu chưa có text index => tạo mới
  if (!existedText) {
    await col.createIndex(keySpec, {
      ...options,
      name: options.name || "search_text",
      default_language: desiredDefaultLang,
    });
    return;
  }

  // Nếu đã có text index => so cấu hình weights
  const existedWeights = existedText.weights || {};
  const weightsMatch =
    JSON.stringify(existedWeights) === JSON.stringify(desiredWeights);

  const defaultLangMatch =
    (existedText.default_language || "english") === desiredDefaultLang;

  // Nếu match thì ok
  if (weightsMatch && defaultLangMatch) return;

  // Nếu mismatch:
  if (!rebuild) {
    console.warn(
      `[nguyen_lieu] Text index already exists (${existedText.name}) with different options/fields. SKIP creating new. ` +
      `Set REBUILD_TEXT_INDEX=true to drop & recreate.`
    );
    return;
  }

  // rebuild: drop cũ rồi tạo mới
  try {
    await col.dropIndex(existedText.name);
    console.log(`[nguyen_lieu] Dropped old text index: ${existedText.name}`);
  } catch (e) {
    console.warn(`[nguyen_lieu] dropIndex failed: ${e?.message || e}`);
  }

  await col.createIndex(keySpec, {
    ...options,
    name: options.name || "search_text",
    default_language: desiredDefaultLang,
  });
  console.log(`[nguyen_lieu] Created text index: ${(options.name || "search_text")}`);
}

export default class NguyenLieuDAO {
  static async injectDB(conn) {
    if (nguyen_lieu) return;
    try {
      nguyen_lieu = await conn.db(process.env.DB_NAME).collection("nguyen_lieu");

      // Indexes (an toàn, không crash nếu đã tồn tại)
      await ensureNormalIndex(nguyen_lieu, { ma_nl: 1 }, { unique: true, name: "ma_nl_unique" });
      await ensureNormalIndex(nguyen_lieu, { trang_thai: 1, so_luong: 1 }, { name: "status_qty" });

      // ✅ Text search (chỉ 1 text index/collection)
      // Nếu DB đã có text index khác, mặc định sẽ SKIP tạo mới để tránh lỗi
      await ensureTextIndex(
        nguyen_lieu,
        { ma_nl: "text", ten_nl: "text", mo_ta: "text" },
        {
          name: "search_text",
          // bạn muốn tiếng Việt => set none để không bị stemming english
          default_language: "none",
          // có thể set weights nếu muốn ưu tiên:
          // weights: { ma_nl: 5, ten_nl: 3, mo_ta: 1 },
        }
      );
    } catch (e) {
      console.error(`Unable to establish collection handles: ${e}`);
    }
  }

  /* ====================== Helpers ====================== */
  static _n(v, def = 0) {
    const x = Number(v);
    return Number.isFinite(x) ? x : def;
  }

  static _s(v, def = "") {
    if (v === undefined || v === null) return def;
    return String(v).trim();
  }

  static _normalizeStatus(s) {
    return [STATUS.ACTIVE, STATUS.INACTIVE, STATUS.DELETED].includes(s) ? s : STATUS.ACTIVE;
  }

  /* ====================== Create ====================== */
  static async addNguyenLieu({
    ma_nl,
    ten_nl,
    don_vi,
    gia_nhap = 0,
    so_luong = 0,
    ton_toi_thieu = 0,
    mo_ta = "",
    thuoc_tinh = {},
  }) {
    const doc = {
      ma_nl: this._s(ma_nl),
      ten_nl: this._s(ten_nl),
      don_vi: this._s(don_vi),
      gia_nhap: this._n(gia_nhap, 0),
      so_luong: Math.max(0, this._n(so_luong, 0)),
      ton_toi_thieu: Math.max(0, this._n(ton_toi_thieu, 0)),
      mo_ta: this._s(mo_ta),
      thuoc_tinh: typeof thuoc_tinh === "object" && thuoc_tinh ? thuoc_tinh : {},
      trang_thai: STATUS.ACTIVE,
      createAt: new Date(),
      updateAt: new Date(),
    };

    try {
      const res = await nguyen_lieu.insertOne(doc);
      return { insertedId: res.insertedId };
    } catch (e) {
      if (e?.code === 11000) return { error: new Error("Mã nguyên liệu (ma_nl) đã tồn tại") };
      console.error(`addNguyenLieu error: ${e}`);
      return { error: e };
    }
  }

  /* ====================== Update ====================== */
  static async updateNguyenLieu(id, payload = {}) {
    try {
      const allow = {};
      const whitelist = [
        "ten_nl",
        "don_vi",
        "gia_nhap",
        "so_luong",
        "mo_ta",
        "thuoc_tinh",
        "ton_toi_thieu",
        "trang_thai",
      ];

      for (const k of whitelist) if (payload?.[k] !== undefined) allow[k] = payload[k];

      if (allow.ten_nl !== undefined) allow.ten_nl = this._s(allow.ten_nl);
      if (allow.don_vi !== undefined) allow.don_vi = this._s(allow.don_vi);
      if (allow.mo_ta !== undefined) allow.mo_ta = this._s(allow.mo_ta);

      if (allow.gia_nhap !== undefined) allow.gia_nhap = this._n(allow.gia_nhap, 0);
      if (allow.ton_toi_thieu !== undefined)
        allow.ton_toi_thieu = Math.max(0, this._n(allow.ton_toi_thieu, 0));
      if (allow.so_luong !== undefined) allow.so_luong = Math.max(0, this._n(allow.so_luong, 0));

      if (allow.trang_thai !== undefined) allow.trang_thai = this._normalizeStatus(allow.trang_thai);

      const res = await nguyen_lieu.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...allow, updateAt: new Date() } }
      );

      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`updateNguyenLieu error: ${e}`);
      return { error: e };
    }
  }

  /* ====================== Stock ====================== */
  static async adjustStock(id, deltaQty, { newUnitCost, allowNegative = false } = {}) {
  try {
    const d = Number(deltaQty);
    if (!Number.isFinite(d) || d === 0) return { modifiedCount: 0 };

    // ✅ DB của bạn: trang_thai = 1 (active), 0 (deleted)
    // => chỉ block deleted (0)
    const filter = { _id: new ObjectId(id), trang_thai: { $ne: 0 } };

    // ✅ nếu trừ kho và không cho âm => cần đủ tồn
    if (!allowNegative && d < 0) filter.so_luong = { $gte: Math.abs(d) };

    const set = { updateAt: new Date() };
    if (newUnitCost !== undefined) set.gia_nhap = this._n(newUnitCost, 0);

    const res = await nguyen_lieu.findOneAndUpdate(
      filter,
      { $inc: { so_luong: d }, $set: set },
      { returnDocument: "after" }
    );

    // ✅ debug backend (1 lần là thấy ngay filter không match vì sao)
    if (!res.value) {
      console.log("❌ adjustStock NOT MATCH", { id, deltaQty: d, allowNegative, filter });
      return { error: new Error("Không đủ tồn hoặc không tìm thấy nguyên liệu") };
    }

    // safety
    if (!allowNegative && res.value.so_luong < 0) {
      await nguyen_lieu.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { so_luong: -d }, $set: { updateAt: new Date() } }
      );
      return { error: new Error("Điều chỉnh kho không hợp lệ") };
    }

    return { ok: true, doc: res.value };
  } catch (e) {
    console.error(`adjustStock error: ${e}`);
    return { error: e };
  }
}


  /* ====================== Delete / Restore ====================== */
  static async softDelete(id) {
    try {
      const res = await nguyen_lieu.updateOne(
        { _id: new ObjectId(id) },
        { $set: { trang_thai: STATUS.DELETED, updateAt: new Date() } }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      return { error: e };
    }
  }

  static async restore(id) {
    try {
      const res = await nguyen_lieu.updateOne(
        { _id: new ObjectId(id) },
        { $set: { trang_thai: STATUS.ACTIVE, updateAt: new Date() } }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      return { error: e };
    }
  }

  /* ====================== Read ====================== */
  static async getById(id, { includeDeleted = false } = {}) {
    try {
      const filter = { _id: new ObjectId(id) };
      if (!includeDeleted) filter.trang_thai = { $ne: STATUS.DELETED };

      const doc = await nguyen_lieu.findOne(filter);
      return doc || { error: new Error("Không tìm thấy nguyên liệu") };
    } catch (e) {
      return { error: e };
    }
  }

  static async list({
    q = "",
    page = 1,
    limit = 20,
    status,
    lowStockOnly = false,
    sortBy = "ten_nl",
    order = "asc",
    includeDeleted = false,
  } = {}) {
    try {
      const filter = {};

      if (status && [STATUS.ACTIVE, STATUS.INACTIVE, STATUS.DELETED].includes(status)) {
        filter.trang_thai = status;
      } else if (!includeDeleted) {
        filter.trang_thai = { $ne: STATUS.DELETED };
      }

      if (lowStockOnly) {
        filter.$expr = { $lte: ["$so_luong", "$ton_toi_thieu"] };
      }

      const qTrim = (q || "").trim();
      const skip = Math.max(0, (Number(page) - 1) * Number(limit));
      const sortDir = order === "desc" ? -1 : 1;

      const safeSort = new Set(["createAt", "updateAt", "ten_nl", "ma_nl", "so_luong", "gia_nhap", "ton_toi_thieu"]);
      const sb = safeSort.has(sortBy) ? sortBy : "ten_nl";

      let items = [];
      let total = 0;

      if (qTrim) {
        try {
          const fText = { ...filter, $text: { $search: qTrim } };
          items = await nguyen_lieu
            .find(fText, { projection: { score: { $meta: "textScore" } } })
            .sort({ score: { $meta: "textScore" }, [sb]: sortDir })
            .skip(skip)
            .limit(Number(limit))
            .toArray();

          total = await nguyen_lieu.countDocuments(fText);

          if (!items.length) {
            const rx = new RegExp(qTrim, "i");
            const fRx = { ...filter, $or: [{ ma_nl: rx }, { ten_nl: rx }, { mo_ta: rx }] };
            items = await nguyen_lieu.find(fRx).sort({ [sb]: sortDir }).skip(skip).limit(Number(limit)).toArray();
            total = await nguyen_lieu.countDocuments(fRx);
          }
        } catch (e) {
          const rx = new RegExp(qTrim, "i");
          const fRx = { ...filter, $or: [{ ma_nl: rx }, { ten_nl: rx }, { mo_ta: rx }] };
          items = await nguyen_lieu.find(fRx).sort({ [sb]: sortDir }).skip(skip).limit(Number(limit)).toArray();
          total = await nguyen_lieu.countDocuments(fRx);
        }
      } else {
        items = await nguyen_lieu.find(filter).sort({ [sb]: sortDir }).skip(skip).limit(Number(limit)).toArray();
        total = await nguyen_lieu.countDocuments(filter);
      }

      return { items, page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) || 1 };
    } catch (e) {
      return { error: e };
    }
  }

  static async search(q, limit = 20) {
    try {
      const s = (q || "").trim();
      if (!s) return [];

      try {
        const docs = await nguyen_lieu
          .find(
            { $text: { $search: s }, trang_thai: { $ne: STATUS.DELETED } },
            { projection: { score: { $meta: "textScore" } } }
          )
          .sort({ score: { $meta: "textScore" } })
          .limit(Number(limit))
          .toArray();

        if (docs.length) return docs;
      } catch (e) { }

      const rx = new RegExp(s, "i");
      return await nguyen_lieu
        .find({ trang_thai: { $ne: STATUS.DELETED }, $or: [{ ma_nl: rx }, { ten_nl: rx }] })
        .sort({ ten_nl: 1 })
        .limit(Number(limit))
        .toArray();
    } catch (e) {
      console.error(`search nguyen_lieu error: ${e}`);
      return { error: e };
    }
  }
  // Trong NguyenLieuDAO.js (giả sử collection handle là nguyenLieu)
  static async getAllStock(params = {}) {
    try {
      const page = Math.max(1, Number(params.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(params.limit) || 20));
      const skip = (page - 1) * limit;

      const q = (params.q || "").trim();
      const statusFilter = (params.status || "").trim(); // "hết hàng" | "sắp hết" | "đủ hàng"

      const minQty =
        params.min_qty !== undefined && params.min_qty !== null
          ? Number(params.min_qty)
          : undefined;
      const maxQty =
        params.max_qty !== undefined && params.max_qty !== null
          ? Number(params.max_qty)
          : undefined;

      const sortBy = params.sortBy || "ten_nl";
      const sortDir = params.sortDir === "desc" ? -1 : 1;

      const pipeline = [];

      // ✅ 0) Lọc xóa mềm theo trang_thai (bạn có thể bỏ nếu muốn lấy all)
      pipeline.push({
        $match: { trang_thai: { $nin: [0, "deleted"] } },
      });

      // 1) Search q (ma_nl / ten_nl)
      if (q) {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        pipeline.push({
          $match: { $or: [{ ma_nl: regex }, { ten_nl: regex }] },
        });
      }

      // 2) Normalize numbers
      pipeline.push({
        $addFields: {
          so_luong_num: { $toDouble: { $ifNull: ["$so_luong", 0] } },
          gia_nhap_num: { $toDouble: { $ifNull: ["$gia_nhap", 0] } },
          ton_toi_thieu_num: { $toDouble: { $ifNull: ["$ton_toi_thieu", 0] } },
        },
      });

      pipeline.push({
        $addFields: {
          ton_toi_thieu_num: { $max: [0, "$ton_toi_thieu_num"] },
        },
      });

      // 3) status_eff: giữ status nếu đã có, chưa có thì tự tính theo tồn tối thiểu
      pipeline.push({
        $addFields: {
          status_eff: {
            $cond: [
              {
                $and: [
                  { $ne: ["$status", null] },
                  { $ne: [{ $trim: { input: "$status" } }, ""] },
                ],
              },
              "$status",
              {
                $cond: [
                  { $eq: ["$so_luong_num", 0] },
                  "hết hàng",
                  {
                    $cond: [
                      { $lt: ["$so_luong_num", "$ton_toi_thieu_num"] },
                      "sắp hết",
                      "đủ hàng",
                    ],
                  },
                ],
              },
            ],
          },
        },
      });

      // 4) Filter theo số lượng
      const qtyMatch = {};
      if (Number.isFinite(minQty)) qtyMatch.$gte = minQty;
      if (Number.isFinite(maxQty)) qtyMatch.$lte = maxQty;
      if (Object.keys(qtyMatch).length) pipeline.push({ $match: { so_luong_num: qtyMatch } });

      // 5) Filter theo status
      if (statusFilter) pipeline.push({ $match: { status_eff: statusFilter } });

      // 6) Sort
      const sortMap = {
        so_luong: "so_luong_num",
        gia_nhap: "gia_nhap_num",
        ten_nl: "ten_nl",
        ma_nl: "ma_nl",
        don_vi: "don_vi",
      };
      pipeline.push({ $sort: { [sortMap[sortBy] || "ten_nl"]: sortDir } });

      // 7) Paginate
      pipeline.push({
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                ma_nl: 1,
                ten_nl: 1,
                don_vi: 1,
                mo_ta: 1,
                so_luong: "$so_luong_num",
                gia_nhap: "$gia_nhap_num",
                ton_toi_thieu: "$ton_toi_thieu_num",
                status: "$status_eff", // ✅ đúng field
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      });

      const [res] = await nguyen_lieu.aggregate(pipeline).toArray();
      const items = res?.data || [];
      const total = res?.total?.[0]?.count || 0;
      const total_pages = Math.ceil(total / limit) || 1;

      return { items, pagination: { page, limit, total, total_pages } };
    } catch (e) {
      console.error(`Unable to get all stock nguyen lieu: ${e}`);
      return { error: e };
    }
  }


}



export { STATUS };
