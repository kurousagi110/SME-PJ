/**
 * planningController.js — REST API controller cho phân hệ Demand Planning
 *
 * Routes:
 *   GET /api/v1/planning/forecast   — Dự báo nhu cầu sản phẩm (Moving Average)
 *   GET /api/v1/planning/mrp        — Kế hoạch MRP: NL cần nhập
 *   GET /api/v1/planning/abc        — Phân tích ABC sản phẩm
 *   GET /api/v1/planning/alerts     — Cảnh báo tồn kho thấp + ứ đọng
 *   GET /api/v1/planning/turnover   — (tích hợp trong alerts.turnover)
 */

import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { PlanningDAO } from "../models/planningDAO.js";

export default class PlanningController {
  /* ── Forecast ─────────────────────────────────────────────────────────── */
  static getForecast = asyncHandler(async (req, res) => {
    const months = Math.min(12, Math.max(3, parseInt(req.query.months) || 6));
    const data = await PlanningDAO.getForecast(months);
    return sendSuccess(res, data, "Lấy dự báo nhu cầu thành công");
  });

  /* ── MRP ──────────────────────────────────────────────────────────────── */
  static getMRP = asyncHandler(async (req, res) => {
    const lead_time = Math.min(30, Math.max(1, parseInt(req.query.lead_time) || 7));
    const data = await PlanningDAO.getMRPPlan(lead_time);
    return sendSuccess(res, data, "Lấy kế hoạch MRP thành công");
  });

  /* ── ABC Analysis ─────────────────────────────────────────────────────── */
  static getABC = asyncHandler(async (req, res) => {
    const months = Math.min(12, Math.max(3, parseInt(req.query.months) || 6));
    const data = await PlanningDAO.getABCAnalysis(months);
    return sendSuccess(res, data, "Phân tích ABC thành công");
  });

  /* ── Inventory Alerts ─────────────────────────────────────────────────── */
  static getAlerts = asyncHandler(async (req, res) => {
    const months = Math.min(12, Math.max(3, parseInt(req.query.months) || 6));
    const data = await PlanningDAO.getAlerts(months);
    return sendSuccess(res, data, "Lấy cảnh báo tồn kho thành công");
  });
}
