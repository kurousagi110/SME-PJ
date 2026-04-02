import { ObjectId } from "mongodb";

let sanPham;

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
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

function isTextIndex(idx) {
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
  if (existed) {
    const wantUnique = !!options.unique;
    const haveUnique = !!existed.unique;
    if (wantUnique !== haveUnique) {
      console.warn(
        `[san_pham] Index key exists but unique mismatch. Skip. existing=${existed.name} wantUnique=${wantUnique}`
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

  if (!existedText) {
    await col.createIndex(keySpec, {
      ...options,
      name: options.name || "search_text",
      default_language: desiredDefaultLang,
    });
    return;
  }

  const existedWeights = existedText.weights || {};
  const weightsMatch = JSON.stringify(existedWeights) === JSON.stringify(desiredWeights);
  const defaultLangMatch = (existedText.default_language || "english") === desiredDefaultLang;

  if (weightsMatch && defaultLangMatch) return;

  if (!rebuild) {
    console.warn(
      `[san_pham] Text index already exists (${existedText.name}) with different options/fields. SKIP creating new. ` +
      `Set REBUILD_TEXT_INDEX=true to drop & recreate.`
    );
    return;
  }

  try {
    await col.dropIndex(existedText.name);
    console.log(`[san_pham] Dropped old text index: ${existedText.name}`);
  } catch (e) {
    console.warn(`[san_pham] dropIndex failed: ${e?.message || e}`);
  }

  await col.createIndex(keySpec, {
    ...options,
    name: options.name || "search_text",
    default_language: desiredDefaultLang,
  });
  console.log(`[san_pham] Created text index: ${(options.name || "search_text")}`);
}

export default class SanPhamDAO {
  static async injectDB(conn) {
    if (sanPham) return;
    try {
      sanPham = await conn.db(process.env.DB_NAME).collection("san_pham");

      // Indexes quan trọng
      await ensureNormalIndex(sanPham, { ma_sp: 1 }, { unique: true, name: "ma_sp_unique" });
      await ensureNormalIndex(sanPham, { trang_thai: 1, so_luong: 1 }, { name: "status_qty" });

      // ✅ Text search (chỉ 1 text index/collection)
      // tên SP + mô tả + nguyên liệu
      await ensureTextIndex(
        sanPham,
        {
          ten_sp: "text",
          mo_ta: "text",
          "nguyen_lieu.ten": "text",
          "nguyen_lieu.mota": "text",
        },
        {
          name: "search_text",
          default_language: "none",
        }
      );

      // Query theo nguyên liệu (non-text) vẫn ok tạo riêng
      await ensureNormalIndex(sanPham, { "nguyen_lieu.ten": 1 }, { name: "bom_nl_ten" });
    } catch (e) {
      console.error(`Unable to establish collection handles: ${e}`);
    }
  }

  /* ====================== Helpers ====================== */
  static _sanitizeNumber(n, def = 0) {
    const v = Number(n);
    return Number.isFinite(v) ? v : def;
  }

  static _sanitizeString(s, def = "") {
    if (s === undefined || s === null) return def;
    return String(s).trim();
  }

  static _normalizeStatus(s) {
    return [STATUS.ACTIVE, STATUS.INACTIVE, STATUS.DELETED].includes(s) ? s : STATUS.ACTIVE;
  }

  static _normalizeNguyenLieu(input) {
    if (!Array.isArray(input)) return [];

    const out = [];
    for (const it of input) {
      if (!it || typeof it !== "object") continue;

      const ten = this._sanitizeString(it.ten);
      if (!ten) continue;

      const mota = this._sanitizeString(it.mota);
      const don_vi = this._sanitizeString(it.don_vi);
      const so_luong = Math.max(0, this._sanitizeNumber(it.so_luong, 0));

      // ✅ NEW: optional field
      const ma_nl = this._sanitizeString(it.ma_nl);

      out.push({
        ten,
        mota,
        so_luong,
        don_vi,
        ...(ma_nl ? { ma_nl } : {}), // ⭐ không có thì bỏ
      });
    }
    return out;
  }


  static _allowUpdateFields(payload, allowed) {
    const out = {};
    for (const k of allowed) {
      if (payload?.[k] !== undefined) out[k] = payload[k];
    }
    return out;
  }

  /* ====================== Create ====================== */
  static async addSanPham(ma_sp, ten_sp, don_gia, so_luong = 0, mo_ta = "", nguyen_lieu = []) {
    const doc = {
      ma_sp: this._sanitizeString(ma_sp),
      ten_sp: this._sanitizeString(ten_sp),
      don_gia: this._sanitizeNumber(don_gia, 0),
      so_luong: Math.max(0, this._sanitizeNumber(so_luong, 0)),
      mo_ta: this._sanitizeString(mo_ta),
      nguyen_lieu: this._normalizeNguyenLieu(nguyen_lieu),
      createAt: new Date(),
      updateAt: new Date(),
      trang_thai: STATUS.ACTIVE,
    };

    try {
      const res = await sanPham.insertOne(doc);
      return { insertedId: res.insertedId };
    } catch (e) {
      if (e?.code === 11000) return { error: new Error("Mã sản phẩm (ma_sp) đã tồn tại") };
      console.error(`Unable to add sanPham: ${e}`);
      return { error: e };
    }
  }

  /* ====================== Update ====================== */
  static async updateSanPham(id, payload) {
    try {
      const allowed = this._allowUpdateFields(payload, [
        "ten_sp",
        "don_gia",
        "so_luong",
        "mo_ta",
        "nguyen_lieu",
        "trang_thai",
      ]);

      if (allowed.ten_sp !== undefined) allowed.ten_sp = this._sanitizeString(allowed.ten_sp);
      if (allowed.don_gia !== undefined) allowed.don_gia = this._sanitizeNumber(allowed.don_gia, 0);
      if (allowed.so_luong !== undefined) allowed.so_luong = Math.max(0, this._sanitizeNumber(allowed.so_luong, 0));
      if (allowed.mo_ta !== undefined) allowed.mo_ta = this._sanitizeString(allowed.mo_ta);

      if (allowed.nguyen_lieu !== undefined) {
        allowed.nguyen_lieu = this._normalizeNguyenLieu(allowed.nguyen_lieu);
      }

      if (allowed.trang_thai !== undefined) {
        allowed.trang_thai = this._normalizeStatus(allowed.trang_thai);
      }

      const res = await sanPham.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...allowed, updateAt: new Date() } }
      );

      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`Unable to update sanPham: ${e}`);
      return { error: e };
    }
  }

  static async setStatus(id, status) {
    const setTo = this._normalizeStatus(status);
    try {
      const res = await sanPham.updateOne(
        { _id: new ObjectId(id) },
        { $set: { trang_thai: setTo, updateAt: new Date() } }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`Unable to set status: ${e}`);
      return { error: e };
    }
  }

  /* ====================== Delete / Restore ====================== */
  static async softDeleteSanPham(id) {
    try {
      const res = await sanPham.updateOne(
        { _id: new ObjectId(id) },
        { $set: { trang_thai: STATUS.DELETED, updateAt: new Date() } }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`Unable to soft delete sanPham: ${e}`);
      return { error: e };
    }
  }

  static async restoreSanPham(id) {
    try {
      const res = await sanPham.updateOne(
        { _id: new ObjectId(id) },
        { $set: { trang_thai: STATUS.ACTIVE, updateAt: new Date() } }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`Unable to restore sanPham: ${e}`);
      return { error: e };
    }
  }

  static async hardDeleteSanPham(id) {
    try {
      const res = await sanPham.deleteOne({ _id: new ObjectId(id) });
      return { deletedCount: res.deletedCount };
    } catch (e) {
      console.error(`Unable to hard delete sanPham: ${e}`);
      return { error: e };
    }
  }

  /* ====================== Read ====================== */
  static async getSanPhamById(id, { includeDeleted = false } = {}) {
    try {
      const filter = { _id: new ObjectId(id) };
      if (!includeDeleted) filter.trang_thai = { $ne: STATUS.DELETED };

      const doc = await sanPham.findOne(filter);
      if (!doc) return { error: new Error("Không tìm thấy sản phẩm") };
      return doc;
    } catch (e) {
      console.error(`Unable to get sanPham by id: ${e}`);
      return { error: e };
    }
  }

  static async listSanPham({
    q = "",
    minPrice,
    maxPrice,
    status,
    page = 1,
    limit = 20,
    sortBy = "createAt",
    order = "desc",
    includeDeleted = false,
  } = {}) {
    try {
      const filter = {};

      if (status && [STATUS.ACTIVE, STATUS.INACTIVE, STATUS.DELETED].includes(status)) {
        filter.trang_thai = status;
      } else if (!includeDeleted) {
        filter.trang_thai = { $ne: STATUS.DELETED };
      }

      const priceFilter = {};
      if (minPrice !== undefined) priceFilter.$gte = this._sanitizeNumber(minPrice, 0);
      if (maxPrice !== undefined) priceFilter.$lte = this._sanitizeNumber(maxPrice, 0);
      if (Object.keys(priceFilter).length) filter.don_gia = priceFilter;

      const skip = Math.max(0, (Number(page) - 1) * Number(limit));
      const sortDir = order === "asc" ? 1 : -1;

      const safeSortFields = new Set(["createAt", "updateAt", "don_gia", "so_luong", "ten_sp", "ma_sp"]);
      const sb = safeSortFields.has(sortBy) ? sortBy : "createAt";

      const qTrim = (q || "").trim();
      let items = [];
      let total = 0;

      if (qTrim) {
        try {
          const filterText = { ...filter, $text: { $search: qTrim } };
          items = await sanPham
            .find(filterText, { projection: { score: { $meta: "textScore" } } })
            .sort({ score: { $meta: "textScore" }, [sb]: sortDir })
            .skip(skip)
            .limit(Number(limit))
            .toArray();

          total = await sanPham.countDocuments(filterText);

          if (!items.length) {
            const regex = new RegExp(qTrim, "i");
            const filterRegex = {
              ...filter,
              $or: [
                { ten_sp: regex },
                { mo_ta: regex },
                { "nguyen_lieu.ten": regex },
                { "nguyen_lieu.mota": regex },
              ],
            };
            items = await sanPham.find(filterRegex).sort({ [sb]: sortDir }).skip(skip).limit(Number(limit)).toArray();
            total = await sanPham.countDocuments(filterRegex);
          }
        } catch (err) {
          const regex = new RegExp(qTrim, "i");
          const filterRegex = {
            ...filter,
            $or: [
              { ten_sp: regex },
              { mo_ta: regex },
              { "nguyen_lieu.ten": regex },
              { "nguyen_lieu.mota": regex },
            ],
          };
          items = await sanPham.find(filterRegex).sort({ [sb]: sortDir }).skip(skip).limit(Number(limit)).toArray();
          total = await sanPham.countDocuments(filterRegex);
        }
      } else {
        items = await sanPham.find(filter).sort({ [sb]: sortDir }).skip(skip).limit(Number(limit)).toArray();
        total = await sanPham.countDocuments(filter);
      }

      return { items, page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) || 1 };
    } catch (e) {
      console.error(`Unable to list sanPham: ${e}`);
      return { error: e };
    }
  }

  static async searchSanPham(keywords, limit = 20) {
    try {
      const q = (keywords || "").trim();
      if (!q) return [];

      try {
        const docs = await sanPham
          .find(
            { $text: { $search: q }, trang_thai: { $ne: STATUS.DELETED } },
            { projection: { score: { $meta: "textScore" } } }
          )
          .sort({ score: { $meta: "textScore" } })
          .limit(Number(limit))
          .toArray();
        if (docs.length) return docs;
      } catch (e) { }

      const regex = new RegExp(q, "i");
      return await sanPham
        .find({
          trang_thai: { $ne: STATUS.DELETED },
          $or: [{ ten_sp: regex }, { mo_ta: regex }, { "nguyen_lieu.ten": regex }, { "nguyen_lieu.mota": regex }],
        })
        .limit(Number(limit))
        .toArray();
    } catch (e) {
      console.error(`Unable to search sanPham: ${e}`);
      return { error: e };
    }
  }

  /* ====================== Stock ====================== */
  static async adjustStock(id, deltaQty, { allowNegative = false, newPrice, newMinStock, newDonVi } = {}) {
    try {
      const d = Number(deltaQty);
      if (!Number.isFinite(d) || d === 0) return { modifiedCount: 0 };

      const filter = { _id: new ObjectId(id), trang_thai: { $ne: STATUS.DELETED } };
      if (!allowNegative && d < 0) filter.so_luong = { $gte: Math.abs(d) };

      const set = { updateAt: new Date() };

      // ✅ optional: update giá/ton tối thiểu/đơn vị nếu muốn
      if (newPrice !== undefined) set.don_gia = this._sanitizeNumber(newPrice, 0);
      if (newMinStock !== undefined) set.ton_toi_thieu = this._sanitizeNumber(newMinStock, 0);
      if (newDonVi !== undefined) set.don_vi = String(newDonVi);

      const res = await sanPham.findOneAndUpdate(
        filter,
        { $inc: { so_luong: d }, $set: set },
        { returnDocument: "after" }
      );

      if (!res.value) return { error: new Error("Không đủ tồn hoặc không tìm thấy sản phẩm") };

      // ✅ safety
      if (!allowNegative && res.value.so_luong < 0) {
        await sanPham.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { so_luong: -d }, $set: { updateAt: new Date() } }
        );
        return { error: new Error("Điều chỉnh kho không hợp lệ") };
      }

      return { ok: true, doc: res.value };
    } catch (e) {
      console.error(`sanPham.adjustStock error: ${e}`);
      return { error: e };
    }
  }
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

      const sortBy = params.sortBy || "ten_sp"; // "so_luong" | "ten_sp" | "ma_sp" | "don_gia"
      const sortDir = params.sortDir === "desc" ? -1 : 1;

      const pipeline = [];

      // 1) Search q
      if (q) {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        pipeline.push({
          $match: { $or: [{ ma_sp: regex }, { ten_sp: regex }] },
        });
      }

      // 2) Normalize number fields (DB đã có ton_toi_thieu -> chỉ convert để so sánh)
      pipeline.push({
        $addFields: {
          so_luong_num: { $toDouble: { $ifNull: ["$so_luong", 0] } },
          don_gia_num: { $toDouble: { $ifNull: ["$don_gia", 0] } },
          ton_toi_thieu_num: { $toDouble: { $ifNull: ["$ton_toi_thieu", 0] } },
        },
      });

      // clamp ton_toi_thieu >= 0 (an toàn)
      pipeline.push({
        $addFields: {
          ton_toi_thieu_num: { $max: [0, "$ton_toi_thieu_num"] },
        },
      });

      // 3) status_eff: giữ status nếu đã có, chưa có thì tự tính theo ton_toi_thieu
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
      if (Object.keys(qtyMatch).length) {
        pipeline.push({ $match: { so_luong_num: qtyMatch } });
      }

      // 5) Filter theo status
      if (statusFilter) {
        pipeline.push({ $match: { status_eff: statusFilter } });
      }

      // 6) Sort
      const sortMap = {
        so_luong: "so_luong_num",
        don_gia: "don_gia_num",
        ten_sp: "ten_sp",
        ma_sp: "ma_sp",
        don_vi: "don_vi",
      };
      pipeline.push({ $sort: { [sortMap[sortBy] || "ten_sp"]: sortDir } });

      // 7) Paginate
      pipeline.push({
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                ma_sp: 1,
                ten_sp: 1,
                don_vi: 1,
                so_luong: "$so_luong_num",
                don_gia: "$don_gia_num",
                ton_toi_thieu: "$ton_toi_thieu_num",
                status: "$status_eff",
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      });

      const [res] = await sanPham.aggregate(pipeline).toArray();
      const items = res?.data || [];
      const total = res?.total?.[0]?.count || 0;
      const total_pages = Math.ceil(total / limit) || 1;

      return {
        items,
        pagination: { page, limit, total, total_pages },
      };
    } catch (e) {
      console.error(`Unable to get all stock: ${e}`);
      return { error: e };
    }
  }


}
export { STATUS };
