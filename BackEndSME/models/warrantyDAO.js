import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";

let warrantyCol = null;

export class WarrantyDAO {
  static async injectDB(conn) {
    if (warrantyCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    const db = conn.db(dbName);
    warrantyCol = db.collection("phieu_bao_hanh");
    await warrantyCol.createIndex({ ma_bao_hanh: 1 }, { unique: true });
    await warrantyCol.createIndex({ serial_number: 1 }, { sparse: true });
    await warrantyCol.createIndex({ so_dien_thoai: 1 });
    await warrantyCol.createIndex({ trang_thai: 1 });
    logger.info("WarrantyDAO initialized");
  }

  static async list({ q = "", trang_thai = "", page = 1, limit = 20 } = {}) {
    const filter = {};
    if (trang_thai) filter.trang_thai = trang_thai;
    if (q) {
      filter.$or = [
        { ma_bao_hanh: new RegExp(q, "i") },
        { serial_number: new RegExp(q, "i") },
        { so_dien_thoai: new RegExp(q, "i") },
        { khach_hang_ten: new RegExp(q, "i") },
        { ten_sp: new RegExp(q, "i") },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      warrantyCol.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray(),
      warrantyCol.countDocuments(filter),
    ]);

    return { items, total, page: Number(page), limit: Number(limit) };
  }

  static async getById(id) {
    if (!ObjectId.isValid(id)) return null;
    return await warrantyCol.findOne({ _id: new ObjectId(id) });
  }

  static async lookup({ keyword = "" } = {}) {
    const clean = String(keyword).trim();
    if (!clean) return [];

    return await warrantyCol.find({
      $or: [
        { so_dien_thoai: clean },
        { serial_number: clean },
        { ma_bao_hanh: clean },
        { ma_dh: clean },
      ],
    }).sort({ created_at: -1 }).toArray();
  }

  static async create(doc, createdBy = null) {
    const year = new Date().getFullYear();
    const count = await warrantyCol.countDocuments();
    const ma_bao_hanh = doc.ma_bao_hanh || `BH-${year}-${String(count + 1).padStart(4, "0")}`;

    const activationDate = doc.ngay_kich_hoat ? new Date(doc.ngay_kich_hoat) : new Date();
    const durationMonths = Number(doc.thoi_han_thang || 12);
    const expirationDate = doc.ngay_het_han
      ? new Date(doc.ngay_het_han)
      : new Date(activationDate.getTime() + durationMonths * 30 * 86400000);

    const now = new Date();
    const isExpired = expirationDate < now;

    const newDoc = {
      ma_bao_hanh,
      ma_dh: doc.ma_dh || "",
      san_pham_id: doc.san_pham_id || null,
      ma_sp: doc.ma_sp || "",
      ten_sp: doc.ten_sp || "Sản phẩm bảo hành",
      serial_number: doc.serial_number || `SN-${Date.now().toString(36).toUpperCase()}`,
      khach_hang_ten: doc.khach_hang_ten || "Khách mua hàng",
      so_dien_thoai: doc.so_dien_thoai || "",
      dia_chi: doc.dia_chi || "",
      ngay_kich_hoat: activationDate,
      thoi_han_thang: durationMonths,
      ngay_het_han: expirationDate,
      trang_thai: isExpired ? "expired" : (doc.trang_thai || "active"),
      lich_su_bao_tri: Array.isArray(doc.lich_su_bao_tri) ? doc.lich_su_bao_tri : [],
      created_by: createdBy,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const res = await warrantyCol.insertOne(newDoc);
    return { ...newDoc, _id: res.insertedId };
  }

  /**
   * Ghi nhận lịch sử bảo dưỡng / sửa chữa (Service Ticket)
   */
  static async addMaintenanceTicket(id, { noi_dung, ky_thuat_vien = "KTV", chi_phi = 0 }) {
    if (!ObjectId.isValid(id)) throw new Error("ID không hợp lệ");

    const ticket = {
      ticket_id: `SRV-${Date.now().toString(36).toUpperCase()}`,
      ngay: new Date(),
      noi_dung: String(noi_dung).trim(),
      ky_thuat_vien: String(ky_thuat_vien).trim(),
      chi_phi: Number(chi_phi || 0),
    };

    await warrantyCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { lich_su_bao_tri: ticket },
        $set: { updated_at: new Date() },
      }
    );

    return ticket;
  }
}

export default WarrantyDAO;
