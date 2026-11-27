import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import ProcurementDAO from "../models/procurementDAO.js";
import { notifyDepartment } from "../utils/socketManager.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";
import { isAdminUser } from "../middleware/auth.js";

export default class ProcurementController {
  /* ─── PURCHASE REQUESTS (PR) ─── */
  static listPRs = asyncHandler(async (req, res) => {
    const data = await ProcurementDAO.listPRs({ status: req.query.status || "" });
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, "Lấy danh sách đề xuất mua hàng thành công");
  });

  static createPR = asyncHandler(async (req, res) => {
    const result = await ProcurementDAO.createPR(req.body || {}, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    notifyDepartment("kho", {
      type: "PURCHASE_REQUEST_CREATED",
      title: `Đề xuất mua hàng mới ${result.doc.ma_pr}`,
      message: `${result.doc.created_by?.ho_ten || "Nhân viên"} gửi đề xuất: ${result.doc.title}`,
      created_by: performedByOf(req),
    });
    logAction("CREATE_PR", "purchase_request", String(result.doc._id), `Tạo đề xuất mua hàng ${result.doc.ma_pr}`, performedByOf(req), req.ip);
    return sendSuccess(res, result.doc, `Đã tạo đề xuất mua hàng ${result.doc.ma_pr}`, 201);
  });

  static decidePR = asyncHandler(async (req, res) => {
    const existing = await ProcurementDAO.getPRById(req.params.id);
    if (!existing) throw ApiError.notFound("Không tìm thấy đề xuất mua hàng");

    const approve = req.body?.hanh_dong === "approve" || req.body?.approve === true;
    if (approve && !isAdminUser(req.user) && String(existing.nguoi_lap_id) === String(req.user?._id)) {
      throw ApiError.forbidden("Không thể tự duyệt đề xuất mua hàng của chính mình", "SELF_APPROVE_FORBIDDEN");
    }

    const result = await ProcurementDAO.decidePR(req.params.id, {
      approve,
      note: req.body?.ghi_chu || "",
      approver: req.user,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result.doc, approve ? "Đã duyệt đề xuất mua hàng" : "Đã từ chối đề xuất mua hàng");
  });

  /* ─── RFQ & QUOTE MATRIX ─── */
  static listRFQs = asyncHandler(async (req, res) => {
    const data = await ProcurementDAO.listRFQs({ status: req.query.status || "" });
    if (data?.error) throw ApiError.internal(data.error.message);
    return sendSuccess(res, data, "Lấy danh sách RFQ thành công");
  });

  static createRFQ = asyncHandler(async (req, res) => {
    const { pr_id = null, title = "", items = [], deadline = null, invited_vendors = [] } = req.body || {};
    const result = await ProcurementDAO.createRFQ({
      prId: pr_id,
      title,
      items,
      deadline,
      invitedVendors: invited_vendors,
      user: req.user,
    });
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction("CREATE_RFQ", "rfq", String(result.doc._id), `Tạo RFQ ${result.doc.ma_rfq}`, performedByOf(req), req.ip);
    return sendSuccess(res, result.doc, `Đã tạo yêu cầu báo giá ${result.doc.ma_rfq}`, 201);
  });

  static submitQuote = asyncHandler(async (req, res) => {
    const result = await ProcurementDAO.submitVendorQuote(req.params.id, req.body || {});
    if (result?.error) throw ApiError.badRequest(result.error.message);
    return sendSuccess(res, result.doc, "Đã ghi nhận báo giá từ nhà cung cấp");
  });

  static awardRFQ = asyncHandler(async (req, res) => {
    const { vendor_name } = req.body || {};
    if (!vendor_name) throw ApiError.badRequest("Vui lòng chọn nhà cung cấp trúng thầu");
    const result = await ProcurementDAO.awardAndConvertToPO(req.params.id, vendor_name, req.user);
    if (result?.error) throw ApiError.badRequest(result.error.message);
    logAction("AWARD_RFQ", "rfq", String(req.params.id), `Chọn thầu ${vendor_name} → tạo PO ${result.po_code}`, performedByOf(req), req.ip);
    return sendSuccess(res, result, `Đã chọn nhà cung cấp ${vendor_name} và sinh PO ${result.po_code}`);
  });

  /* ─── VENDOR SCORECARD & 3-WAY MATCH ─── */
  static vendorScorecard = asyncHandler(async (req, res) => {
    const rows = await ProcurementDAO.getVendorScorecard();
    return sendSuccess(res, rows, "Tính bảng xếp hạng nhà cung cấp thành công");
  });

  static threeWayMatch = asyncHandler(async (req, res) => {
    const result = ProcurementDAO.runThreeWayMatch(req.body || {});
    return sendSuccess(res, result, result.message);
  });
}
