import asyncHandler from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/ApiError.js";
import SoQuyDAO, { LOAI_PHIEU, PHUONG_THUC } from "../models/soQuyDAO.js";
import PeriodClosingDAO from "../models/periodClosingDAO.js";
import { sendWebhookNotification } from "../utils/webhookNotifier.js";
import { logAction } from "../utils/auditLogger.js";
import { performedByOf } from "../utils/auditIdentity.js";

export default class CashbookController {
  /* ─── 1. Lấy danh sách phiếu thu chi ─── */
  static list = asyncHandler(async (req, res) => {
    const loai_phieu = req.query.loai_phieu || req.query.type;
    const hang_muc = req.query.hang_muc || req.query.category;
    const phuong_thuc = req.query.phuong_thuc || req.query.method;
    const tu_ngay = req.query.tu_ngay || req.query.fromDate || req.query.from;
    const den_ngay = req.query.den_ngay || req.query.toDate || req.query.to;
    const search = req.query.search || req.query.q;
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;

    const result = await SoQuyDAO.layDanhSachSoQuy({
      loai_phieu,
      hang_muc,
      phuong_thuc,
      tu_ngay,
      den_ngay,
      search,
      page,
      limit,
    });

    if (result.error) {
      throw ApiError.internal("Không thể lấy danh sách sổ quỹ: " + result.error.message);
    }

    return sendSuccess(res, result, "Lấy danh sách sổ quỹ thành công");
  });

  /* ─── 2. Thống kê tổng quan dòng tiền ─── */
  static getTongQuan = asyncHandler(async (req, res) => {
    const result = await SoQuyDAO.layTongQuanDoiSoat();
    if (result.error) {
      throw ApiError.internal("Không thể lấy tổng quan sổ quỹ: " + result.error.message);
    }
    return sendSuccess(res, result, "Lấy tổng quan sổ quỹ thành công");
  });

  /* ─── 3. Danh sách công nợ khách hàng & nhà cung cấp ─── */
  static getCongNo = asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 300;
    const result = await SoQuyDAO.layDanhSachCongNo({ limit });
    if (result.error) {
      throw ApiError.internal("Không thể lấy danh sách công nợ: " + result.error.message);
    }
    return sendSuccess(res, result, "Lấy danh sách công nợ thành công");
  });

  /* ─── 4. Lập phiếu thu / chi mới ─── */
  static create = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const loai_phieu = body.loai_phieu || body.type;
    const hang_muc = body.hang_muc || body.category;
    const so_tien = body.so_tien ?? body.amount;
    const phuong_thuc = body.phuong_thuc || body.method;
    const doi_tuong = body.doi_tuong || body.partner || body.target;
    const ma_chung_tu = body.ma_chung_tu || body.reference_code || body.doc_code;
    const ngay_ghi_nhan = body.ngay_ghi_nhan || body.record_date || body.date;
    const ghi_chu = body.ghi_chu || body.note;

    if (!loai_phieu || ![LOAI_PHIEU.THU, LOAI_PHIEU.CHI].includes(loai_phieu)) {
      throw ApiError.badRequest("loai_phieu (type) phải là 'thu' hoặc 'chi'", "VALIDATION_ERROR");
    }

    const amount = Number(so_tien);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw ApiError.badRequest("Số tiền phải lớn hơn 0", "VALIDATION_ERROR");
    }

    const user = req.user || performedByOf(req) || {};

    // CLOSED-LOOP: Kiểm tra kỳ kế toán đã khóa sổ chưa
    const recordDate = ngay_ghi_nhan || new Date();
    const isLocked = await PeriodClosingDAO.isDateLocked(recordDate);
    if (isLocked) {
      throw ApiError.forbidden(`Kỳ kế toán chứa ngày ${new Date(recordDate).toLocaleDateString("vi-VN")} đã được chốt sổ. Không thể tạo phiếu mới!`);
    }

    const result = await SoQuyDAO.taoPhieu({
      loai_phieu,
      hang_muc,
      so_tien: amount,
      phuong_thuc,
      doi_tuong,
      ma_chung_tu,
      ngay_ghi_nhan,
      ghi_chu,
      user,
    });

    if (result.error) {
      throw ApiError.internal("Không thể tạo phiếu thu/chi: " + result.error.message);
    }

    logAction(
      "CREATE",
      "so_quy",
      result.insertedId?.toString(),
      `Tạo phiếu ${loai_phieu === "thu" ? "thu" : "chi"} ${result.doc?.ma_phieu}: ${amount.toLocaleString("vi-VN")} đ`,
      user,
      req.ip
    );

    return sendSuccess(res, result.doc, "Tạo phiếu thu/chi thành công", 201);
  });

  /* ─── 5. Hủy phiếu thu / chi ─── */
  static cancel = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const ly_do = req.body?.ly_do || req.body?.reason;
    const user = req.user || performedByOf(req) || {};

    const existing = await SoQuyDAO.getById(id);
    if (!existing) {
      throw ApiError.notFound("Không tìm thấy phiếu thu/chi");
    }

    if (existing.trang_thai === "cancelled") {
      throw ApiError.badRequest("Phiếu đã bị hủy trước đó");
    }

    // CLOSED-LOOP: Kiểm tra kỳ kế toán đã chốt sổ chưa
    const isLocked = await PeriodClosingDAO.isDateLocked(existing.ngay_ghi_nhan || existing.created_at);
    if (isLocked) {
      throw ApiError.forbidden("Phiếu thuộc kỳ kế toán đã chốt sổ. Không thể hủy hoặc sửa đổi!");
    }

    const result = await SoQuyDAO.huyPhieu(id, { ly_do, user });
    if (result.error) {
      throw ApiError.internal("Không thể hủy phiếu: " + result.error.message);
    }

    logAction(
      "UPDATE",
      "so_quy",
      String(id),
      `Hủy phiếu ${existing.ma_phieu}: ${ly_do || "Không có lý do"}`,
      user,
      req.ip
    );

    return sendSuccess(res, { ok: true }, "Hủy phiếu thu/chi thành công");
  });

  /* ─── 6. Chi tiết 1 phiếu ─── */
  static getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doc = await SoQuyDAO.getById(id);
    if (!doc) {
      throw ApiError.notFound("Không tìm thấy phiếu thu/chi");
    }
    return sendSuccess(res, doc, "Lấy thông tin phiếu thành công");
  });

  /* ─── 7. Quản lý kỳ kế toán & Chốt sổ ─── */
  static listPeriods = asyncHandler(async (req, res) => {
    const periods = await PeriodClosingDAO.listPeriods();
    return sendSuccess(res, { items: periods }, "Lấy danh sách kỳ kế toán thành công");
  });

  static closePeriod = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const ky = body.ky || body.period;
    const tu_ngay = body.tu_ngay || body.fromDate || body.from;
    const den_ngay = body.den_ngay || body.toDate || body.to;
    const ghi_chu = body.ghi_chu || body.note;

    if (!ky || !tu_ngay || !den_ngay) {
      throw ApiError.badRequest("Cần cung cấp tên kỳ (period/ky), từ ngày (fromDate/tu_ngay) và đến ngày (toDate/den_ngay)");
    }
    const user = req.user || performedByOf(req) || {};
    const result = await PeriodClosingDAO.closePeriod({ ky, tu_ngay, den_ngay, ghi_chu, user });
    if (result.error) throw ApiError.internal(result.error.message);

    logAction("CLOSE_PERIOD", "so_quy", ky, `Chốt sổ kỳ kế toán: ${ky}`, user, req.ip);

    sendWebhookNotification({
      event: "PERIOD_CLOSED",
      title: "Chốt Sổ Kỳ Kế Toán",
      message: `Kỳ kế toán ${ky} đã được khóa sổ bởi ${user.ho_ten || "Kế toán trưởng"}. Tất cả chứng từ sổ quỹ trong kỳ đã được niêm phong.`,
      data: { ky, tu_ngay, den_ngay },
    }).catch(() => {});

    return sendSuccess(res, result, `Chốt sổ kỳ kế toán ${ky} thành công`);
  });

  static reopenPeriod = asyncHandler(async (req, res) => {
    const { ky } = req.params;
    const ly_do = req.body?.ly_do || req.body?.reason;
    const user = req.user || performedByOf(req) || {};
    const result = await PeriodClosingDAO.reopenPeriod(ky, { ly_do, user });
    if (result.error) throw ApiError.internal(result.error.message);

    logAction("REOPEN_PERIOD", "so_quy", ky, `Mở khóa kỳ kế toán: ${ky} (${ly_do || ""})`, user, req.ip);

    sendWebhookNotification({
      event: "PERIOD_REOPENED",
      title: "Mở Khóa Kỳ Kế Toán",
      message: `Kỳ kế toán ${ky} được mở khóa bởi ${user.ho_ten || "Giám đốc"}. Lý do: ${ly_do || "Điều chỉnh số liệu"}.`,
      data: { ky, ly_do },
    }).catch(() => {});

    return sendSuccess(res, result, `Mở khóa kỳ kế toán ${ky} thành công`);
  });
}

export const SoQuyController = CashbookController;
