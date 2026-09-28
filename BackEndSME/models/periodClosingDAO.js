import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";

let closingPeriodsCol = null;

export const PERIOD_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
};

export default class PeriodClosingDAO {
  static async injectDB(conn) {
    if (closingPeriodsCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME || "SME_db_mongo";
    const db = conn.db(dbName);
    closingPeriodsCol = db.collection("ky_ke_toan");

    try {
      await closingPeriodsCol.createIndex({ ky: 1 }, { unique: true });
      await closingPeriodsCol.createIndex({ trang_thai: 1 });
      await closingPeriodsCol.createIndex({ den_ngay: -1 });
    } catch (err) {
      logger.error("Error creating indexes in ky_ke_toan", { error: err.message });
    }
  }

  /**
   * Kiểm tra ngày giao dịch có nằm trong kỳ kế toán đã chốt sổ hay không.
   * @param {Date|string} date 
   * @returns {Promise<boolean>} true nếu đã bị khóa sổ
   */
  static async isDateLocked(date) {
    try {
      if (!closingPeriodsCol) return false;
      const d = new Date(date || new Date());
      if (Number.isNaN(d.getTime())) return false;

      const lockedPeriod = await closingPeriodsCol.findOne({
        trang_thai: PERIOD_STATUS.CLOSED,
        tu_ngay: { $lte: d },
        den_ngay: { $gte: d },
      });

      return !!lockedPeriod;
    } catch (e) {
      logger.error("PeriodClosingDAO.isDateLocked error", { error: e.message });
      return false;
    }
  }

  /**
   * Lấy danh sách các kỳ kế toán
   */
  static async listPeriods() {
    try {
      return await closingPeriodsCol.find({}).sort({ den_ngay: -1 }).toArray();
    } catch (e) {
      logger.error("PeriodClosingDAO.listPeriods error", { error: e.message });
      return [];
    }
  }

  /**
   * Chốt sổ kỳ kế toán (Chỉ Ban Giám Đốc hoặc Kế toán trưởng)
   * @param {string} ky Ví dụ "2026-03" hoặc "Q1-2026"
   * @param {Date|string} tu_ngay
   * @param {Date|string} den_ngay
   * @param {string} ghi_chu
   * @param {object} user
   */
  static async closePeriod({ ky, tu_ngay, den_ngay, ghi_chu = "", user = {} }) {
    try {
      const from = new Date(tu_ngay);
      const to = new Date(den_ngay);
      to.setHours(23, 59, 59, 999);

      const doc = {
        ky: String(ky).trim(),
        tu_ngay: from,
        den_ngay: to,
        trang_thai: PERIOD_STATUS.CLOSED,
        ghi_chu: String(ghi_chu).trim(),
        closed_by: {
          user_id: user._id || user.id ? String(user._id || user.id) : null,
          ho_ten: user.ho_ten || user.tai_khoan || "Hệ thống",
        },
        closed_at: new Date(),
        updated_at: new Date(),
      };

      const res = await closingPeriodsCol.updateOne(
        { ky: doc.ky },
        { $set: doc },
        { upsert: true }
      );

      return { ok: true, ky: doc.ky, res };
    } catch (e) {
      logger.error("PeriodClosingDAO.closePeriod error", { error: e.message });
      return { error: e };
    }
  }

  /**
   * Mở khóa kỳ kế toán (Chỉ Giám Đốc)
   */
  static async reopenPeriod(ky, { ly_do = "", user = {} } = {}) {
    try {
      const res = await closingPeriodsCol.updateOne(
        { ky: String(ky).trim() },
        {
          $set: {
            trang_thai: PERIOD_STATUS.OPEN,
            ly_do_mo_khoa: String(ly_do).trim(),
            reopened_by: {
              user_id: user._id || user.id ? String(user._id || user.id) : null,
              ho_ten: user.ho_ten || user.tai_khoan || "Hệ thống",
            },
            reopened_at: new Date(),
            updated_at: new Date(),
          },
        }
      );
      return { ok: true, modifiedCount: res.modifiedCount };
    } catch (e) {
      logger.error("PeriodClosingDAO.reopenPeriod error", { error: e.message });
      return { error: e };
    }
  }
}
