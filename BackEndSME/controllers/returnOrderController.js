import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import ReturnOrderDAO from "../models/returnOrderDAO.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";
import { sendWebhookNotification } from "../utils/webhookNotifier.js";

export default class ReturnOrderController {
  /* ─── 1. Lấy danh sách phiếu RMA ─── */
  static list = asyncHandler(async (req, res) => {
    const { trang_thai, search, page = 1, limit = 20 } = req.query;
    const result = await ReturnOrderDAO.listRma({ trang_thai, search, page, limit });
    if (result.error) throw ApiError.internal(result.error.message);
    return sendSuccess(res, result, "Lấy danh sách phiếu đổi trả thành công");
  });

  /* ─── 2. Lấy chi tiết 1 phiếu RMA ─── */
  static getByCode = asyncHandler(async (req, res) => {
    const { ma_rma } = req.params;
    const doc = await ReturnOrderDAO.getByCode(ma_rma);
    if (!doc) throw ApiError.notFound("Không tìm thấy phiếu đổi trả");
    return sendSuccess(res, doc, "Lấy chi tiết phiếu đổi trả thành công");
  });

  /* ─── 3. Tạo yêu cầu đổi trả (RMA) ─── */
  static create = asyncHandler(async (req, res) => {
    const { ma_dh, ly_do, san_pham, phuong_an_hoan_tien, ghi_chu } = req.body || {};
    if (!ma_dh) throw ApiError.badRequest("Cần cung cấp mã đơn hàng gốc (ma_dh)");
    if (!Array.isArray(san_pham) || !san_pham.length) {
      throw ApiError.badRequest("Cần ít nhất 1 sản phẩm yêu cầu đổi trả");
    }

    const user = req.user || performedByOf(req) || {};
    const result = await ReturnOrderDAO.taoPhieuDoiTra({
      ma_dh,
      ly_do,
      san_pham,
      phuong_an_hoan_tien,
      ghi_chu,
      user,
    });

    if (result.error) throw ApiError.badRequest(result.error.message);

    logAction("CREATE_RMA", "doi_tra", result.doc?.ma_rma, `Tạo yêu cầu đổi trả: ${result.doc?.ma_rma} cho đơn ${ma_dh}`, user, req.ip);

    sendWebhookNotification({
      event: "RMA_CREATED",
      title: "Yêu Cầu Đổi Trả Hàng Mới",
      message: `Phiếu RMA ${result.doc?.ma_rma} được tạo cho đơn hàng ${ma_dh} bởi ${user.ho_ten || "Nhân viên"}. Tổng tiền hoàn: ${(result.doc?.tong_tien_hoan || 0).toLocaleString()} VNĐ.`,
      data: { ma_rma: result.doc?.ma_rma, ma_dh },
    }).catch(() => {});

    return sendSuccess(res, result.doc, "Tạo yêu cầu đổi trả hàng thành công", 201);
  });

  /* ─── 4. Kiểm định QC & Hoàn tất trả hàng (Thủ kho / QC Approver) ─── */
  static processQC = asyncHandler(async (req, res) => {
    const { ma_rma } = req.params;
    const { qc_details, ghi_chu_qc } = req.body || {};
    const user = req.user || performedByOf(req) || {};

    const result = await ReturnOrderDAO.xuLyQCvaHoanTat({
      ma_rma,
      qc_details: Array.isArray(qc_details) ? qc_details : [],
      ghi_chu_qc,
      user,
    });

    if (result.error) throw ApiError.badRequest(result.error.message);

    logAction("PROCESS_QC_RMA", "doi_tra", ma_rma, `QC và hoàn tất trả hàng: ${ma_rma}`, user, req.ip);

    sendWebhookNotification({
      event: "RMA_QC_COMPLETED",
      title: "Hoàn Tất Kiểm Định RMA & Nhập Kho",
      message: `Phiếu RMA ${ma_rma} đã được kiểm định QC và hoàn tất bởi ${user.ho_ten || "Thủ kho"}.`,
      data: { ma_rma },
    }).catch(() => {});

    return sendSuccess(res, result, "Kiểm định QC và hoàn tất đổi trả hàng thành công");
  });
}
