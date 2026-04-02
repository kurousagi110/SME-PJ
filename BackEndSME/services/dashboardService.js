// Refactored: 2026-04-02 | Issues fixed: S1, S2, C3 | Phase 3 – Service Layer

import DashboardDAO from "../models/dashbroadDAO.js";
import ApiError from "../utils/ApiError.js";

/**
 * DashboardService – business logic for dashboard / reporting.
 */
export default class DashboardService {
  static _daoError(result, fallback, errorCode = "OPERATION_FAILED") {
    if (result?.error) throw ApiError.badRequest(result.error.message || fallback, errorCode);
    return result;
  }

  /* ─── ORDERS COMPARE ─── */
  static async ordersCompare({ metric = "ban_sp", yearA, yearB = "none", range = "90d",
                               to, trang_thai, includeCancelled = true } = {}) {
    const result = await DashboardDAO.getOrdersCompare({ metric, yearA, yearB, range, to, trang_thai, includeCancelled });
    this._daoError(result, "Không lấy được chart", "CHART_FAILED");
    return { rows: result.rows || [] };
  }

  /* ─── ORDERS OVERVIEW ─── */
  static async ordersOverview({ yearA, yearB = "none", range = "90d",
                                to, trang_thai, includeCancelled = true } = {}) {
    const result = await DashboardDAO.getOrdersOverview({ yearA, yearB, range, to, trang_thai, includeCancelled });
    this._daoError(result, "Không lấy được overview", "OVERVIEW_FAILED");
    return result;
  }

  /* ─── ORDERS TABLE ─── */
  static async ordersTable({ page = 1, limit = 20, q = "", loai_don, trang_thai, includeDeleted = false } = {}) {
    const result = await DashboardDAO.getOrdersTable({ page, limit, q, loai_don, trang_thai, includeDeleted });
    this._daoError(result, "Không lấy được bảng", "TABLE_FAILED");
    return result;
  }
}
