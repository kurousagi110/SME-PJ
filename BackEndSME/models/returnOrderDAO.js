import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import SanPhamDAO from "./sanPhamDAO.js";
import SoQuyDAO from "./soQuyDAO.js";

let rmaCol = null;
let donHangCol = null;

export const RMA_STATUS = {
  PENDING: "cho_xu_ly",       // Mới tiếp nhận yêu cầu đổi trả
  INSPECTING: "kiem_tra_qc",  // Hàng đã về kho, đang kiểm tra chất lượng
  APPROVED: "da_duyet",       // Đã duyệt phương án xử lý
  COMPLETED: "hoan_thanh",    // Đã nhập kho lại / hoàn tiền xong
  REJECTED: "tu_choi",        // Từ chối nhận lại hàng
};

export const QC_RESULT = {
  RESTOCK: "nhap_lai_kho",       // Còn nguyên seal / đạt chuẩn, nhập lại kho bán tiếp
  SCRAP: "phe_pham",             // Lỗi hỏng nặng, đưa vào kho hủy/phế liệu
  REPAIR: "can_sua_chua",        // Chuyển sang xưởng sản xuất để bảo hành/sửa
};

export const REFUND_METHOD = {
  CASH_REFUND: "hoan_tien_mat",        // Xuất phiếu chi tiền mặt
  BANK_REFUND: "hoan_chuyen_khoan",    // Xuất phiếu chi chuyển khoản
  DEBT_OFFSET: "can_tru_cong_no",     // Cấn trừ vào công nợ đơn hàng sau
};

function genRmaCode() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RMA-${ymd}-${rand}`;
}

export default class ReturnOrderDAO {
  static async injectDB(conn) {
    if (rmaCol && donHangCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME || "SME_db_mongo";
    const db = conn.db(dbName);
    rmaCol = db.collection("doi_tra_hang");
    donHangCol = db.collection("don_hang");

    try {
      await rmaCol.createIndex({ ma_rma: 1 }, { unique: true });
      await rmaCol.createIndex({ ma_dh: 1 });
      await rmaCol.createIndex({ trang_thai: 1 });
      await rmaCol.createIndex({ created_at: -1 });
    } catch (err) {
      logger.error("Error creating indexes in doi_tra_hang", { error: err.message });
    }
  }

  /**
   * Tạo phiếu yêu cầu đổi/trả hàng mới từ đơn bán hàng (Sale Order)
   */
  static async taoPhieuDoiTra({
    ma_dh,
    ly_do = "",
    san_pham = [], // [{ san_pham_id, ma_sp, ten_sp, so_luong, don_gia }]
    phuong_an_hoan_tien = REFUND_METHOD.DEBT_OFFSET,
    ghi_chu = "",
    user = {},
  }) {
    try {
      const order = await donHangCol.findOne({ ma_dh: String(ma_dh).trim() });
      if (!order) return { error: new Error("Không tìm thấy đơn hàng gốc: " + ma_dh) };

      if (!san_pham || !san_pham.length) {
        return { error: new Error("Cần ít nhất 1 sản phẩm yêu cầu đổi trả") };
      }

      const ma_rma = genRmaCode();
      const now = new Date();

      let tong_tien_hoan = 0;
      const items = san_pham.map((sp) => {
        const qty = Math.max(1, Number(sp.so_luong) || 1);
        const price = Math.max(0, Number(sp.don_gia) || 0);
        const subtotal = qty * price;
        tong_tien_hoan += subtotal;
        return {
          san_pham_id: sp.san_pham_id ? String(sp.san_pham_id) : null,
          ma_sp: sp.ma_sp || "",
          ten_sp: sp.ten_sp || "",
          so_luong: qty,
          don_gia: price,
          thanh_tien: subtotal,
          qc_result: null, // Sẽ điền khi kho kiểm tra
        };
      });

      const doc = {
        ma_rma,
        ma_dh: order.ma_dh,
        order_id: order._id,
        khach_hang: {
          ten: order.khach_hang?.ten || order.khach_hang_ten || "Khách hàng",
          so_dien_thoai: order.khach_hang?.so_dien_thoai || "",
        },
        ly_do: String(ly_do).trim(),
        san_pham: items,
        tong_tien_hoan,
        phuong_an_hoan_tien,
        trang_thai: RMA_STATUS.PENDING,
        ma_phieu_chi: null,
        ghi_chu: String(ghi_chu).trim(),
        created_by: {
          user_id: user._id || user.id ? String(user._id || user.id) : null,
          ho_ten: user.ho_ten || user.tai_khoan || "Hệ thống",
        },
        created_at: now,
        updated_at: now,
      };

      const result = await rmaCol.insertOne(doc);
      return { ok: true, insertedId: result.insertedId, doc };
    } catch (e) {
      logger.error("ReturnOrderDAO.taoPhieuDoiTra error", { error: e.message });
      return { error: e };
    }
  }

  /**
   * Cập nhật kết quả kiểm định chất lượng (QC Gate) và hoàn tất trả hàng
   */
  static async xuLyQCvaHoanTat({
    ma_rma,
    qc_details = [], // [{ ma_sp, qc_result: 'nhap_lai_kho' | 'phe_pham' | 'can_sua_chua' }]
    ghi_chu_qc = "",
    user = {},
  }) {
    try {
      const rma = await rmaCol.findOne({ ma_rma: String(ma_rma).trim() });
      if (!rma) return { error: new Error("Không tìm thấy phiếu RMA: " + ma_rma) };

      if (rma.trang_thai === RMA_STATUS.COMPLETED) {
        return { error: new Error("Phiếu RMA đã hoàn tất xử lý trước đó") };
      }

      const qcMap = new Map(qc_details.map((q) => [q.ma_sp, q.qc_result]));
      const updatedItems = [];

      // 1. Nhập lại kho các sản phẩm đạt chuẩn QC
      for (const item of rma.san_pham) {
        const result = qcMap.get(item.ma_sp) || QC_RESULT.RESTOCK;
        item.qc_result = result;
        updatedItems.push(item);

        if (result === QC_RESULT.RESTOCK && item.san_pham_id) {
          // Cộng lại tồn kho sản phẩm
          await SanPhamDAO.adjustStock(item.san_pham_id, item.so_luong, { allowNegative: true });
          logger.info("RMA restocked item to inventory", { ma_sp: item.ma_sp, qty: item.so_luong });
        }
      }

      // 2. Tự động sinh Phiếu Chi nếu phương án là hoàn tiền mặt hoặc chuyển khoản
      let ma_phieu_chi = null;
      if (
        (rma.phuong_an_hoan_tien === REFUND_METHOD.CASH_REFUND ||
          rma.phuong_an_hoan_tien === REFUND_METHOD.BANK_REFUND) &&
        rma.tong_tien_hoan > 0
      ) {
        const isCash = rma.phuong_an_hoan_tien === REFUND_METHOD.CASH_REFUND;
        const resChi = await SoQuyDAO.taoPhieu({
          loai_phieu: "chi",
          hang_muc: "chi_hoan_tien_tra_hang",
          so_tien: rma.tong_tien_hoan,
          phuong_thuc: isCash ? "tien_mat" : "chuyen_khoan",
          doi_tuong: {
            loai: "khach_hang",
            ten: rma.khach_hang?.ten || "Khách hàng",
            so_dien_thoai: rma.khach_hang?.so_dien_thoai || "",
          },
          ma_chung_tu: rma.ma_rma,
          ghi_chu: `Hoàn tiền phiếu đổi trả hàng ${rma.ma_rma} (Đơn gốc ${rma.ma_dh})`,
          user,
        });
        ma_phieu_chi = resChi.doc?.ma_phieu;
      }

      // 3. Cập nhật phiếu RMA sang hoàn thành
      const now = new Date();
      await rmaCol.updateOne(
        { ma_rma: rma.ma_rma },
        {
          $set: {
            san_pham: updatedItems,
            trang_thai: RMA_STATUS.COMPLETED,
            ghi_chu_qc: String(ghi_chu_qc).trim(),
            ma_phieu_chi,
            processed_by: {
              user_id: user._id || user.id ? String(user._id || user.id) : null,
              ho_ten: user.ho_ten || user.tai_khoan || "Hệ thống",
            },
            completed_at: now,
            updated_at: now,
          },
        }
      );

      return {
        ok: true,
        ma_rma: rma.ma_rma,
        trang_thai: RMA_STATUS.COMPLETED,
        ma_phieu_chi,
      };
    } catch (e) {
      logger.error("ReturnOrderDAO.xuLyQCvaHoanTat error", { error: e.message });
      return { error: e };
    }
  }

  /**
   * Lấy danh sách phiếu đổi trả hàng
   */
  static async listRma({ trang_thai, search, page = 1, limit = 20 } = {}) {
    try {
      const filter = {};
      if (trang_thai && trang_thai !== "all") filter.trang_thai = trang_thai;
      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [{ ma_rma: regex }, { ma_dh: regex }, { "khach_hang.ten": regex }];
      }

      const p = Math.max(1, Number(page) || 1);
      const l = Math.max(1, Math.min(100, Number(limit) || 20));
      const skip = (p - 1) * l;

      const [items, total] = await Promise.all([
        rmaCol.find(filter).sort({ created_at: -1 }).skip(skip).limit(l).toArray(),
        rmaCol.countDocuments(filter),
      ]);

      return {
        ok: true,
        items,
        pagination: {
          total,
          page: p,
          limit: l,
          totalPages: Math.ceil(total / l) || 1,
        },
      };
    } catch (e) {
      logger.error("ReturnOrderDAO.listRma error", { error: e.message });
      return { error: e };
    }
  }

  /**
   * Lấy chi tiết phiếu RMA
   */
  static async getByCode(ma_rma) {
    try {
      return await rmaCol.findOne({ ma_rma: String(ma_rma).trim() });
    } catch (e) {
      logger.error("ReturnOrderDAO.getByCode error", { error: e.message });
      return null;
    }
  }
}
