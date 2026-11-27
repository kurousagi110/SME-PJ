/**
 * PosShiftDAO — Quản lý vòng đời Ca Thu Ngân POS (Mở ca → Ghi nhận giao dịch → Kiểm quỹ & Kết ca).
 */

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import { computePosShiftSummary } from "../utils/promotionEngine.js";

let posShiftsCol = null;

function genShiftCode() {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `CA-${ymd}-${rand}`;
}

export default class PosShiftDAO {
  static async injectDB(conn) {
    if (posShiftsCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("PosShiftDAO.injectDB: missing SME_DB_NAME env var");
    posShiftsCol = conn.db(dbName).collection("pos_shifts");

    try {
      await posShiftsCol.createIndex({ cashier_id: 1, status: 1 });
      await posShiftsCol.createIndex({ opened_at: -1 });
      await posShiftsCol.createIndex({ ma_ca: 1 }, { unique: true });
    } catch (err) {
      logger.warn("PosShiftDAO index warning", { error: err.message });
    }
  }

  static async getActiveShift(cashierId) {
    if (!posShiftsCol || !cashierId) return null;
    const shift = await posShiftsCol.findOne(
      { cashier_id: String(cashierId), status: "open" },
      { sort: { opened_at: -1 } }
    );
    if (!shift) return null;
    const summary = computePosShiftSummary({
      openingCash: shift.opening_cash,
      transactions: shift.transactions || [],
      actualCash: null,
    });
    return { ...shift, summary };
  }

  static async openShift({ cashier, openingCash = 0, registerName = "Quầy POS #1", notes = "" }) {
    try {
      const cashierId = String(cashier?._id || cashier?.id || "");
      if (!cashierId) return { error: new Error("Không xác định được nhân viên thu ngân") };

      const existing = await this.getActiveShift(cashierId);
      if (existing) {
        return { error: new Error(`Bạn đang có ca bán hàng chưa đóng (${existing.ma_ca}). Vui lòng kết ca trước khi mở ca mới.`) };
      }

      const now = new Date();
      const doc = {
        ma_ca: genShiftCode(),
        register_name: String(registerName || "Quầy POS #1").trim(),
        cashier_id: cashierId,
        cashier_name: cashier.ho_ten || cashier.tai_khoan || "Thu ngân",
        status: "open",
        opening_cash: Math.max(0, Number(openingCash) || 0),
        transactions: [],
        opened_at: now,
        closed_at: null,
        actual_cash: null,
        variance: 0,
        reconciliation_status: "open",
        opening_notes: String(notes || "").trim(),
        closing_notes: "",
        created_at: now,
        updated_at: now,
      };

      const res = await posShiftsCol.insertOne(doc);
      const summary = computePosShiftSummary({ openingCash: doc.opening_cash, transactions: [], actualCash: null });
      return { ok: true, doc: { ...doc, _id: res.insertedId, summary } };
    } catch (err) {
      logger.error("PosShiftDAO.openShift error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Ghi nhận giao dịch bán hàng hoặc hoàn tiền vào ca đang mở của thu ngân (nếu có).
   */
  static async recordTransaction({ cashierId, orderCode = "", amount = 0, paymentMethod = "tien_mat", kind = "sale" }) {
    if (!posShiftsCol || !cashierId) return null;
    try {
      const tx = {
        order_code: orderCode,
        amount: Math.max(0, Number(amount) || 0),
        payment_method: paymentMethod,
        kind,
        at: new Date(),
      };
      const updated = await posShiftsCol.findOneAndUpdate(
        { cashier_id: String(cashierId), status: "open" },
        {
          $push: { transactions: tx },
          $set: { updated_at: new Date() },
        },
        { sort: { opened_at: -1 }, returnDocument: "after" }
      );
      return updated || null;
    } catch (err) {
      logger.warn("PosShiftDAO.recordTransaction warning", { error: err.message });
      return null;
    }
  }

  static async closeShift({ shiftId, cashier, actualCash = 0, notes = "" }) {
    try {
      if (!ObjectId.isValid(shiftId)) return { error: new Error("ID ca thu ngân không hợp lệ") };
      const shift = await posShiftsCol.findOne({ _id: new ObjectId(shiftId) });
      if (!shift) return { error: new Error("Không tìm thấy ca thu ngân") };
      if (shift.status !== "open") return { error: new Error("Ca thu ngân này đã được đóng trước đó") };

      const summary = computePosShiftSummary({
        openingCash: shift.opening_cash,
        transactions: shift.transactions || [],
        actualCash,
      });

      const now = new Date();
      const updated = await posShiftsCol.findOneAndUpdate(
        { _id: shift._id, status: "open" },
        {
          $set: {
            status: "closed",
            closed_at: now,
            closed_by: {
              user_id: String(cashier?._id || cashier?.id || ""),
              ho_ten: cashier?.ho_ten || cashier?.tai_khoan || "Thu ngân",
            },
            actual_cash: summary.actual_cash,
            expected_cash: summary.expected_cash,
            cash_sales: summary.cash_sales,
            transfer_sales: summary.transfer_sales,
            total_sales: summary.total_sales,
            order_count: summary.order_count,
            variance: summary.variance,
            reconciliation_status: summary.reconciliation_status,
            closing_notes: String(notes || "").trim(),
            updated_at: now,
          },
        },
        { returnDocument: "after" }
      );

      return { ok: true, doc: { ...updated, summary } };
    } catch (err) {
      logger.error("PosShiftDAO.closeShift error", { error: err.message });
      return { error: err };
    }
  }

  static async listShifts({ page = 1, limit = 20, status = "", cashierId = "" } = {}) {
    try {
      const filter = {};
      if (status) filter.status = status;
      if (cashierId) filter.cashier_id = String(cashierId);

      const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
      const [rawItems, total] = await Promise.all([
        posShiftsCol.find(filter).sort({ opened_at: -1 }).skip(skip).limit(Number(limit)).toArray(),
        posShiftsCol.countDocuments(filter),
      ]);

      const items = rawItems.map((s) => ({
        ...s,
        summary: computePosShiftSummary({
          openingCash: s.opening_cash,
          transactions: s.transactions || [],
          actualCash: s.status === "closed" ? s.actual_cash : null,
        }),
      }));

      return { items, total, page: Number(page), limit: Number(limit) };
    } catch (err) {
      logger.error("PosShiftDAO.listShifts error", { error: err.message });
      return { error: err };
    }
  }
}
