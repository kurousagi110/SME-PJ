import { ObjectId } from "mongodb";
import NguyenLieuDAO from "./nguyenLieuDAO.js";
import SanPhamDAO from "./sanPhamDAO.js";

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
   * Optional `session` for transactional callers (mongoClient.startSession()).
   */
  static async approve(id, approvedBy, { session = null } = {}) {
    if (!ObjectId.isValid(id)) return null;
    const opts = { returnDocument: "after" };
    if (session) opts.session = session;
    return col.findOneAndUpdate(
      { _id: new ObjectId(id), trang_thai: DCK_STATUS.CHO_DUYET },
      {
        $set: {
          trang_thai:  DCK_STATUS.DA_DUYET,
          approved_by: approvedBy,
          updated_at:  new Date(),
        },
      },
      opts
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

  /**
   * revertToChoDuyet — fallback compensation khi transaction không khả dụng.
   * Rollback phiếu về cho_duyet (kèm lý do rollback) để admin xử lý lại.
   * Chỉ revert nếu hiện tại đang ở DA_DUYET (không revert TU_CHOI / DA_DUYET cũ).
   */
  static async revertToChoDuyet(id, actor, reason) {
    if (!ObjectId.isValid(id)) return null;
    return col.findOneAndUpdate(
      { _id: new ObjectId(id), trang_thai: DCK_STATUS.DA_DUYET },
      {
        $set: {
          trang_thai:  DCK_STATUS.CHO_DUYET,
          approved_by: null,
          updated_at:  new Date(),
          ghi_chu_rollback: `Rollback bởi ${actor?.tai_khoan || "system"}: ${reason || "lỗi không xác định"}`,
        },
      },
      { returnDocument: "after" }
    );
  }

  /**
   * duyetPhieu — atomic approve and adjust inventory for Unified Approval Hub
   */
  static async duyetPhieu(id, user = {}) {
    if (!ObjectId.isValid(id)) throw new Error("ID phiếu không hợp lệ");
    const phieu = await this.getById(id);
    if (!phieu) throw new Error("Không tìm thấy phiếu điều chỉnh kho");
    if (phieu.trang_thai !== DCK_STATUS.CHO_DUYET) {
      throw new Error("Phiếu đã được xử lý trước đó");
    }

    const approvedBy = {
      user_id: user._id || user.id ? String(user._id || user.id) : null,
      tai_khoan: user.tai_khoan || "system",
      ho_ten: user.ho_ten || user.tai_khoan || "Hệ thống",
    };

    // 1) Latch: reserve phiếu điều chỉnh kho
    const reserved = await this.approve(id, approvedBy);
    if (!reserved) {
      throw new Error("Phiếu đã được xử lý bởi người khác");
    }

    // 2) Trừ/cộng tồn kho
    const adjustFn = phieu.loai === "nguyen_lieu"
      ? (itemId, delta) => NguyenLieuDAO.adjustStock(itemId, delta, { allowNegative: false })
      : (itemId, delta) => SanPhamDAO.adjustStock(itemId, delta, { allowNegative: false });

    const adjustResult = await adjustFn(phieu.item_id.toString(), phieu.so_luong_dieu_chinh);
    if (adjustResult?.error) {
      await this.revertToChoDuyet(id, approvedBy, adjustResult.error.message);
      throw new Error(adjustResult.error.message || "Điều chỉnh tồn kho thất bại");
    }

    return reserved;
  }

  /**
   * tuChoiPhieu — reject adjustment ticket with reason
   */
  static async tuChoiPhieu(id, ghi_chu = "", user = {}) {
    if (!ObjectId.isValid(id)) throw new Error("ID phiếu không hợp lệ");
    const phieu = await this.getById(id);
    if (!phieu) throw new Error("Không tìm thấy phiếu điều chỉnh kho");
    if (phieu.trang_thai !== DCK_STATUS.CHO_DUYET) {
      throw new Error("Phiếu đã được xử lý trước đó");
    }

    const rejectedBy = {
      user_id: user._id || user.id ? String(user._id || user.id) : null,
      tai_khoan: user.tai_khoan || "system",
      ho_ten: user.ho_ten || user.tai_khoan || "Hệ thống",
      ly_do: ghi_chu || "Từ chối duyệt điều chỉnh kho",
    };

    const res = await this.reject(id, rejectedBy);
    if (!res) throw new Error("Từ chối phiếu thất bại");
    return res;
  }
}
