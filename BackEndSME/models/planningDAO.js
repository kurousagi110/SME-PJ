/**
 * planningDAO.js — Demand Planning Engine
 *
 * Cung cấp 4 nhóm chức năng:
 *  1. Forecast    — Moving Average 3 tháng, dự báo T+1/T+2/T+3 mỗi sản phẩm
 *  2. MRP         — Tính ngược BOM → nguyên liệu cần nhập + đề xuất PO
 *  3. ABC         — Phân tích ABC sản phẩm theo doanh thu 6 tháng gần nhất
 *  4. Alerts      — Cảnh báo tồn kho thấp, hàng ứ đọng, vòng quay kho
 */

import { ObjectId } from "mongodb";
import { STATUS, ORDER_TYPE } from "./donHangConstants.js";
import logger from "../utils/logger.js";

// ── Module-level collection handles ──────────────────────────────────────────

let don_hang_col = null;
let san_pham_col = null;
let nguyen_lieu_col = null;
let bom_col = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Trả về mảng {year, month} của N tháng gần nhất (kể cả tháng hiện tại).
 */
function lastNMonths(n = 6) {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

/**
 * Tạo ISO string đầu tháng / cuối tháng.
 */
function monthRange(year, month) {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59, 999);
  return { from, to };
}

/**
 * Clamp giá trị >= 0.
 */
const clamp0 = (v) => Math.max(0, Number(v) || 0);

// ── PlanningDAO ───────────────────────────────────────────────────────────────

export class PlanningDAO {
  /* ── Lifecycle ─────────────────────────────────────────────────────────── */

  static async injectDB(conn) {
    if (don_hang_col && san_pham_col && nguyen_lieu_col) return;
    try {
      const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
      const db = conn.db(dbName);

      don_hang_col = db.collection("don_hang");
      san_pham_col = db.collection("san_pham");
      nguyen_lieu_col = db.collection("nguyen_lieu");
      bom_col = db.collection("bom_san_pham");
    } catch (e) {
      logger.error("PlanningDAO injectDB error", { error: e.message });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 1. FORECAST — Moving Average
   * ════════════════════════════════════════════════════════════════════════*/

  /**
   * Lấy doanh số (số lượng bán) theo từng tháng của mỗi sản phẩm.
   * Chỉ tính đơn SALE đã completed.
   * @param {number} months  — số tháng lịch sử cần lấy (default 6)
   * @returns {Map<string, {ma_sp, ten_sp, monthly: number[]}>}
   */
  static async _getSalesHistory(months = 6) {
    const periods = lastNMonths(months);
    const { from } = monthRange(periods[0].year, periods[0].month);
    const { to } = monthRange(
      periods[periods.length - 1].year,
      periods[periods.length - 1].month
    );

    const agg = await don_hang_col
      .aggregate([
        {
          $match: {
            loai_don: ORDER_TYPE.SALE,
            trang_thai: STATUS.COMPLETED,
            created_at: { $gte: from, $lte: to },
          },
        },
        { $unwind: "$san_pham" },
        {
          $match: {
            "san_pham.san_pham_id": { $exists: true },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$created_at" },
              month: { $month: "$created_at" },
              san_pham_id: "$san_pham.san_pham_id",
            },
            ten_sp: { $first: "$san_pham.ten_sp" },
            ma_sp: { $first: "$san_pham.ma_sp" },
            tong_sl: { $sum: "$san_pham.so_luong" },
            tong_tt: { $sum: "$san_pham.thanh_tien" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ])
      .toArray();

    // Nhóm theo san_pham_id
    const map = new Map();
    for (const r of agg) {
      const spId = String(r._id.san_pham_id);
      if (!map.has(spId)) {
        map.set(spId, {
          san_pham_id: spId,
          ma_sp: r.ma_sp || "",
          ten_sp: r.ten_sp || "",
          // monthly[i] = số lượng bán tháng periods[i]
          monthly_qty: new Array(months).fill(0),
          monthly_revenue: new Array(months).fill(0),
        });
      }
      const entry = map.get(spId);
      const idx = periods.findIndex(
        (p) => p.year === r._id.year && p.month === r._id.month
      );
      if (idx !== -1) {
        entry.monthly_qty[idx] = clamp0(r.tong_sl);
        entry.monthly_revenue[idx] = clamp0(r.tong_tt);
      }
    }
    return { map, periods };
  }

  /**
   * Tính Moving Average forecast cho một sản phẩm.
   * MA-3 với linear trend.
   */
  static _calcForecast(monthly_qty) {
    const n = monthly_qty.length;
    if (n < 3) {
      const avg = monthly_qty.reduce((s, v) => s + v, 0) / (n || 1);
      return { t1: avg, t2: avg, t3: avg, avg_monthly: avg };
    }

    // 3 tháng gần nhất
    const last3 = monthly_qty.slice(-3);
    const ma3 = last3.reduce((s, v) => s + v, 0) / 3;

    // Trend = slope từ tháng -3 → -1 (chia 2 bước)
    const trend = (last3[2] - last3[0]) / 2;

    const t1 = clamp0(ma3 + trend);
    const t2 = clamp0(ma3 + 2 * trend);
    const t3 = clamp0(ma3 + 3 * trend);

    const avg_monthly =
      monthly_qty.reduce((s, v) => s + v, 0) / monthly_qty.length;

    return {
      t1: Math.round(t1),
      t2: Math.round(t2),
      t3: Math.round(t3),
      avg_monthly: Math.round(avg_monthly * 10) / 10,
    };
  }

  /**
   * Trả về forecast tất cả sản phẩm kèm tồn kho hiện tại.
   */
  static async getForecast(months = 6) {
    const { map, periods } = await this._getSalesHistory(months);

    // Lấy tồn kho hiện tại của tất cả sản phẩm
    const spIds = [...map.keys()].map((id) => {
      try {
        return new ObjectId(id);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const spDocs = await san_pham_col
      .find({ _id: { $in: spIds }, trang_thai: { $ne: "deleted" } })
      .project({ _id: 1, ma_sp: 1, ten_sp: 1, so_luong: 1, don_gia: 1 })
      .toArray();

    const spMap = new Map(spDocs.map((d) => [String(d._id), d]));

    const result = [];
    for (const [spId, entry] of map.entries()) {
      const sp = spMap.get(spId);
      const ton_kho = sp ? clamp0(sp.so_luong) : 0;
      const don_gia = sp ? clamp0(sp.don_gia) : 0;

      const fc = this._calcForecast(entry.monthly_qty);

      // Trạng thái: so ton_kho với forecast T+1
      let trang_thai_kho = "du"; // xanh
      if (ton_kho < fc.t1 * 0.5) trang_thai_kho = "thieu_hut"; // đỏ
      else if (ton_kho < fc.t1) trang_thai_kho = "can_nhap"; // vàng
      else if (ton_kho > fc.t1 * 3) trang_thai_kho = "du_thua"; // xám

      result.push({
        san_pham_id: spId,
        ma_sp: entry.ma_sp || (sp ? sp.ma_sp : ""),
        ten_sp: entry.ten_sp || (sp ? sp.ten_sp : ""),
        don_gia,
        ton_kho,
        avg_monthly: fc.avg_monthly,
        forecast_t1: fc.t1,
        forecast_t2: fc.t2,
        forecast_t3: fc.t3,
        trang_thai_kho, // "thieu_hut" | "can_nhap" | "du" | "du_thua"
        monthly_qty: entry.monthly_qty,
        periods: periods.map((p) => `${p.year}-${String(p.month).padStart(2, "0")}`),
      });
    }

    // Sắp xếp: thiếu hụt trước
    const order = { thieu_hut: 0, can_nhap: 1, du: 2, du_thua: 3 };
    result.sort((a, b) => (order[a.trang_thai_kho] ?? 9) - (order[b.trang_thai_kho] ?? 9));

    return result;
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 2. MRP — Material Requirements Planning
   * ════════════════════════════════════════════════════════════════════════*/

  /**
   * Tính kế hoạch nguyên liệu cần nhập từ dự báo sản phẩm.
   * Lead time mặc định: 7 ngày.
   */
  static async getMRPPlan(lead_time_days = 7) {
    const forecasts = await this.getForecast(6);

    // Sản phẩm có net_requirement > 0 (thiếu hụt hoặc cần nhập thêm)
    const needed = forecasts.filter(
      (f) => f.trang_thai_kho === "thieu_hut" || f.trang_thai_kho === "can_nhap"
    );

    if (needed.length === 0) return [];

    // Lấy BOM của các sản phẩm cần
    const spIds = needed
      .map((f) => {
        try {
          return new ObjectId(f.san_pham_id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const boms = await bom_col
      .find({ san_pham_id: { $in: spIds } })
      .toArray();

    const bomMap = new Map(
      boms.map((b) => [String(b.san_pham_id), b.items || []])
    );

    // Tập hợp NL cần thiết (gộp theo ma_nl)
    const nlMap = new Map(); // ma_nl → { ... }

    for (const f of needed) {
      const net = Math.max(0, f.forecast_t1 - f.ton_kho);
      const items = bomMap.get(f.san_pham_id) || [];

      for (const item of items) {
        const nlId = String(item.nguyen_lieu_id || "");
        const qty_per_unit =
          clamp0(item.dinh_muc || item.qty || 0) *
          (1 + clamp0(item.waste_rate || 0) / 100);
        const nl_needed = Math.ceil(net * qty_per_unit);

        if (!nlMap.has(nlId)) {
          nlMap.set(nlId, {
            nguyen_lieu_id: nlId,
            ma_nl: item.ma_nl || "",
            ten_nl: item.ten || item.ten_nl || "",
            don_vi: item.unit || item.don_vi || "",
            ton_kho_nl: 0, // sẽ điền sau
            tong_can: 0,
            san_pham_can: [],
          });
        }
        const entry = nlMap.get(nlId);
        entry.tong_can += nl_needed;
        entry.san_pham_can.push({
          ma_sp: f.ma_sp,
          ten_sp: f.ten_sp,
          net_sp: net,
          nl_cho_sp: nl_needed,
        });
      }
    }

    if (nlMap.size === 0) return [];

    // Lấy tồn kho NL hiện tại
    const nlIds = [...nlMap.keys()]
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const nlDocs = await nguyen_lieu_col
      .find({ _id: { $in: nlIds } })
      .project({ _id: 1, ma_nl: 1, ten_nl: 1, don_vi: 1, so_luong: 1, gia_nhap: 1 })
      .toArray();

    const nlDocMap = new Map(nlDocs.map((d) => [String(d._id), d]));

    // Tính số lượng cần đặt
    const suggestedOrderDate = new Date();
    suggestedOrderDate.setDate(suggestedOrderDate.getDate() - lead_time_days);

    const plan = [];
    for (const [nlId, entry] of nlMap.entries()) {
      const nlDoc = nlDocMap.get(nlId);
      const ton_kho_nl = nlDoc ? clamp0(nlDoc.so_luong) : 0;
      const gia_nhap = nlDoc ? clamp0(nlDoc.gia_nhap) : 0;
      const can_nhap = Math.max(0, entry.tong_can - ton_kho_nl);

      // Bổ sung thông tin từ doc nếu thiếu
      if (nlDoc) {
        entry.ma_nl = entry.ma_nl || nlDoc.ma_nl;
        entry.ten_nl = entry.ten_nl || nlDoc.ten_nl;
        entry.don_vi = entry.don_vi || nlDoc.don_vi;
      }

      entry.ton_kho_nl = ton_kho_nl;
      entry.can_nhap = can_nhap;
      entry.gia_nhap = gia_nhap;
      entry.du_kien_chi = Math.round(can_nhap * gia_nhap);
      entry.suggested_order_date = suggestedOrderDate.toISOString().split("T")[0];
      entry.da_du = can_nhap === 0;

      plan.push(entry);
    }

    // Sắp xếp: thiếu nhiều nhất trước
    plan.sort((a, b) => b.can_nhap - a.can_nhap);
    return plan;
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 3. ABC ANALYSIS
   * ════════════════════════════════════════════════════════════════════════*/

  /**
   * Phân tích ABC sản phẩm theo doanh thu 6 tháng gần nhất.
   * A = top 80% doanh thu, B = 80-95%, C = còn lại.
   */
  static async getABCAnalysis(months = 6) {
    const { map } = await this._getSalesHistory(months);

    // Tính tổng doanh thu và số lượng bán
    const items = [];
    for (const [spId, entry] of map.entries()) {
      const total_revenue = entry.monthly_revenue.reduce((s, v) => s + v, 0);
      const total_qty = entry.monthly_qty.reduce((s, v) => s + v, 0);
      if (total_qty > 0) {
        items.push({
          san_pham_id: spId,
          ma_sp: entry.ma_sp,
          ten_sp: entry.ten_sp,
          total_revenue,
          total_qty,
          monthly_revenue: entry.monthly_revenue,
        });
      }
    }

    // Sort giảm dần theo doanh thu
    items.sort((a, b) => b.total_revenue - a.total_revenue);

    const grand_total = items.reduce((s, i) => s + i.total_revenue, 0);
    let cumulative = 0;

    return items.map((item, idx) => {
      cumulative += item.total_revenue;
      const cumulative_pct = grand_total > 0 ? (cumulative / grand_total) * 100 : 0;
      const revenue_pct = grand_total > 0 ? (item.total_revenue / grand_total) * 100 : 0;

      let abc_class = "C";
      if (cumulative_pct - revenue_pct < 80) abc_class = "A";
      else if (cumulative_pct - revenue_pct < 95) abc_class = "B";

      return {
        rank: idx + 1,
        ...item,
        revenue_pct: Math.round(revenue_pct * 10) / 10,
        cumulative_pct: Math.round(cumulative_pct * 10) / 10,
        abc_class,
      };
    });
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 4. INVENTORY ALERTS
   * ════════════════════════════════════════════════════════════════════════*/

  /**
   * Cảnh báo tổng hợp:
   *  - low_stock:    sản phẩm / NL dưới mức tối thiểu
   *  - slow_moving:  sản phẩm không bán trong 60 ngày
   *  - turnover:     vòng quay tồn kho mỗi sản phẩm
   */
  static async getAlerts(months = 6) {
    // ── 1. Sản phẩm tồn kho thấp ──────────────────────────────────────────
    const spLow = await san_pham_col
      .aggregate([
        { $match: { trang_thai: { $nin: ["deleted", "inactive"] } } },
        {
          $addFields: {
            ton_toi_thieu_sp: { $ifNull: ["$ton_toi_thieu", 0] },
          },
        },
        {
          $match: {
            $expr: { $lt: ["$so_luong", "$ton_toi_thieu_sp"] },
          },
        },
        {
          $project: {
            _id: 1,
            ma_sp: 1,
            ten_sp: 1,
            so_luong: 1,
            ton_toi_thieu: 1,
          },
        },
      ])
      .toArray();

    // ── 2. NL tồn kho thấp ────────────────────────────────────────────────
    const nlLow = await nguyen_lieu_col
      .aggregate([
        { $match: { trang_thai: { $nin: ["deleted", "inactive"] } } },
        {
          $addFields: {
            ton_toi_thieu_nl: { $ifNull: ["$ton_toi_thieu", 0] },
          },
        },
        {
          $match: {
            $expr: { $lt: ["$so_luong", "$ton_toi_thieu_nl"] },
          },
        },
        {
          $project: {
            _id: 1,
            ma_nl: 1,
            ten_nl: 1,
            so_luong: 1,
            ton_toi_thieu: 1,
            don_vi: 1,
          },
        },
      ])
      .toArray();

    // ── 3. Hàng ứ đọng (không bán trong 60 ngày) ──────────────────────────
    const cutoff60 = new Date();
    cutoff60.setDate(cutoff60.getDate() - 60);

    // Lấy danh sách sp đã bán gần đây
    const recentSales = await don_hang_col
      .aggregate([
        {
          $match: {
            loai_don: ORDER_TYPE.SALE,
            trang_thai: STATUS.COMPLETED,
            created_at: { $gte: cutoff60 },
          },
        },
        { $unwind: "$san_pham" },
        { $group: { _id: "$san_pham.san_pham_id" } },
      ])
      .toArray();

    const recentSpIds = new Set(recentSales.map((r) => String(r._id)));

    // Sản phẩm đang bán (active) nhưng không nằm trong recentSpIds
    const allActiveSP = await san_pham_col
      .find({ trang_thai: "active", so_luong: { $gt: 0 } })
      .project({ _id: 1, ma_sp: 1, ten_sp: 1, so_luong: 1, don_gia: 1 })
      .toArray();

    const slow_moving = allActiveSP.filter(
      (sp) => !recentSpIds.has(String(sp._id))
    );

    // ── 4. Vòng quay tồn kho (Inventory Turnover) ─────────────────────────
    const { map } = await this._getSalesHistory(months);
    const turnoverItems = [];
    for (const [spId, entry] of map.entries()) {
      const total_qty = entry.monthly_qty.reduce((s, v) => s + v, 0);
      // Lấy ton_kho hiện tại
      let ton_kho = 0;
      try {
        const doc = await san_pham_col.findOne(
          { _id: new ObjectId(spId) },
          { projection: { so_luong: 1, ten_sp: 1, ma_sp: 1 } }
        );
        if (doc) {
          ton_kho = clamp0(doc.so_luong);
          const turnover = ton_kho > 0 ? total_qty / ton_kho : total_qty > 0 ? 999 : 0;
          const days_on_hand = turnover > 0 ? Math.round(30 * months / turnover) : null;
          turnoverItems.push({
            san_pham_id: spId,
            ma_sp: entry.ma_sp || doc.ma_sp,
            ten_sp: entry.ten_sp || doc.ten_sp,
            total_qty,
            ton_kho,
            turnover: Math.round(turnover * 10) / 10,
            days_on_hand,
          });
        }
      } catch {
        // bỏ qua nếu id không hợp lệ
      }
    }
    turnoverItems.sort((a, b) => b.turnover - a.turnover);

    return {
      low_stock_sp: spLow.map((s) => ({
        id: String(s._id),
        ma: s.ma_sp,
        ten: s.ten_sp,
        so_luong: s.so_luong,
        ton_toi_thieu: s.ton_toi_thieu || 0,
        thieu: (s.ton_toi_thieu || 0) - s.so_luong,
        loai: "san_pham",
      })),
      low_stock_nl: nlLow.map((n) => ({
        id: String(n._id),
        ma: n.ma_nl,
        ten: n.ten_nl,
        so_luong: n.so_luong,
        ton_toi_thieu: n.ton_toi_thieu || 0,
        thieu: (n.ton_toi_thieu || 0) - n.so_luong,
        don_vi: n.don_vi,
        loai: "nguyen_lieu",
      })),
      slow_moving: slow_moving.map((s) => ({
        id: String(s._id),
        ma: s.ma_sp,
        ten: s.ten_sp,
        so_luong: s.so_luong,
        don_gia: s.don_gia,
        gia_tri_ton: s.so_luong * s.don_gia,
      })),
      turnover: turnoverItems.slice(0, 20), // top 20
      summary: {
        tong_sp_thieu: spLow.length,
        tong_nl_thieu: nlLow.length,
        tong_hang_u_dong: slow_moving.length,
        gia_tri_hang_u_dong: slow_moving.reduce(
          (s, i) => s + i.so_luong * i.don_gia,
          0
        ),
      },
    };
  }
}
