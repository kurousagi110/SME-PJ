import { ObjectId } from "mongodb";

let san_pham;
let nguyen_lieu;
let bom;
let san_xuat_logs;

/**
 * Service sản xuất: dùng BOM
 * - Kiểm tra đủ tồn nguyên liệu
 * - Trừ tồn nguyên liệu theo định lượng (kèm hao hụt)
 * - Cộng tồn thành phẩm theo số lượng sản xuất
 * - Tính giá thành /1sp theo NL hiện tại, lưu vào log
 */
export default class SanXuatService {
  static async injectDB(conn) {
    const db = await conn.db(process.env.DB_NAME);
    san_pham = db.collection("san_pham");
    nguyen_lieu = db.collection("nguyen_lieu");
    bom = db.collection("bom_san_pham");
    san_xuat_logs = db.collection("san_xuat_logs");
    await san_xuat_logs.createIndex({ created_at: -1 });
  }

  static _n(v, d=0){ const n=Number(v); return Number.isFinite(n)?n:d; }

  static async produce({ san_pham_id, so_luong_sx, ghi_chu = "" }) {
    if (!san_pham_id) return { error: new Error("Thiếu san_pham_id") };
    const qty = Math.max(0, this._n(so_luong_sx, 0));
    if (qty <= 0) return { error: new Error("Số lượng sản xuất phải > 0") };

    const sp = await san_pham.findOne({ _id: new ObjectId(san_pham_id) });
    if (!sp) return { error: new Error("Không tìm thấy sản phẩm") };

    const b = await bom.findOne({ san_pham_id: new ObjectId(san_pham_id) });
    if (!b) return { error: new Error("Chưa có BOM cho sản phẩm") };

    // Tính nhu cầu NL tổng = định lượng * (1 + hao hụt) * qty
    const need = b.items.map(it => ({
      nguyen_lieu_id: it.nguyen_lieu_id,
      qty_need: (Number(it.qty) * (1 + Number(it.waste_rate || 0))) * qty,
    }));

    // Kiểm tra đủ tồn
    const ids = need.map(n => n.nguyen_lieu_id);
    const nls = await nguyen_lieu.find({ _id: { $in: ids }, trang_thai: { $ne: "deleted" } }).toArray();
    const map = new Map(nls.map(nl => [nl._id.toString(), nl]));
    const lack = [];
    for (const n of need) {
      const nl = map.get(n.nguyen_lieu_id.toString());
      if (!nl || nl.so_luong < n.qty_need) {
        lack.push({ nguyen_lieu_id: n.nguyen_lieu_id, required: n.qty_need, available: nl?.so_luong ?? 0 });
      }
    }
    if (lack.length) return { error: new Error("Không đủ nguyên liệu"), lack };

    // Trừ tồn NL
    const nlOps = need.map(n => ({
      updateOne: {
        filter: { _id: n.nguyen_lieu_id, so_luong: { $gte: n.qty_need } },
        update: { $inc: { so_luong: -n.qty_need }, $set: { updateAt: new Date() } },
      },
    }));
    await nguyen_lieu.bulkWrite(nlOps, { ordered: true });

    // Tính giá thành đơn vị hiện tại từ giá NL
    let unitCost = 0;
    for (const it of b.items) {
      const nl = map.get(it.nguyen_lieu_id.toString());
      unitCost += (nl.gia_nhap || 0) * (Number(it.qty) * (1 + Number(it.waste_rate || 0)));
    }

    // Cộng tồn thành phẩm
    await san_pham.updateOne(
      { _id: new ObjectId(san_pham_id) },
      { $inc: { so_luong: qty }, $set: { updateAt: new Date() } }
    );

    // Ghi log lô sản xuất
    const log = {
      san_pham_id: new ObjectId(san_pham_id),
      so_luong_sx: qty,
      bom_snapshot: b.items,
      nguyen_lieu_used: need,
      unit_cost: unitCost,
      total_cost: unitCost * qty,
      ghi_chu,
      created_at: new Date(),
    };
    const resLog = await san_xuat_logs.insertOne(log);

    return { ok: true, unitCost, totalCost: unitCost * qty, logId: resLog.insertedId };
  }

  static async getLogs({ san_pham_id, page = 1, limit = 20 } = {}) {
    const filter = {};
    if (san_pham_id) filter.san_pham_id = new ObjectId(san_pham_id);
    const skip = Math.max(0, (Number(page) - 1) * Number(limit));
    const [items, total] = await Promise.all([
      san_xuat_logs.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray(),
      san_xuat_logs.countDocuments(filter),
    ]);
    return { items, page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) || 1 };
  }
}
