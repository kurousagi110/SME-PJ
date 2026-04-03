import { ObjectId } from "mongodb";

export const DCK_STATUS = {
  CHO_DUYET: "cho_duyet",
  DA_DUYET:  "da_duyet",
  TU_CHOI:   "tu_choi",
};

let col = null;

export default class DieuChinhKhoDAO {
  static async injectDB(conn) {
    if (col) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    col = conn.db(dbName).collection("dieu_chinh_kho");
  }

  /**
   * createPhieu — insert a new adjustment request.
   * Does NOT touch ton_kho until approved.
   */
  static async createPhieu({
    loai,
    item_id,
    ma_hang,
    ten_hang,
    so_luong_dieu_chinh,
    ton_kho_truoc,
    ly_do,
    created_by,
  }) {
    const now = new Date();
    const doc = {
      loai,
      item_id: new ObjectId(item_id),
      ma_hang,
      ten_hang,
      so_luong_dieu_chinh: Number(so_luong_dieu_chinh),
      ton_kho_truoc: Number(ton_kho_truoc),
      ly_do,
      trang_thai: DCK_STATUS.CHO_DUYET,
      created_by,       // { tai_khoan, ho_ten }
      approved_by: null,
      created_at: now,
      updated_at: now,
    };
    return col.insertOne(doc);
  }

  /**
   * getAll — paginated list with optional filters.
   */
  static async getAll({ loai, trang_thai, page = 1, limit = 20 } = {}) {
    const filter = {};
    if (loai)       filter.loai       = loai;
    if (trang_thai) filter.trang_thai = trang_thai;

    const pageNum  = Math.max(1, Number(page)  || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const skip     = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      col.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum).toArray(),
      col.countDocuments(filter),
    ]);
    return { items, total, page: pageNum, limit: limitNum };
  }

  static async getById(id) {
    if (!id || !ObjectId.isValid(id)) return null;
    return col.findOne({ _id: new ObjectId(id) });
  }

  /**
   * approve — atomically set status to da_duyet.
   * Controller is responsible for adjusting inventory before calling this.
   */
  static async approve(id, approvedBy) {
    if (!ObjectId.isValid(id)) return null;
    return col.findOneAndUpdate(
      { _id: new ObjectId(id), trang_thai: DCK_STATUS.CHO_DUYET },
      {
        $set: {
          trang_thai:  DCK_STATUS.DA_DUYET,
          approved_by: approvedBy,
          updated_at:  new Date(),
        },
      },
      { returnDocument: "after" }
    );
  }

  static async reject(id, rejectedBy) {
    if (!ObjectId.isValid(id)) return null;
    return col.findOneAndUpdate(
      { _id: new ObjectId(id), trang_thai: DCK_STATUS.CHO_DUYET },
      {
        $set: {
          trang_thai:  DCK_STATUS.TU_CHOI,
          approved_by: rejectedBy,
          updated_at:  new Date(),
        },
      },
      { returnDocument: "after" }
    );
  }
}
