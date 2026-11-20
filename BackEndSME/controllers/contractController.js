import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import ContractDAO from "../models/contractDAO.js";
import { performedByOf } from "../utils/auditIdentity.js";

export class ContractController {
  static list = asyncHandler(async (req, res) => {
    const { q = "", trang_thai = "", page = 1, limit = 20 } = req.query;
    const result = await ContractDAO.list({ q, trang_thai, page, limit });
    const pagination = buildPagination(result.page, result.limit, result.total);
    return sendSuccess(res, result.items, "Lấy danh sách hợp đồng thành công", 200, pagination);
  });

  static getById = asyncHandler(async (req, res) => {
    const item = await ContractDAO.getById(req.params.id);
    if (!item) throw ApiError.notFound("Không tìm thấy hợp đồng");
    return sendSuccess(res, item, "Lấy chi tiết hợp đồng thành công");
  });

  static create = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const actor = performedByOf(req);
    const item = await ContractDAO.create(body, actor);
    return sendSuccess(res, item, "Tạo hợp đồng thành công", 201);
  });

  static payMilestone = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { milestoneIndex = 0, paymentMethod = "chuyen_khoan" } = req.body || {};
    const actor = performedByOf(req);

    const result = await ContractDAO.createMilestoneReceipt(id, Number(milestoneIndex), paymentMethod, actor);
    return sendSuccess(res, result, "Ghi nhận thanh toán đợt hợp đồng thành công");
  });
}

export default ContractController;
