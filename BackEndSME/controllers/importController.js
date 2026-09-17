import SanPhamDAO from "../models/sanPhamDAO.js";
import NguyenLieuDAO from "../models/nguyenLieuDAO.js";
import DoiTacDAO from "../models/doiTacDAO.js";
import { sendSuccess } from "../utils/response.js";
import asyncHandler from "../middleware/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { logAction } from "../utils/auditLogger.js";
import logger from "../utils/logger.js";

export default class ImportController {
  static bulkImport = asyncHandler(async (req, res) => {
    const { type, items, mode = "upsert" } = req.body || {};
    const user = req.user || {};
    const performedBy = req.user ? { tai_khoan: req.user.tai_khoan, ho_ten: req.user.ho_ten || req.user.tai_khoan } : null;

    if (!type || !["san_pham", "nguyen_lieu", "doi_tac"].includes(type)) {
      throw ApiError.badRequest("Loại dữ liệu nhập không hợp lệ (san_pham, nguyen_lieu, doi_tac)");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw ApiError.badRequest("Danh sách dữ liệu nhập không được để trống");
    }

    if (items.length > 500) {
      throw ApiError.badRequest("Mỗi lần nhập tối đa 500 dòng dữ liệu");
    }

    const results = {
      total: items.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
      inserted: [],
      updated: [],
    };

    if (type === "san_pham") {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 1;
        const ma_sp = (item.ma_sp || "").trim();
        const ten_sp = (item.ten_sp || "").trim();
        const don_gia = Number(item.don_gia) || 0;
        const so_luong = Number(item.so_luong) || 0;
        const mo_ta = (item.mo_ta || "").trim();

        if (!ma_sp || !ten_sp) {
          results.errorCount++;
          results.errors.push({ row: rowNum, ma: ma_sp, error: "Thiếu Mã SP hoặc Tên SP" });
          continue;
        }

        try {
          const addRes = await SanPhamDAO.addSanPham(ma_sp, ten_sp, don_gia, so_luong, mo_ta);
          if (addRes?.insertedId) {
            results.successCount++;
            results.inserted.push({ row: rowNum, ma: ma_sp, ten: ten_sp });
          } else if (addRes?.error) {
            if (mode === "upsert" && addRes.error.message?.includes("đã tồn tại")) {
              // Tìm và cập nhật
              const found = await SanPhamDAO.listSanPham({ search: ma_sp, limit: 1 });
              const existing = found?.items?.find((p) => p.ma_sp?.toLowerCase() === ma_sp.toLowerCase());
              if (existing?._id) {
                await SanPhamDAO.updateSanPham(existing._id, { ten_sp, don_gia, so_luong, mo_ta });
                results.successCount++;
                results.updated.push({ row: rowNum, ma: ma_sp, ten: ten_sp });
                continue;
              }
            }
            results.errorCount++;
            results.errors.push({ row: rowNum, ma: ma_sp, error: addRes.error.message || "Lỗi lưu sản phẩm" });
          }
        } catch (err) {
          results.errorCount++;
          results.errors.push({ row: rowNum, ma: ma_sp, error: err.message });
        }
      }
    } else if (type === "nguyen_lieu") {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 1;
        const ma_nl = (item.ma_nl || "").trim();
        const ten_nl = (item.ten_nl || "").trim();
        const don_vi = (item.don_vi || "").trim() || "cái";
        const gia_nhap = Number(item.gia_nhap) || 0;
        const so_luong = Number(item.so_luong) || 0;
        const ton_toi_thieu = Number(item.ton_toi_thieu) || 0;
        const mo_ta = (item.mo_ta || "").trim();

        if (!ma_nl || !ten_nl) {
          results.errorCount++;
          results.errors.push({ row: rowNum, ma: ma_nl, error: "Thiếu Mã NL hoặc Tên NL" });
          continue;
        }

        try {
          const addRes = await NguyenLieuDAO.addNguyenLieu({
            ma_nl,
            ten_nl,
            don_vi,
            gia_nhap,
            so_luong,
            ton_toi_thieu,
            mo_ta,
          });

          if (addRes?.insertedId) {
            results.successCount++;
            results.inserted.push({ row: rowNum, ma: ma_nl, ten: ten_nl });
          } else if (addRes?.error) {
            if (mode === "upsert" && addRes.error.message?.includes("đã tồn tại")) {
              const found = await NguyenLieuDAO.list({ search: ma_nl, limit: 1 });
              const existing = found?.items?.find((m) => m.ma_nl?.toLowerCase() === ma_nl.toLowerCase());
              if (existing?._id) {
                await NguyenLieuDAO.updateNguyenLieu(existing._id, {
                  ten_nl,
                  don_vi,
                  gia_nhap,
                  so_luong,
                  ton_toi_thieu,
                  mo_ta,
                });
                results.successCount++;
                results.updated.push({ row: rowNum, ma: ma_nl, ten: ten_nl });
                continue;
              }
            }
            results.errorCount++;
            results.errors.push({ row: rowNum, ma: ma_nl, error: addRes.error.message || "Lỗi lưu nguyên liệu" });
          }
        } catch (err) {
          results.errorCount++;
          results.errors.push({ row: rowNum, ma: ma_nl, error: err.message });
        }
      }
    } else if (type === "doi_tac") {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNum = i + 1;
        const ten = (item.ten || "").trim();
        const loai_doi_tac = ["khach_hang", "nha_cung_cap", "ca_hai"].includes(item.loai_doi_tac)
          ? item.loai_doi_tac
          : "khach_hang";
        const ma_doi_tac = (item.ma_doi_tac || "").trim();
        const so_dien_thoai = (item.so_dien_thoai || "").trim();
        const email = (item.email || "").trim();
        const dia_chi = (item.dia_chi || "").trim();
        const ma_so_thue = (item.ma_so_thue || "").trim();
        const nhom = (item.nhom || "").trim() || (loai_doi_tac === "nha_cung_cap" ? "chinh" : "khach_le");
        const ghi_chu = (item.ghi_chu || "").trim();

        if (!ten) {
          results.errorCount++;
          results.errors.push({ row: rowNum, ma: ma_doi_tac || "N/A", error: "Tên đối tác là bắt buộc" });
          continue;
        }

        try {
          const createRes = await DoiTacDAO.taoDoiTac({
            ma_doi_tac,
            loai_doi_tac,
            ten,
            so_dien_thoai,
            email,
            dia_chi,
            ma_so_thue,
            nhom,
            ghi_chu,
            user,
          });

          if (createRes?.insertedId) {
            results.successCount++;
            results.inserted.push({ row: rowNum, ma: createRes.doc?.ma_doi_tac || ma_doi_tac, ten });
          } else if (createRes?.error) {
            results.errorCount++;
            results.errors.push({ row: rowNum, ma: ma_doi_tac, error: createRes.error.message || "Lỗi lưu đối tác" });
          }
        } catch (err) {
          results.errorCount++;
          results.errors.push({ row: rowNum, ma: ma_doi_tac, error: err.message });
        }
      }
    }

    logAction(
      "BULK_IMPORT",
      type,
      "import",
      `Nhập dữ liệu hàng loạt ${type}: ${results.successCount}/${results.total} thành công`,
      performedBy,
      req.ip
    );

    return sendSuccess(
      res,
      results,
      `Nhập thành công ${results.successCount}/${results.total} dòng dữ liệu`,
      200
    );
  });
}
