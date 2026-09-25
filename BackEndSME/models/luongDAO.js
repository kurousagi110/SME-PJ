import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import { sanitizeNumber } from "../utils/number.js";

let luongCol;
let usersCol;
let soQuyCol;
let bangLuongChotCol;

const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DELETED: "deleted",
};

export default class LuongDAO {
  static async injectDB(conn) {
    if (luongCol && usersCol && soQuyCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("LuongDAO.injectDB: missing SME_DB_NAME env var");
    try {
      const db = conn.db(dbName);
      luongCol = db.collection("luong");
      usersCol = db.collection("users");
      soQuyCol = db.collection("so_quy");
      bangLuongChotCol = db.collection("bang_luong_chot");

      await luongCol.createIndex({ ma_nv: 1, ngay_thang: 1 }, { unique: true });
      await luongCol.createIndex({ user_id: 1, ngay_thang: 1 });
      await luongCol.createIndex({ trang_thai: 1 });
      await luongCol.createIndex({ ngay_thang: 1 }); // ✅ hỗ trợ query theo ngày
      await bangLuongChotCol.createIndex({ ma_chung_tu: 1 }, { unique: true });
    } catch (e) {
      logger.error("Unable to establish collection handles in LuongDAO", { error: e.message });
    }
  }

  static _n(v, def = 0) {
    return sanitizeNumber(v, def);
  }

  // parse "YYYY-MM-DD" -> Date local 00:00
  static _parseDate(ngay_thang) {
    if (!ngay_thang || typeof ngay_thang !== "string") return null;
    const m = ngay_thang.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(y, mo - 1, d, 0, 0, 0, 0);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  // ✅ range của 1 ngày: [start, nextDay)
  static _dayRange(ngay_thang) {
    const start = this._parseDate(ngay_thang);
    if (!start) return null;
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  static _calcHours(gio_check_in, gio_check_out) {
    if (!gio_check_in || !gio_check_out) return 0;
    const [h1, m1] = String(gio_check_in).split(":").map(Number);
    const [h2, m2] = String(gio_check_out).split(":").map(Number);
    if (![h1, m1, h2, m2].every(Number.isFinite)) return 0;

    const start = h1 * 60 + m1;
    const end = h2 * 60 + m2;
    let diffMin = end - start;

    // Ca đêm qua ngày: vd check-in 22:00, check-out 06:00 (sáng hôm sau).
    // Tính theo phút trong ngày: 360 - 1320 = -960. Nếu chỉ check <= 0 thì trả 0 →
    // nhân viên ca đêm mất trắng lương. Wrap-around: cộng thêm 1 ngày (1440 phút).
    if (diffMin <= 0) diffMin += 1440;

    // Vẫn cap 24h để chặn input lỗi (vd check-in > check-out + nhiều ngày).
    if (diffMin > 1440) diffMin = 1440;

    return Math.round((diffMin / 60) * 100) / 100;
  }

  static _toObjectIdMaybe(v) {
    try {
      return new ObjectId(String(v));
    } catch {
      return null;
    }
  }

  static async createOrUpdateChamCong({ ma_nv, gio_check_in, gio_check_out, ngay_thang, so_gio_lam, ghi_chu }) {
    try {
      if (!ma_nv || !ngay_thang) return { error: new Error("Thiếu ma_nv hoặc ngay_thang") };

      const ngayDate = this._parseDate(ngay_thang);
      if (!ngayDate) return { error: new Error("ngay_thang không hợp lệ (cần dạng YYYY-MM-DD)") };

      const userId = this._toObjectIdMaybe(ma_nv);

      const gioLam =
        so_gio_lam !== undefined && so_gio_lam !== null
          ? this._n(so_gio_lam, 0)
          : this._calcHours(gio_check_in, gio_check_out);

      const di_tre = gio_check_in ? String(gio_check_in) > "08:00" : false;

      const doc = {
        ma_nv: String(ma_nv),
        user_id: userId,
        ngay_thang: ngayDate,
        gio_check_in: gio_check_in || null,
        gio_check_out: gio_check_out || null,
        di_tre,
        so_gio_lam: gioLam,
        ghi_chu: (ghi_chu || "").trim(),
        trang_thai: STATUS.ACTIVE,
        updated_at: new Date(),
      };

      const res = await luongCol.updateOne(
        { ma_nv: String(ma_nv), ngay_thang: ngayDate },
        { $set: doc, $setOnInsert: { created_at: new Date() } },
        { upsert: true }
      );

      return { upsertedId: res.upsertedId, matchedCount: res.matchedCount, modifiedCount: res.modifiedCount };
    } catch (e) {
      logger.error("createOrUpdateChamCong error", { error: e.message });
      return { error: e };
    }
  }

  static async createOrUpdateChamCongBulk({ ngay_thang, items }) {
    try {
      if (!ngay_thang) return { error: new Error("Thiếu ngay_thang") };
      if (!Array.isArray(items) || items.length === 0) return { error: new Error("Thiếu items (list chấm công)") };

      const ngayDate = this._parseDate(ngay_thang);
      if (!ngayDate) return { error: new Error("ngay_thang không hợp lệ (cần dạng YYYY-MM-DD)") };

      const ops = [];
      const errors = [];

      for (let i = 0; i < items.length; i++) {
        const row = items[i] || {};
        const ma_nv = row.ma_nv ?? row.user_id ?? row.users_id ?? row.nhan_vien_id;
        if (!ma_nv) {
          errors.push({ index: i, message: "Thiếu ma_nv", row });
          continue;
        }

        const gio_check_in = row.gio_check_in ?? null;
        const gio_check_out = row.gio_check_out ?? null;

        const gioLam =
          row.so_gio_lam !== undefined && row.so_gio_lam !== null
            ? this._n(row.so_gio_lam, 0)
            : this._calcHours(gio_check_in, gio_check_out);

        const di_tre = gio_check_in ? String(gio_check_in) > "08:00" : false;
        const userId = this._toObjectIdMaybe(ma_nv);

        const doc = {
          ma_nv: String(ma_nv),
          user_id: userId,
          ngay_thang: ngayDate,
          gio_check_in,
          gio_check_out,
          di_tre,
          so_gio_lam: gioLam,
          ghi_chu: String(row.ghi_chu ?? "").trim(),
          trang_thai: STATUS.ACTIVE,
          updated_at: new Date(),
        };

        ops.push({
          updateOne: {
            filter: { ma_nv: String(ma_nv), ngay_thang: ngayDate },
            update: { $set: doc, $setOnInsert: { created_at: new Date() } },
            upsert: true,
          },
        });
      }

      if (ops.length === 0) return { error: new Error("Không có dòng hợp lệ để lưu"), errors };

      const res = await luongCol.bulkWrite(ops, { ordered: false });

      return {
        ok: true,
        matchedCount: res.matchedCount,
        modifiedCount: res.modifiedCount,
        upsertedCount: res.upsertedCount,
        upsertedIds: res.upsertedIds,
        errors,
      };
    } catch (e) {
      logger.error("createOrUpdateChamCongBulk error", { error: e.message });
      return { error: e };
    }
  }

  static async getChamCongByDay({ ma_nv, ngay_thang }) {
    try {
      const range = this._dayRange(ngay_thang);
      if (!ma_nv || !range) return { error: new Error("Thiếu ma_nv hoặc ngay_thang") };

      const doc = await luongCol.findOne({
        ma_nv: String(ma_nv),
        trang_thai: { $ne: STATUS.DELETED },
        ngay_thang: { $gte: range.start, $lt: range.end },
      });

      if (!doc) return { error: new Error("Không tìm thấy chấm công") };
      return doc;
    } catch (e) {
      logger.error("getChamCongByDay error", { error: e.message });
      return { error: e };
    }
  }

  /**
   * ✅ listChamCong:
   * - ngay_thang => list tất cả NV của ngày đó
   * - ma_nv + ngay_thang => 1 bản ghi (vẫn trả items:[...] để FE thống nhất)
   * - from/to => list theo khoảng
   */
  static async listChamCong({ ma_nv, ngay_thang, from, to, page = 1, limit = 50 } = {}) {
    try {
      const filter = { trang_thai: { $ne: STATUS.DELETED } };

      if (ma_nv) filter.ma_nv = String(ma_nv);

      if (ngay_thang) {
        const range = this._dayRange(String(ngay_thang));
        if (!range) return { error: new Error("ngay_thang không hợp lệ (YYYY-MM-DD)") };
        filter.ngay_thang = { $gte: range.start, $lt: range.end };
      } else if (from || to) {
        filter.ngay_thang = {};
        if (from) {
          const r = this._dayRange(String(from));
          if (!r) return { error: new Error("from không hợp lệ (YYYY-MM-DD)") };
          filter.ngay_thang.$gte = r.start;
        }
        if (to) {
          const r = this._dayRange(String(to));
          if (!r) return { error: new Error("to không hợp lệ (YYYY-MM-DD)") };
          // to inclusive ngày đó => < nextDay
          filter.ngay_thang.$lt = r.end;
        }
      }

      const skip = Math.max(0, (Number(page) - 1) * Number(limit));

      const [items, total] = await Promise.all([
        luongCol.find(filter).sort({ ngay_thang: 1 }).skip(skip).limit(Number(limit)).toArray(),
        luongCol.countDocuments(filter),
      ]);

      return {
        items,
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      };
    } catch (e) {
      logger.error("listChamCong error", { error: e.message });
      return { error: e };
    }
  }

  static async softDeleteChamCong(id) {
    try {
      const res = await luongCol.updateOne(
        { _id: new ObjectId(id) },
        { $set: { trang_thai: STATUS.DELETED, updated_at: new Date() } }
      );
      return { modifiedCount: res.modifiedCount };
    } catch (e) {
      logger.error("softDeleteChamCong error", { error: e.message });
      return { error: e };
    }
  }

  // tinhLuongThang: aggregate chamcong theo tháng/năm, tính lương theo hệ số
  // Phase 2 fix: replaced missing dynamic import (_keep_tinhLuongThang.js) with inline implementation
  // Phase 4 fix: honor don_gia_gio / thuong / phat / ghi_chu (were silently dropped before)
  static async tinhLuongThang({
    thang, nam, ma_nv,
    don_gia_gio = null, thuong = 0, phat = 0, ghi_chu = null,
  } = {}) {
    try {
      const thangNum = Number(thang);
      const namNum = Number(nam);
      if (!Number.isInteger(thangNum) || thangNum < 1 || thangNum > 12) {
        return { error: new Error("thang không hợp lệ (1–12)") };
      }
      if (!Number.isInteger(namNum) || namNum < 2000) {
        return { error: new Error("nam không hợp lệ") };
      }

      // Coerce adjustment fields. thuong / phat are additive cash amounts;
      // don_gia_gio (if provided) OVERRIDES the standard heSo * LUONG_CO_SO base.
      const thuongNum  = Number.isFinite(Number(thuong)) ? Number(thuong) : 0;
      const phatNum    = Number.isFinite(Number(phat))   ? Number(phat)   : 0;
      const donGiaGioNum = (don_gia_gio !== null && don_gia_gio !== undefined && Number.isFinite(Number(don_gia_gio)))
        ? Number(don_gia_gio)
        : null;

      const startDate = new Date(namNum, thangNum - 1, 1);
      const endDate   = new Date(namNum, thangNum, 1); // exclusive

      const filter = {
        trang_thai: { $ne: STATUS.DELETED },
        ngay_thang: { $gte: startDate, $lt: endDate },
      };
      if (ma_nv && ma_nv !== "ALL") filter.ma_nv = String(ma_nv);

      // Aggregate chamcong by ma_nv
      const chamCongsRaw = await luongCol.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$ma_nv",
            tong_gio: { $sum: "$so_gio_lam" },
            so_ngay:  { $sum: 1 },
            so_ngay_di_tre: { $sum: { $cond: ["$di_tre", 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]).toArray();

      if (!chamCongsRaw.length) return { ok: true, thang: thangNum, nam: namNum, items: [] };

      // Batch fetch employees (try ObjectId first, fallback ma_nv / tai_khoan string)
      const maNVs = chamCongsRaw.map(r => r._id);
      const oids  = maNVs.map(id => { try { return new ObjectId(String(id)); } catch { return null; } }).filter(Boolean);
      const nhanVienDocs = await usersCol.find(
        { $or: [
          ...(oids.length ? [{ _id: { $in: oids } }] : []),
          { ma_nv: { $in: maNVs } },
          { tai_khoan: { $in: maNVs } },
        ] },
        { projection: { ho_ten: 1, chuc_vu: 1, phong_ban: 1, ma_nv: 1, tai_khoan: 1 } }
      ).toArray();

      const nvMap = new Map();
      for (const nv of nhanVienDocs) {
        nvMap.set(nv._id.toString(), nv);
        if (nv.ma_nv) nvMap.set(String(nv.ma_nv), nv);
        if (nv.tai_khoan) nvMap.set(String(nv.tai_khoan), nv);
      }

      const GIO_TIEU_CHUAN = 160; // 8h × 20 ngày công chuẩn/tháng
      const LUONG_CO_SO    = 1_000_000; // 1 triệu đồng/hệ số

      const items = chamCongsRaw.map(r => {
        const nv        = nvMap.get(r._id) || nvMap.get(String(r._id)) || {};
        const heSoluong = Math.max(0, Number(nv.chuc_vu?.heSoluong ?? 1)) || 1;
        const luong_co_ban    = Math.round(heSoluong * LUONG_CO_SO);
        const ty_le_lam_viec  = Math.min(1, r.tong_gio / GIO_TIEU_CHUAN);

        // don_gia_gio (nếu được truyền) override lương theo giờ; ngược lại dùng lương cơ bản.
        let luong_thuc_nhan;
        if (donGiaGioNum !== null) {
          // Nhân với tỷ lệ làm việc để giữ nhất quán với công thức cũ.
          luong_thuc_nhan = Math.round(donGiaGioNum * r.tong_gio);
        } else {
          luong_thuc_nhan = Math.round(luong_co_ban * ty_le_lam_viec);
        }

        // Cộng/trừ thưởng phạt (có thể âm/dương). Không cap dưới 0 vì phạt có thể lớn.
        luong_thuc_nhan = luong_thuc_nhan + thuongNum - phatNum;

        return {
          ma_nv:         r._id,
          ho_ten:        nv.ho_ten        || null,
          phong_ban:     nv.phong_ban?.ten || null,
          chuc_vu:       nv.chuc_vu?.ten  || null,
          thang:         thangNum,
          nam:           namNum,
          so_ngay_cong:  r.so_ngay,
          tong_gio_lam:  r.tong_gio,
          so_ngay_di_tre: r.so_ngay_di_tre,
          he_so_luong:   heSoluong,
          luong_co_ban,
          don_gia_gio_override: donGiaGioNum,
          thuong: thuongNum,
          phat:   phatNum,
          ghi_chu,
          luong_thuc_nhan,
        };
      });

      return { ok: true, thang: thangNum, nam: namNum, items };
    } catch (e) {
      logger.error("tinhLuongThang error", { error: e.message });
      return { error: e };
    }
  }

  /**
   * CLOSED-LOOP: Duyệt & chi trả lương tháng tự động tạo Phiếu Chi trong Sổ Quỹ
   */
  static async chiTraLuongThang({ thang, nam, phuong_thuc = "chuyen_khoan", ghi_chu = "", user = {} }) {
    try {
      const thangNum = Number(thang);
      const namNum = Number(nam);
      if (!thangNum || !namNum) throw new Error("Thiếu thang hoặc nam");

      // 1. Tính toán bảng lương tháng
      const payroll = await this.tinhLuongThang({ thang: thangNum, nam: namNum });
      if (payroll.error) throw payroll.error;

      const items = payroll.items || [];
      if (items.length === 0) {
        throw new Error(`Không có dữ liệu chấm công / lương để chi trả cho tháng ${thangNum}/${namNum}`);
      }

      const tongThucLinh = items.reduce((s, it) => s + (Number(it.luong_thuc_nhan) || 0), 0);
      if (tongThucLinh <= 0) {
        throw new Error("Tổng quỹ lương chi trả phải > 0");
      }

      const ma_chung_tu = `BL-${namNum}-${String(thangNum).padStart(2, "0")}`;

      // 2. Kiểm tra xem đã có phiếu chi lương cho tháng này chưa
      const existedVoucher = await soQuyCol.findOne({
        ma_chung_tu,
        hang_muc: "chi_luong_nhan_vien",
        trang_thai: "active",
      });
      if (existedVoucher) {
        throw new Error(`Lương tháng ${thangNum}/${namNum} đã được chi trả trước đó (Mã phiếu: ${existedVoucher.ma_phieu})`);
      }

      // 3. Tạo Phiếu Chi trong sổ quỹ
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const randCode = Math.random().toString(36).slice(2, 6).toUpperCase();
      const ma_phieu = `PC-${ymd}-${randCode}`;

      const voucherDoc = {
        ma_phieu,
        loai_phieu: "chi",
        hang_muc: "chi_luong_nhan_vien",
        so_tien: tongThucLinh,
        phuong_thuc: phuong_thuc === "tien_mat" ? "tien_mat" : "chuyen_khoan",
        doi_tuong: {
          loai: "nhan_vien",
          ten: "Toàn thể nhân sự công ty",
          so_dien_thoai: "",
          dia_chi: "",
        },
        ma_chung_tu,
        ngay_ghi_nhan: d,
        ghi_chu: ghi_chu || `Chi trả lương tháng ${thangNum}/${namNum} (${items.length} nhân sự)`,
        nguoi_lap: {
          tai_khoan: user.tai_khoan || "admin",
          ten: user.ho_ten || "Ban Giám Đốc",
        },
        trang_thai: "active",
        created_at: d,
        updated_at: d,
      };

      await soQuyCol.insertOne(voucherDoc);

      // 4. Lưu log chốt lương
      await bangLuongChotCol.updateOne(
        { ma_chung_tu },
        {
          $set: {
            ma_chung_tu,
            thang: thangNum,
            nam: namNum,
            tong_nhan_su: items.length,
            tong_thuc_linh: tongThucLinh,
            ma_phieu_chi: ma_phieu,
            phuong_thuc,
            da_chi_tra: true,
            ngay_chi_tra: d,
            nguoi_duyet: user.ho_ten || user.tai_khoan || "Admin",
            updated_at: d,
          },
        },
        { upsert: true }
      );

      logger.info(`[LuongDAO] Đã chi trả lương tháng ${thangNum}/${namNum}: ${tongThucLinh} đ (Phiếu: ${ma_phieu})`);

      return {
        ok: true,
        message: `Đã duyệt và chi trả lương tháng ${thangNum}/${namNum} thành công`,
        ma_chung_tu,
        ma_phieu,
        tong_thuc_linh: tongThucLinh,
        tong_nhan_su: items.length,
        phieu_chi: voucherDoc,
      };
    } catch (e) {
      logger.error("chiTraLuongThang error", { error: e.message });
      return { error: e };
    }
  }

  static async kiemTraTrangThaiChiLuong(thang, nam) {
    if (!soQuyCol) return { da_chi: false, da_chi_tra: false };
    const ma_chung_tu = `BL-${Number(nam)}-${String(Number(thang)).padStart(2, "0")}`;
    const voucher = await soQuyCol.findOne({
      ma_chung_tu,
      hang_muc: "chi_luong_nhan_vien",
      trang_thai: "active",
    });
    return {
      da_chi: !!voucher,
      da_chi_tra: !!voucher,
      ma_phieu: voucher?.ma_phieu || null,
      ngay_chi_tra: voucher?.ngay_ghi_nhan || null,
      so_tien: voucher?.so_tien || null,
    };
  }
}
