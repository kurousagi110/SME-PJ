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
import { EcommercePolicyDAO } from "../models/ecommercePolicyDAO.js";

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

  /* ── Ecommerce Policies ───────────────────────────────────────────────── */
  static getEcommercePolicies = asyncHandler(async (req, res) => {
    const data = await EcommercePolicyDAO.getPolicies();
    return sendSuccess(res, data, "Lấy chính sách phí sàn TMĐT thành công");
  });

  /* ── Calculate Ecommerce Pricing & Deductions ─────────────────────────── */
  static calculateEcommercePricing = asyncHandler(async (req, res) => {
    const { gia_niem_yet, gia_von, kenh_ban, custom_policy } = req.body;
    const data = EcommercePolicyDAO.calculateItemPricing({
      gia_niem_yet,
      gia_von,
      kenh_ban,
      custom_policy,
    });
    return sendSuccess(res, data, "Tính toán khấu hao giá bán TMĐT thành công");
  });

  /* ── Compare All Channels ─────────────────────────────────────────────── */
  static compareEcommerceChannels = asyncHandler(async (req, res) => {
    const { gia_niem_yet, gia_von } = req.body;
    const data = EcommercePolicyDAO.compareOmnichannel({
      gia_niem_yet,
      gia_von,
    });
    return sendSuccess(res, data, "So sánh hiệu quả các kênh bán thành công");
  });

  /* ── Product Pricing Matrix for Ecommerce ─────────────────────────────── */
  static getEcommerceMatrix = asyncHandler(async (req, res) => {
    const data = await EcommercePolicyDAO.getProductPricingMatrix();
    return sendSuccess(res, data, "Lấy ma trận giá bán TMĐT thành công");
  });
}
