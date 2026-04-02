// Refactored: 2026-04-02 | Issues fixed: C1, C2, C3, C4 | Original: dashboardControllers.js
// Phase 3 update: cache-aside on ordersCompare + ordersOverview (TTL 60 s)

import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import DashboardService from "../services/dashboardService.js";
import { withCache } from "../utils/cache.js";

export default class DashboardController {
  /* ─── ORDERS COMPARE ─── */
  static ordersCompare = asyncHandler(async (req, res) => {
    const { metric = "ban_sp", yearA, yearB = "none", range = "90d",
            to, trang_thai, includeCancelled = "true" } = req.query;
    const cacheKey = `dashboard:compare:${metric}:${yearA}:${yearB}:${range}:${to}:${trang_thai}:${includeCancelled}`;
    const data = await withCache(cacheKey, () => DashboardService.ordersCompare({
      metric, yearA, yearB, range, to, trang_thai,
      includeCancelled: String(includeCancelled) !== "false",
    }), 60);
    return sendSuccess(res, data, "Lấy biểu đồ so sánh thành công");
  });

  /* ─── ORDERS OVERVIEW ─── */
  static ordersOverview = asyncHandler(async (req, res) => {
    const { yearA, yearB = "none", range = "90d", to, trang_thai, includeCancelled = "true" } = req.query;
    const cacheKey = `dashboard:overview:${yearA}:${yearB}:${range}:${to}:${trang_thai}:${includeCancelled}`;
    const data = await withCache(cacheKey, () => DashboardService.ordersOverview({
      yearA, yearB, range, to, trang_thai,
      includeCancelled: String(includeCancelled) !== "false",
    }), 60);
    return sendSuccess(res, data, "Lấy tổng quan thành công");
  });

  /* ─── ORDERS TABLE ─── */
  static ordersTable = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, q = "", loai_don, trang_thai, includeDeleted = "false" } = req.query;
    const data = await DashboardService.ordersTable({
      page: Number(page), limit: Number(limit), q,
      loai_don, trang_thai,
      includeDeleted: String(includeDeleted) === "true",
    });
    return sendSuccess(res, data, "Lấy bảng đơn hàng thành công");
  });
}
