import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import CrmPipelineDAO from "../models/crmPipelineDAO.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class CrmPipelineController {
  static list = asyncHandler(async (req, res) => {
    const { stage = "", q = "", mine = "" } = req.query;
    const ownerId = mine === "true" ? String(req.user?._id || "") : "";
    const data = await CrmPipelineDAO.list({ stage, q, ownerId });
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, "Lấy phễu cơ hội bán hàng thành công");
  });

  static create = asyncHandler(async (req, res) => {
    const result = await CrmPipelineDAO.create(req.body || {}, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction("CREATE_CRM_OPPORTUNITY", "crm_opportunity", String(result.doc._id), `Tạo cơ hội ${result.doc.ma_co_hoi}`, performedByOf(req), req.ip);
    return sendSuccess(res, result.doc, `Đã tạo cơ hội bán hàng ${result.doc.ma_co_hoi}`, 201);
  });

  static updateStage = asyncHandler(async (req, res) => {
    const { stage, probability, lost_reason = "" } = req.body || {};
    const result = await CrmPipelineDAO.updateStage(req.params.id, {
      stage,
      probability,
      lost_reason,
      user: req.user,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result.doc, "Cập nhật giai đoạn cơ hội thành công");
  });

  static addActivity = asyncHandler(async (req, res) => {
    const { type = "call", content = "", next_follow_up = null } = req.body || {};
    const result = await CrmPipelineDAO.addActivity(req.params.id, {
      type,
      content,
      next_follow_up,
      user: req.user,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result.doc, "Đã ghi nhận nhật ký chăm sóc khách hàng");
  });

  static convertToQuotation = asyncHandler(async (req, res) => {
    const result = await CrmPipelineDAO.convertToQuotation(req.params.id, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction("CONVERT_CRM_TO_QUOTATION", "crm_opportunity", String(req.params.id), `Chuyển cơ hội sang Báo giá ${result.doc.quotation_code}`, performedByOf(req), req.ip);
    return sendSuccess(res, result, `Đã tạo báo giá B2B ${result.doc.quotation_code} từ cơ hội CRM`);
  });
}
