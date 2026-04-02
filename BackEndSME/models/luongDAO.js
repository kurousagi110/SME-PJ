import { ObjectId } from "mongodb";

let luongCol;
let usersCol;

const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DELETED: "deleted",
};

export default class LuongDAO {
  static async injectDB(conn) {
    if (luongCol && usersCol) return;
    try {
      const db = conn.db(process.env.SME_DB_NAME || process.env.DB_NAME);
      luongCol = db.collection("luong");
      usersCol = db.collection("users");

      await luongCol.createIndex({ ma_nv: 1, ngay_thang: 1 }, { unique: true });
      await luongCol.createIndex({ user_id: 1, ngay_thang: 1 });
      await luongCol.createIndex({ trang_thai: 1 });
      await luongCol.createIndex({ ngay_thang: 1 }); // ✅ hỗ trợ query theo ngày
    } catch (e) {
      console.error(`Unable to establish collection handles in LuongDAO: ${e}`);
    }
  }

  static _n(v, def = 0) {
    const x = Number(v);
    return Number.isFinite(x) ? x : def;
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
    const diffMin = end - start;
    if (diffMin <= 0) return 0;
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
      console.error(`createOrUpdateChamCong error: ${e}`);
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
      console.error(`createOrUpdateChamCongBulk error: ${e}`);
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
      console.error(`getChamCongByDay error: ${e}`);
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
      console.error(`listChamCong error: ${e}`);
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
      console.error(`softDeleteChamCong error: ${e}`);
      return { error: e };
    }
  }

  // tinhLuongThang: aggregate chamcong theo tháng/năm, tính lương theo hệ số
  // Phase 2 fix: replaced missing dynamic import (_keep_tinhLuongThang.js) with inline implementation
  static async tinhLuongThang({ thang, nam, ma_nv } = {}) {
    try {
      const thangNum = Number(thang);
      const namNum = Number(nam);
      if (!Number.isInteger(thangNum) || thangNum < 1 || thangNum > 12) {
        return { error: new Error("thang không hợp lệ (1–12)") };
      }
      if (!Number.isInteger(namNum) || namNum < 2000) {
        return { error: new Error("nam không hợp lệ") };
      }

      const startDate = new Date(namNum, thangNum - 1, 1);
      const endDate   = new Date(namNum, thangNum, 1); // exclusive

      const filter = {
        trang_thai: { $ne: STATUS.DELETED },
        ngay_thang: { $gte: startDate, $lt: endDate },
      };
      if (ma_nv) filter.ma_nv = String(ma_nv);

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

      // Batch fetch employees (try ObjectId first, fallback ma_nv string)
      const maNVs = chamCongsRaw.map(r => r._id);
      const oids  = maNVs.map(id => { try { return new ObjectId(String(id)); } catch { return null; } }).filter(Boolean);
      const nhanVienDocs = await usersCol.find(
        { $or: [
          ...(oids.length ? [{ _id: { $in: oids } }] : []),
          { ma_nv: { $in: maNVs } },
        ] },
        { projection: { ho_ten: 1, chuc_vu: 1, phong_ban: 1, ma_nv: 1 } }
      ).toArray();

      const nvMap = new Map();
      for (const nv of nhanVienDocs) {
        nvMap.set(nv._id.toString(), nv);
        if (nv.ma_nv) nvMap.set(String(nv.ma_nv), nv);
      }

      const GIO_TIEU_CHUAN = 160; // 8h × 20 ngày công chuẩn/tháng
      const LUONG_CO_SO    = 1_000_000; // 1 triệu đồng/hệ số

      const items = chamCongsRaw.map(r => {
        const nv        = nvMap.get(r._id) || nvMap.get(String(r._id)) || {};
        const heSoluong = Math.max(0, Number(nv.chuc_vu?.heSoluong ?? 1)) || 1;
        const luong_co_ban    = Math.round(heSoluong * LUONG_CO_SO);
        const ty_le_lam_viec  = Math.min(1, r.tong_gio / GIO_TIEU_CHUAN);
        const luong_thuc_nhan = Math.round(luong_co_ban * ty_le_lam_viec);

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
          luong_thuc_nhan,
        };
      });

      return { ok: true, thang: thangNum, nam: namNum, items };
    } catch (e) {
      console.error(`tinhLuongThang error: ${e}`);
      return { error: e };
    }
  }
}
