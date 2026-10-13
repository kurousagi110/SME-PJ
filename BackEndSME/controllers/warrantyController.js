import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess, buildPagination } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import WarrantyDAO from "../models/warrantyDAO.js";
import { performedByOf } from "../utils/auditIdentity.js";

export class WarrantyController {
  static list = asyncHandler(async (req, res) => {
    const { q = "", trang_thai = "", page = 1, limit = 20 } = req.query;
    const result = await WarrantyDAO.list({ q, trang_thai, page, limit });
    const pagination = buildPagination(result.page, result.limit, result.total);
    return sendSuccess(res, result.items, "Lấy danh sách phiếu bảo hành thành công", 200, pagination);
  });

  static getById = asyncHandler(async (req, res) => {
    const item = await WarrantyDAO.getById(req.params.id);
    if (!item) throw ApiError.notFound("Không tìm thấy phiếu bảo hành");
    return sendSuccess(res, item, "Lấy chi tiết phiếu bảo hành thành công");
  });

  static lookup = asyncHandler(async (req, res) => {
    const { keyword = "" } = req.query;
    const items = await WarrantyDAO.lookup({ keyword });
    return sendSuccess(res, items, "Tra cứu phiếu bảo hành thành công");
  });

  static create = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const actor = performedByOf(req);
    const item = await WarrantyDAO.create(body, actor);
    return sendSuccess(res, item, "Tạo phiếu bảo hành thành công", 201);
  });

  static addTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { noi_dung, ky_thuat_vien, chi_phi } = req.body || {};
    const ticket = await WarrantyDAO.addMaintenanceTicket(id, { noi_dung, ky_thuat_vien, chi_phi });
    return sendSuccess(res, ticket, "Ghi nhận lịch sử bảo dưỡng thành công", 201);
  });
}

export default WarrantyController;
