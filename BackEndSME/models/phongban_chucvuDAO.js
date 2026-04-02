import { ObjectId } from "mongodb";

let phongban_chucvu;

const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DELETED: "deleted",
};

export default class phongban_chucvuDAO {
  static async injectDB(conn) {
    if (phongban_chucvu) return;
    try {
      phongban_chucvu = await conn
        .db(process.env.DB_NAME)
        .collection("phongban_chucvu");

      // Tên phòng ban không trùng
      await phongban_chucvu.createIndex(
        { ten_phong_ban: 1 },
        { unique: true }
      );

      // Lọc nhanh theo trạng thái
      await phongban_chucvu.createIndex({ trang_thai: 1 });

      // Tìm kiếm theo tên phòng ban / tên chức vụ
      await phongban_chucvu.createIndex({
        ten_phong_ban: "text",
        "chuc_vu.ten_chuc_vu": "text",
      });
    } catch (e) {
      console.error(`Unable to establish collection handles: ${e}`);
    }
  }

  /* ========== Helpers ========== */
  static _sanitizeNumber(v, def = 0) {
    const x = Number(v);
    return Number.isFinite(x) ? x : def;
  }

  static _normalizeChucVu(chuc_vu) {
    if (!chuc_vu) return [];
    const arr = Array.isArray(chuc_vu) ? chuc_vu : [chuc_vu];

    return arr
      .filter((cv) => cv && (cv.ten_chuc_vu || "").trim())
      .map((cv) => ({
        _id: new ObjectId(),
        ten_chuc_vu: String(cv.ten_chuc_vu || "").trim(),
        mo_ta: String(cv.mo_ta || "").trim(),
        he_so_luong: this._sanitizeNumber(cv.he_so_luong, 1),
        trang_thai: STATUS.ACTIVE,
        createAt: new Date(),
        updateAt: new Date(),
      }));
  }

  /* ========== CREATE ========== */
  static async addPhongBanChucVu(tenPhongBan, mo_ta, chuc_vu = []) {
    const chucVuArr = this._normalizeChucVu(chuc_vu);

    const doc = {
      ten_phong_ban: String(tenPhongBan || "").trim(),
      mo_ta: String(mo_ta || "").trim(),
      chuc_vu: chucVuArr,       // mảng chức vụ
      trang_thai: STATUS.ACTIVE,
      createAt: new Date(),
      updateAt: new Date(),
    };

    try {
      const check = await phongban_chucvu.findOne({ ten_phong_ban: doc.ten_phong_ban });
      if (check && check.trang_thai !== STATUS.DELETED) {
        const res = await phongban_chucvu.updateOne(
          { _id: check._id },
          {
            $set: {
              mo_ta: doc.mo_ta,
              updateAt: new Date(),
              trang_thai: STATUS.ACTIVE,
            },
          }
        );
        return { insertedId: res._id };
      }
      const res = await phongban_chucvu.insertOne(doc);
      return { insertedId: res.insertedId };
    } catch (e) {
      if (e?.code === 11000) {
        return { error: new Error("Tên phòng ban đã tồn tại") };
      }
      console.error(`addPhongBanChucVu error: ${e}`);
      return { error: e };
    }
  }

  /* ========== READ ========== */
  static async getById(id, { includeDeleted = false } = {}) {
    try {
      const filter = { _id: new ObjectId(id) };
      if (!includeDeleted) filter.trang_thai = { $ne: STATUS.DELETED };

      const doc = await phongban_chucvu.findOne(filter);
      if (!doc) return { error: new Error("Không tìm thấy phòng ban") };
      return doc;
    } catch (e) {
      console.error(`getById error: ${e}`);
      return { error: e };
    }
  }

  static async list({
    q = "",
    status,
    page = 1,
    limit = 20,
  } = {}) {
    try {
      const filter = {};
      if (status) {
        filter.trang_thai = status;
      } else {
        filter.trang_thai = { $ne: STATUS.DELETED };
      }

      if (q && q.trim()) {
        filter.$or = [
          { ten_phong_ban: { $regex: q.trim(), $options: "i" } },
          { "chuc_vu.ten_chuc_vu": { $regex: q.trim(), $options: "i" } },
        ];
      }

      const skip = Math.max(0, (Number(page) - 1) * Number(limit));

      const [items, total] = await Promise.all([
        phongban_chucvu
          .find(filter)
          .sort({ ten_phong_ban: 1 })
          .skip(skip)
          .limit(Number(limit))
          .toArray(),
        phongban_chucvu.countDocuments(filter),
      ]);

      return {
        items,
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      };
    } catch (e) {
      console.error(`list phongban_chucvu error: ${e}`);
      return { error: e };
    }
  }

  /* ========== get all PHÒNG BAN ========== */
  static async getAllPhongBan({ includeDeleted = false } = {}) {
    try {
      const filter = {};
      if (!includeDeleted) filter.trang_thai = { $ne: STATUS.DELETED };
      const items = await phongban_chucvu.find(filter).toArray();
      return items;
    } catch (e) {
      console.error(`getAllPhongBan error: ${e}`);
      return { error: e };
    }
  }

  /* ========== UPDATE PHÒNG BAN ========== */
  static async updatePhongBan(id, payload = {}) {
    const allowed = {};
    ["ten_phong_ban", "mo_ta", "trang_thai"].forEach((k) => {
      if (payload[k] !== undefined) allowed[k] = payload[k];
    });

    if (!Object.keys(allowed).length) {
      return { error: new Error("Không có trường hợp lệ để cập nhật") };
    }

    allowed.updateAt = new Date();

    try {
      const res = await phongban_chucvu.updateOne(
        { _id: new ObjectId(id) },
        { $set: allowed }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`updatePhongBan error: ${e}`);
      return { error: e };
    }
  }

  /* ========== SOFT DELETE / RESTORE / HARD DELETE ========== */
  static async softDeletePhongBan(id) {
    try {
      const res = await phongban_chucvu.updateOne(
        { _id: new ObjectId(id) },
        { $set: { trang_thai: STATUS.DELETED, updateAt: new Date() } }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`softDeletePhongBan error: ${e}`);
      return { error: e };
    }
  }

  static async restorePhongBan(id) {
    try {
      const res = await phongban_chucvu.updateOne(
        { _id: new ObjectId(id), trang_thai: STATUS.DELETED },
        { $set: { trang_thai: STATUS.ACTIVE, updateAt: new Date() } }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`restorePhongBan error: ${e}`);
      return { error: e };
    }
  }

  static async hardDeletePhongBan(id) {
    try {
      const res = await phongban_chucvu.deleteOne({ _id: new ObjectId(id) });
      return { deletedCount: res.deletedCount };
    } catch (e) {
      console.error(`hardDeletePhongBan error: ${e}`);
      return { error: e };
    }
  }

  /* ========== CHỨC VỤ TRONG PHÒNG BAN ========== */

  // Thêm 1 chức vụ vào phòng ban
  static async addChucVu(idPhongBan, chucVuData) {
    const [cv] = this._normalizeChucVu(chucVuData);
    if (!cv) return { error: new Error("Thiếu thông tin chức vụ hợp lệ") };

    try {
      const res = await phongban_chucvu.updateOne(
        { _id: new ObjectId(idPhongBan), trang_thai: { $ne: STATUS.DELETED } },
        { $push: { chuc_vu: cv }, $set: { updateAt: new Date() } }
      );
      return { modifiedCount: res.modifiedCount, chuc_vu_id: cv._id };
    } catch (e) {
      console.error(`addChucVu error: ${e}`);
      return { error: e };
    }
  }

  // Cập nhật 1 chức vụ (theo id chức vụ)
  static async updateChucVu(idPhongBan, idChucVu, payload = {}) {
    const $set = {};
    if (payload.ten_chuc_vu !== undefined)
      $set["chuc_vu.$[cv].ten_chuc_vu"] = String(payload.ten_chuc_vu || "").trim();
    if (payload.mo_ta !== undefined)
      $set["chuc_vu.$[cv].mo_ta"] = String(payload.mo_ta || "").trim();
    if (payload.he_so_luong !== undefined)
      $set["chuc_vu.$[cv].he_so_luong"] = this._sanitizeNumber(payload.he_so_luong, 1);
    if (payload.trang_thai !== undefined)
      $set["chuc_vu.$[cv].trang_thai"] = payload.trang_thai;

    if (!Object.keys($set).length) {
      return { error: new Error("Không có trường nào để cập nhật") };
    }
    $set.updateAt = new Date();

    try {
      const res = await phongban_chucvu.updateOne(
        { _id: new ObjectId(idPhongBan) },
        { $set },
        {
          arrayFilters: [{ "cv._id": new ObjectId(idChucVu) }],
        }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`updateChucVu error: ${e}`);
      return { error: e };
    }
  }

  // Xoá 1 chức vụ khỏi phòng ban
  static async removeChucVu(idPhongBan, idChucVu) {
    try {
      const res = await phongban_chucvu.updateOne(
        { _id: new ObjectId(idPhongBan) },
        {
          $pull: {
            chuc_vu: { _id: new ObjectId(idChucVu) },
          },
          $set: { updateAt: new Date() },
        }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`removeChucVu error: ${e}`);
      return { error: e };
    }
  }

  // Set trạng thái riêng cho 1 chức vụ
  static async setTrangThaiChucVu(idPhongBan, idChucVu, trang_thai) {
    if (!Object.values(STATUS).includes(trang_thai)) {
      return { error: new Error("Trạng thái không hợp lệ") };
    }
    try {
      const res = await phongban_chucvu.updateOne(
        { _id: new ObjectId(idPhongBan) },
        {
          $set: {
            "chuc_vu.$[cv].trang_thai": trang_thai,
            updateAt: new Date(),
          },
        },
        {
          arrayFilters: [{ "cv._id": new ObjectId(idChucVu) }],
        }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`setTrangThaiChucVu error: ${e}`);
      return { error: e };
    }
  }
}
