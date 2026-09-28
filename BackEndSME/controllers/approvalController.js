import asyncHandler from "../middleware/asyncHandler.js";
import { ObjectId } from "mongodb";
import { getDB } from "../config/database.js";
import DonHangService from "../services/donHangService.js";
import DieuChinhKhoDAO from "../models/dieuChinhKhoDAO.js";
import LuongDAO from "../models/luongDAO.js";
import { notifyDepartment, notifyUser } from "../utils/socketManager.js";
import ApiError from "../utils/ApiError.js";
import { isAdminUser } from "../middleware/auth.js";

export default class ApprovalController {
  /* GET /api/v1/approvals/pending — Tổng hợp tất cả chứng từ đang chờ phê duyệt */
  static getPendingApprovals = asyncHandler(async (req, res) => {
    const db = getDB();

    // 1. Đơn mua vật tư chờ duyệt (loai_don = 'purchase_receipt', trang_thai = 'draft')
    const purchases = await db
      .collection("don_hang")
      .find({
        loai_don: "purchase_receipt",
        trang_thai: "draft",
      })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    // 2. Phiếu điều chỉnh kho chờ duyệt (trang_thai = 'cho_duyet')
    const stockAdjustments = await db
      .collection("dieu_chinh_kho")
      .find({
        trang_thai: { $in: ["cho_duyet", "pending"] },
      })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    // 3. Đơn bán hàng nháp chờ xác nhận (loai_don = 'sale', trang_thai = 'draft')
    const sales = await db
      .collection("don_hang")
      .find({
        loai_don: "sale",
        trang_thai: "draft",
      })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    // 4. Phiếu đổi trả hàng chờ QC kiểm tra & phê duyệt (trang_thai = 'cho_xu_ly' hoặc 'kiem_tra_qc')
    const returnOrders = await db
      .collection("doi_tra_hang")
      .find({
        trang_thai: { $in: ["cho_xu_ly", "kiem_tra_qc"] },
      })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    // 5. Bảng lương tháng hiện tại
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const payrollStatus = await LuongDAO.kiemTraTrangThaiChiLuong(currentMonth, currentYear);

    const totalPending =
      purchases.length +
      stockAdjustments.length +
      sales.length +
      returnOrders.length +
      (payrollStatus.da_chi ? 0 : 1);

    return res.status(200).json({
      success: true,
      data: {
        totalPending,
        purchases,
        stockAdjustments,
        sales,
        returnOrders,
        payroll: {
          thang: currentMonth,
          nam: currentYear,
          da_chi: !!payrollStatus.da_chi,
          ma_phieu: payrollStatus.ma_phieu,
          ngay_chi_tra: payrollStatus.ngay_chi_tra,
        },
      },
    });
  });

  /* POST /api/v1/approvals/action — Xử lý phê duyệt hoặc từ chối chứng từ */
  static processApproval = asyncHandler(async (req, res) => {
    const user = req.user;
    const { loai, id, hanh_dong, ghi_chu = "" } = req.body;

    if (!loai || !id || !hanh_dong) {
      throw ApiError.badRequest("Thiếu thông tin loai, id hoặc hanh_dong");
    }

    const isApprove = hanh_dong === "approve";
    const isDirectorOrAdmin = isAdminUser(user);
    const isChiefAccountant =
      isDirectorOrAdmin ||
      user?.chuc_vu?.ten === "Kế toán trưởng" ||
      user?.chuc_vu?.ten === "Kế toán" ||
      user?.phong_ban?.ten === "Phòng kế toán";
    const isSalesManager =
      isDirectorOrAdmin ||
      user?.chuc_vu?.ten === "Trưởng phòng" ||
      user?.phong_ban?.ten === "Phòng kinh doanh";
    const isWarehouseApprover =
      isDirectorOrAdmin ||
      user?.chuc_vu?.ten === "Thủ kho" ||
      user?.phong_ban?.ten === "Phòng kho";

    if (loai === "purchase") {
      if (!isWarehouseApprover) {
        throw ApiError.forbidden("Bạn không có quyền phê duyệt đơn mua hàng");
      }
      const nextStatus = isApprove ? "confirmed" : "cancelled";
      await DonHangService.updateStatus(id, nextStatus, {
        mongoClient: req.app?.locals?.mongoClient,
        nguoi_thao_tac_id: user._id,
      });

      notifyDepartment("kho", {
        type: isApprove ? "PURCHASE_RECEIPT_STATUS_UPDATED" : "PURCHASE_RECEIPT_STATUS_UPDATED",
        title: isApprove ? "Đơn mua hàng đã được duyệt" : "Đơn mua hàng bị từ chối",
        message: `Đơn mua ${id} đã được ${isApprove ? "duyệt" : "từ chối"} bởi ${user.ho_ten || user.tai_khoan}${ghi_chu ? `: "${ghi_chu}"` : ""}`,
        created_by: user,
      });

      return res.status(200).json({
        success: true,
        message: isApprove ? "Đã duyệt đơn mua hàng thành công" : "Đã từ chối đơn mua hàng",
      });
    }

    if (loai === "stock_adjustment") {
      if (!isWarehouseApprover) {
        throw ApiError.forbidden("Bạn không có quyền phê duyệt phiếu điều chỉnh kho");
      }
      if (isApprove) {
        await DieuChinhKhoDAO.duyetPhieu(id, user);
      } else {
        await DieuChinhKhoDAO.tuChoiPhieu(id, ghi_chu || "Từ chối duyệt điều chỉnh kho", user);
      }

      notifyDepartment("kho", {
        type: isApprove ? "DCK_APPROVED" : "DCK_REJECTED",
        title: isApprove ? "Phiếu điều chỉnh kho đã duyệt" : "Phiếu điều chỉnh kho bị từ chối",
        message: `Phiếu kiểm kê ${id} đã ${isApprove ? "được duyệt" : "bị từ chối"} bởi ${user.ho_ten || user.tai_khoan}`,
        created_by: user,
      });

      return res.status(200).json({
        success: true,
        message: isApprove ? "Đã duyệt phiếu điều chỉnh kho" : "Đã từ chối phiếu điều chỉnh kho",
      });
    }

    if (loai === "sale") {
      if (!isSalesManager) {
        throw ApiError.forbidden("Bạn không có quyền phê duyệt đơn bán hàng");
      }
      const nextStatus = isApprove ? "confirmed" : "cancelled";
      await DonHangService.updateStatus(id, nextStatus, {
        mongoClient: req.app?.locals?.mongoClient,
        nguoi_thao_tac_id: user._id,
      });

      notifyDepartment("kinh_doanh", {
        type: "SALE_STATUS_UPDATED",
        title: isApprove ? "Đơn bán hàng đã được duyệt" : "Đơn bán hàng bị từ chối",
        message: `Đơn bán hàng ${id} đã được ${isApprove ? "duyệt" : "từ chối"} bởi ${user.ho_ten || user.tai_khoan}`,
        created_by: user,
      });

      return res.status(200).json({
        success: true,
        message: isApprove ? "Đã duyệt đơn bán hàng" : "Đã từ chối đơn bán hàng",
      });
    }

    if (loai === "payroll") {
      if (!isDirectorOrAdmin && !isChiefAccountant) {
        throw ApiError.forbidden("Chỉ Ban Giám Đốc hoặc Kế toán trưởng mới có quyền duyệt chi lương");
      }
      if (!isApprove) {
        return res.status(200).json({ success: true, message: "Đã tạm hoãn duyệt chi lương" });
      }

      const now = new Date();
      const thang = Number(req.body.thang) || now.getMonth() + 1;
      const nam = Number(req.body.nam) || now.getFullYear();

      const payResult = await LuongDAO.chiTraLuongThang({
        thang,
        nam,
        phuong_thuc: req.body.phuong_thuc || "tien_mat",
        ghi_chu: ghi_chu || `Duyệt chi trả lương từ Hộp Thư Trình Ký (${user.ho_ten})`,
        user,
      });

      if (payResult.error) {
        throw ApiError.badRequest(payResult.error.message || "Chi trả lương thất bại");
      }

      notifyDepartment("nhan_su", {
        type: "SYSTEM_NOTIFICATION",
        title: "Kỳ lương đã được phê duyệt chi",
        message: `Kỳ lương Tháng ${thang}/${nam} đã được duyệt chi bởi ${user.ho_ten || user.tai_khoan}`,
        created_by: user,
      });

      return res.status(200).json({
        success: true,
        message: `Đã duyệt chi trả lương Tháng ${thang}/${nam} thành công`,
        data: payResult,
      });
    }

    if (loai === "return_order" || loai === "rma") {
      if (!isWarehouseApprover && !isSalesManager) {
        throw ApiError.forbidden("Bạn không có quyền phê duyệt phiếu đổi trả hàng");
      }

      if (!isApprove) {
        const db = getDB();
        await db.collection("doi_tra_hang").updateOne(
          { ma_rma: String(id) },
          {
            $set: {
              trang_thai: "tu_choi",
              ly_do_tu_choi: ghi_chu || "Từ chối tiếp nhận đổi trả",
              rejected_by: user,
              updated_at: new Date(),
            },
          }
        );
        return res.status(200).json({ success: true, message: "Đã từ chối yêu cầu đổi trả hàng" });
      }

      // Khi approve → chuyển sang bước kiểm định kho (kiem_tra_qc)
      const db = getDB();
      await db.collection("doi_tra_hang").updateOne(
        { ma_rma: String(id) },
        {
          $set: {
            trang_thai: "kiem_tra_qc",
            approved_by: user,
            updated_at: new Date(),
          },
        }
      );

      notifyDepartment("kho", {
        type: "RMA_APPROVED",
        title: "Yêu cầu đổi trả đã được duyệt, chờ kiểm định QC",
        message: `Phiếu đổi trả ${id} đã được duyệt bởi ${user.ho_ten || user.tai_khoan}. Vui lòng kiểm định QC khi nhận hàng.`,
        created_by: user,
      });

      return res.status(200).json({
        success: true,
        message: "Đã phê duyệt yêu cầu đổi trả, chuyển kho kiểm tra QC",
      });
    }

    throw ApiError.badRequest(`Loại chứng từ '${loai}' không hợp lệ`);
  });
}
