import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import SoQuyDAO from "./soQuyDAO.js";

let contractsCol = null;

export class ContractDAO {
  static async injectDB(conn) {
    if (contractsCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    const db = conn.db(dbName);
    contractsCol = db.collection("hop_dong");
    await contractsCol.createIndex({ ma_hop_dong: 1 }, { unique: true });
    await contractsCol.createIndex({ partner_name: 1 });
    await contractsCol.createIndex({ trang_thai: 1 });
    logger.info("ContractDAO initialized");
  }

  static async list({ q = "", trang_thai = "", page = 1, limit = 20 } = {}) {
    const filter = {};
    if (trang_thai) filter.trang_thai = trang_thai;
    if (q) {
      filter.$or = [
        { ma_hop_dong: new RegExp(q, "i") },
        { ten_hop_dong: new RegExp(q, "i") },
        { partner_name: new RegExp(q, "i") },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      contractsCol.find(filter).sort({ ngay_ky: -1, created_at: -1 }).skip(skip).limit(Number(limit)).toArray(),
      contractsCol.countDocuments(filter),
    ]);

    return { items, total, page: Number(page), limit: Number(limit) };
  }

  static async getById(id) {
    if (!ObjectId.isValid(id)) return null;
    return await contractsCol.findOne({ _id: new ObjectId(id) });
  }

  static async create(doc, createdBy = null) {
    const year = new Date().getFullYear();
    const count = await contractsCol.countDocuments();
    const ma_hop_dong = doc.ma_hop_dong || `HD-${year}-${String(count + 1).padStart(4, "0")}`;

    const newDoc = {
      ma_hop_dong,
      ten_hop_dong: doc.ten_hop_dong || `Hợp đồng kinh tế ${ma_hop_dong}`,
      partner_id: doc.partner_id || null,
      partner_name: doc.partner_name || "Đối tác",
      order_id: doc.order_id || null,
      order_code: doc.order_code || "",
      gia_tri_hop_dong: Number(doc.gia_tri_hop_dong || 0),
      ngay_ky: doc.ngay_ky ? new Date(doc.ngay_ky) : new Date(),
      ngay_hieu_luc: doc.ngay_hieu_luc ? new Date(doc.ngay_hieu_luc) : new Date(),
      ngay_het_han: doc.ngay_het_han ? new Date(doc.ngay_het_han) : null,
      trang_thai: doc.trang_thai || "signed",
      dieu_khoan: doc.dieu_khoan || "",
      dot_thanh_toan: Array.isArray(doc.dot_thanh_toan) && doc.dot_thanh_toan.length
        ? doc.dot_thanh_toan
        : [
            { dot: 1, ten_dot: "Tạm ứng khi ký HĐ (30%)", ty_le: 30, so_tien: Math.round(Number(doc.gia_tri_hop_dong || 0) * 0.3), trang_thai: "pending" },
            { dot: 2, ten_dot: "Giao hàng & lắp đặt (50%)", ty_le: 50, so_tien: Math.round(Number(doc.gia_tri_hop_dong || 0) * 0.5), trang_thai: "pending" },
            { dot: 3, ten_dot: "Nghiệm thu quyết toán (20%)", ty_le: 20, so_tien: Math.round(Number(doc.gia_tri_hop_dong || 0) * 0.2), trang_thai: "pending" },
          ],
      created_by: createdBy,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const res = await contractsCol.insertOne(newDoc);
    return { ...newDoc, _id: res.insertedId };
  }

  /**
   * Tạo Phiếu Thu tiền cho đợt thanh toán của Hợp đồng
   */
  static async createMilestoneReceipt(contractId, milestoneIndex, paymentMethod = "chuyen_khoan", createdBy = null) {
    const contract = await this.getById(contractId);
    if (!contract) throw new Error("Không tìm thấy hợp đồng");

    const milestone = contract.dot_thanh_toan?.[milestoneIndex];
    if (!milestone) throw new Error("Không tìm thấy đợt thanh toán");

    if (milestone.trang_thai === "paid") {
      return { ok: true, message: "Đợt thanh toán này đã được ghi nhận trước đó" };
    }

    // Tạo phiếu thu trong sổ quỹ
    const receiptResult = await SoQuyDAO.taoPhieu({
      loai_phieu: "thu",
      hang_muc: "thu_tien_ban_hang",
      so_tien: milestone.so_tien,
      phuong_thuc: paymentMethod === "tien_mat" ? "tien_mat" : "chuyen_khoan",
      doi_tuong: {
        loai: "khach_hang",
        ten: contract.partner_name,
      },
      ma_chung_tu: contract.ma_hop_dong,
      ghi_chu: `Thu tiền ${milestone.ten_dot} - HĐ ${contract.ma_hop_dong}`,
      user: createdBy || {},
    });

    const maPhieuThu = receiptResult?.doc?.ma_phieu || `PT-${Date.now()}`;

    // Cập nhật trạng thái đợt thanh toán
    contract.dot_thanh_toan[milestoneIndex].trang_thai = "paid";
    contract.dot_thanh_toan[milestoneIndex].paid_at = new Date();
    contract.dot_thanh_toan[milestoneIndex].ma_phieu_thu = maPhieuThu;

    // Nếu tất cả các đợt đã thanh toán -> hoàn thành HĐ
    const allPaid = contract.dot_thanh_toan.every((d) => d.trang_thai === "paid");
    const newStatus = allPaid ? "completed" : contract.trang_thai;

    await contractsCol.updateOne(
      { _id: contract._id },
      {
        $set: {
          dot_thanh_toan: contract.dot_thanh_toan,
          trang_thai: newStatus,
          updated_at: new Date(),
        },
      }
    );

    return {
      ok: true,
      contractId: contract._id,
      milestoneIndex,
      ma_phieu_thu: receiptResult.ma_phieu,
      so_tien: milestone.so_tien,
      allPaid,
    };
  }
}

export default ContractDAO;
