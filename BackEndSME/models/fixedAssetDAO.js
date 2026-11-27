/**
 * FixedAssetDAO — Quản lý Tài sản cố định & Khấu hao, Bảng kê Thuế GTGT (VAT) & Dự toán Ngân sách Phòng ban.
 */

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import SystemSettingsDAO from "./systemSettingsDAO.js";
import SoQuyDAO from "./soQuyDAO.js";
import {
  computeVatDeclaration,
  computeMonthlyDepreciation,
  computeBatchDepreciationRun,
  computeBudgetVarianceRows,
} from "../utils/vatAssetBudgetEngine.js";

let assetsCol = null;
let depLogsCol = null;
let budgetsCol = null;
let donHangCol = null;
let soQuyCol = null;

function genAssetCode() {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TSCD-${rand}`;
}

export default class FixedAssetDAO {
  static async injectDB(conn) {
    if (assetsCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("FixedAssetDAO.injectDB: missing SME_DB_NAME env var");
    const db = conn.db(dbName);

    assetsCol = db.collection("fixed_assets");
    depLogsCol = db.collection("depreciation_logs");
    budgetsCol = db.collection("department_budgets");
    donHangCol = db.collection("don_hang");
    soQuyCol = db.collection("so_quy");

    try {
      await assetsCol.createIndex({ ma_tai_san: 1 }, { unique: true });
      await depLogsCol.createIndex({ period_key: 1 }, { unique: true });
      await budgetsCol.createIndex({ year: 1, month: 1, department: 1, category: 1 }, { unique: true });
    } catch (err) {
      logger.warn("FixedAssetDAO index warning", { error: err.message });
    }
  }

  /* ═══════════════════════ 1. THUẾ GTGT (VAT) ═══════════════════════ */

  static async getVatReport({ year = new Date().getFullYear(), month = null, quarter = null } = {}) {
    try {
      const y = Number(year) || new Date().getFullYear();
      let start;
      let end;
      let periodLabel = `Năm ${y}`;

      if (month) {
        const m = Math.min(12, Math.max(1, Number(month)));
        start = new Date(y, m - 1, 1, 0, 0, 0, 0);
        end = new Date(y, m, 0, 23, 59, 59, 999);
        periodLabel = `Tháng ${m}/${y}`;
      } else if (quarter) {
        const q = Math.min(4, Math.max(1, Number(quarter)));
        const startMonth = (q - 1) * 3;
        start = new Date(y, startMonth, 1, 0, 0, 0, 0);
        end = new Date(y, startMonth + 3, 0, 23, 59, 59, 999);
        periodLabel = `Quý ${q}/${y}`;
      } else {
        start = new Date(y, 0, 1, 0, 0, 0, 0);
        end = new Date(y, 11, 31, 23, 59, 59, 999);
      }

      const dateFilter = {
        $or: [
          { ngay_dat: { $gte: start, $lte: end } },
          { created_at: { $gte: start, $lte: end } },
        ],
      };

      const [salesOrders, purchaseOrders, settings] = await Promise.all([
        donHangCol
          .find({
            loai_don: "sale",
            trang_thai: { $in: ["completed", "paid", "confirmed"] },
            ...dateFilter,
          })
          .sort({ ngay_dat: -1 })
          .toArray(),
        donHangCol
          .find({
            loai_don: "purchase_receipt",
            trang_thai: { $in: ["completed", "paid", "confirmed"] },
            ...dateFilter,
          })
          .sort({ ngay_dat: -1 })
          .toArray(),
        SystemSettingsDAO.getSettings(),
      ]);

      const vat = computeVatDeclaration({
        salesOrders,
        purchaseOrders,
        defaultVatRate: settings?.company?.thue_vat_mac_dinh ?? 8,
      });

      return { period_label: periodLabel, start, end, ...vat };
    } catch (err) {
      logger.error("FixedAssetDAO.getVatReport error", { error: err.message });
      return { error: err };
    }
  }

  /* ═══════════════════════ 2. TÀI SẢN CỐ ĐỊNH & KHẤU HAO ═══════════════════════ */

  static async listAssets() {
    try {
      const docs = await assetsCol.find({ status: { $ne: "deleted" } }).sort({ created_at: -1 }).toArray();
      const items = docs.map((a) => ({
        ...a,
        depreciation: computeMonthlyDepreciation(a),
      }));
      const logs = await depLogsCol.find({}).sort({ created_at: -1 }).limit(24).toArray();
      return { items, logs };
    } catch (err) {
      logger.error("FixedAssetDAO.listAssets error", { error: err.message });
      return { error: err };
    }
  }

  static async createAsset(payload = {}, user = null) {
    try {
      const ten = String(payload.ten_tai_san || "").trim();
      const cost = Math.max(0, Number(payload.original_cost || 0));
      if (!ten || cost <= 0) {
        return { error: new Error("Vui lòng nhập tên tài sản và nguyên giá > 0") };
      }

      const now = new Date();
      const doc = {
        ma_tai_san: String(payload.ma_tai_san || "").trim().toUpperCase() || genAssetCode(),
        ten_tai_san: ten,
        category: String(payload.category || "Máy móc thiết bị").trim(),
        department: String(payload.department || "Xưởng sản xuất").trim(),
        purchase_date: payload.purchase_date ? new Date(payload.purchase_date) : now,
        original_cost: cost,
        salvage_value: Math.max(0, Number(payload.salvage_value || 0)),
        useful_life_months: Math.max(1, Math.floor(Number(payload.useful_life_months || 60))),
        accumulated_depreciation: Math.max(0, Number(payload.accumulated_depreciation || 0)),
        depreciated_periods: [],
        maintenance_schedule_days: Math.max(0, Number(payload.maintenance_schedule_days || 90)),
        maintenance_logs: [],
        status: "active",
        created_by: user ? { user_id: String(user._id || ""), ho_ten: user.ho_ten || user.tai_khoan } : null,
        created_at: now,
        updated_at: now,
      };

      const res = await assetsCol.insertOne(doc);
      return { ok: true, doc: { ...doc, _id: res.insertedId, depreciation: computeMonthlyDepreciation(doc) } };
    } catch (err) {
      logger.error("FixedAssetDAO.createAsset error", { error: err.message });
      return { error: err };
    }
  }

  static async addMaintenanceLog(id, payload = {}, user = null) {
    try {
      if (!ObjectId.isValid(id)) return { error: new Error("ID tài sản không hợp lệ") };
      const log = {
        id: `MNT-${Date.now().toString(36).toUpperCase()}`,
        date: payload.date ? new Date(payload.date) : new Date(),
        description: String(payload.description || "Bảo trì định kỳ").trim(),
        cost: Math.max(0, Number(payload.cost || 0)),
        technician: String(payload.technician || user?.ho_ten || "Kỹ thuật").trim(),
      };
      const updated = await assetsCol.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $push: { maintenance_logs: log }, $set: { last_maintenance_at: log.date, updated_at: new Date() } },
        { returnDocument: "after" }
      );
      if (!updated) return { error: new Error("Không tìm thấy tài sản cố định") };
      return { ok: true, doc: updated };
    } catch (err) {
      logger.error("FixedAssetDAO.addMaintenanceLog error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Chạy trích khấu hao kỳ (tháng/năm) — chống chạy trùng (idempotent theo period_key).
   */
  static async runMonthlyDepreciation({ month, year, postToCashbook = false, user = null }) {
    try {
      const m = Math.min(12, Math.max(1, Number(month) || new Date().getMonth() + 1));
      const y = Number(year) || new Date().getFullYear();
      const periodKey = `${y}-${String(m).padStart(2, "0")}`;

      const existingRun = await depLogsCol.findOne({ period_key: periodKey });
      if (existingRun) {
        return { error: new Error(`Kỳ ${periodKey} đã được trích khấu hao trước đó (Tổng: ${existingRun.total_depreciation.toLocaleString("vi-VN")} đ)`) };
      }

      const activeAssets = await assetsCol.find({ status: "active" }).toArray();
      const batch = computeBatchDepreciationRun(activeAssets, { month: m, year: y });
      if (batch.asset_count === 0 || batch.total_depreciation <= 0) {
        return { error: new Error(`Không có tài sản cố định nào cần trích khấu hao cho kỳ ${periodKey}`) };
      }

      const now = new Date();
      for (const entry of batch.entries) {
        await assetsCol.updateOne(
          { _id: entry.asset_id },
          {
            $set: {
              accumulated_depreciation: entry.new_accumulated,
              updated_at: now,
            },
            $addToSet: { depreciated_periods: periodKey },
          }
        );
      }

      let maPhieuOpex = null;
      if (postToCashbook) {
        try {
          const sq = await SoQuyDAO.taoPhieu({
            loai_phieu: "chi",
            hang_muc: "chi_phi_van_hanh",
            so_tien: batch.total_depreciation,
            phuong_thuc: "chuyen_khoan",
            ma_chung_tu: `KH-${periodKey}`,
            ghi_chu: `Hạch toán khấu hao TSCĐ kỳ ${periodKey} (${batch.asset_count} tài sản)`,
            user,
          });
          maPhieuOpex = sq?.doc?.ma_phieu || null;
        } catch {
          // non-fatal
        }
      }

      const logDoc = {
        period_key: periodKey,
        month: m,
        year: y,
        asset_count: batch.asset_count,
        total_depreciation: batch.total_depreciation,
        entries: batch.entries,
        ma_phieu_opex: maPhieuOpex,
        run_by: user ? { user_id: String(user._id || ""), ho_ten: user.ho_ten || user.tai_khoan } : null,
        created_at: now,
      };
      await depLogsCol.insertOne(logDoc);
      return { ok: true, doc: logDoc };
    } catch (err) {
      logger.error("FixedAssetDAO.runMonthlyDepreciation error", { error: err.message });
      return { error: err };
    }
  }

  /* ═══════════════════════ 3. DỰ TOÁN NGÂN SÁCH (BUDGET VS ACTUAL) ═══════════════════════ */

  static async upsertBudget({ department, category = "chi_phi_van_hanh", year, month, planned_amount, note = "", user = null }) {
    try {
      const dept = String(department || "").trim();
      if (!dept) return { error: new Error("Vui lòng nhập tên phòng ban") };
      const y = Number(year) || new Date().getFullYear();
      const m = Math.min(12, Math.max(1, Number(month) || new Date().getMonth() + 1));
      const planned = Math.max(0, Number(planned_amount || 0));

      const now = new Date();
      const res = await budgetsCol.findOneAndUpdate(
        { year: y, month: m, department: dept, category: String(category || "all").trim() },
        {
          $set: {
            planned_amount: planned,
            note: String(note || "").trim(),
            updated_by: user ? user.ho_ten || user.tai_khoan : "Admin",
            updated_at: now,
          },
          $setOnInsert: { created_at: now },
        },
        { upsert: true, returnDocument: "after" }
      );
      return { ok: true, doc: res };
    } catch (err) {
      logger.error("FixedAssetDAO.upsertBudget error", { error: err.message });
      return { error: err };
    }
  }

  static async getBudgetVsActual({ year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = {}) {
    try {
      const y = Number(year) || new Date().getFullYear();
      const m = Math.min(12, Math.max(1, Number(month) || new Date().getMonth() + 1));
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59, 999);

      const [budgets, expenseVouchers] = await Promise.all([
        budgetsCol.find({ year: y, month: m }).sort({ department: 1 }).toArray(),
        soQuyCol
          .find({
            loai_phieu: "chi",
            trang_thai: { $ne: "da_huy" },
            ngay_ghi_nhan: { $gte: start, $lte: end },
          })
          .toArray(),
      ]);

      // Map chi phí thực tế theo phòng ban & hạng mục (đồng thời cộng vào key `all`)
      const actualMap = new Map();
      for (const v of expenseVouchers) {
        const amt = Math.max(0, Number(v.so_tien || 0));
        const dept = String(v.phong_ban || v.doi_tuong?.phong_ban || "Toàn công ty").toLowerCase();
        const cat = String(v.hang_muc || "khac").toLowerCase();
        actualMap.set(`${dept}|${cat}`, (actualMap.get(`${dept}|${cat}`) || 0) + amt);
        actualMap.set(`${dept}|all`, (actualMap.get(`${dept}|all`) || 0) + amt);
        actualMap.set(`toàn công ty|${cat}`, (actualMap.get(`toàn công ty|${cat}`) || 0) + amt);
        actualMap.set(`toàn công ty|all`, (actualMap.get(`toàn công ty|all`) || 0) + amt);
      }

      const report = computeBudgetVarianceRows(budgets, actualMap);
      return { year: y, month: m, ...report };
    } catch (err) {
      logger.error("FixedAssetDAO.getBudgetVsActual error", { error: err.message });
      return { error: err };
    }
  }
}
