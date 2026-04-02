import { ObjectId } from "mongodb";

let bom;         // collection: bom_san_pham
let san_pham;    // đọc sản phẩm
let nguyen_lieu; // đọc nguyên liệu (tham chiếu id)

export default class BomDAO {
  static async injectDB(conn) {
    if (bom && san_pham && nguyen_lieu) return;
    const db = await conn.db(process.env.DB_NAME);

    bom = db.collection("bom_san_pham");
    san_pham = db.collection("san_pham");
    nguyen_lieu = db.collection("nguyen_lieu");

    await bom.createIndex({ san_pham_id: 1 }, { unique: true });
    await bom.createIndex({ "items.nguyen_lieu_id": 1 });
  }

  /* ====================== Helpers ====================== */
  static _n(v, def = 0) {
    const x = Number(v);
    return Number.isFinite(x) ? x : def;
  }

  static _normalizeItems(items = []) {
    if (!Array.isArray(items)) return [];

    // normalize + lọc invalid
    let normalized = items
      .filter((it) => it && it.nguyen_lieu_id && Number(it.qty) > 0)
      .map((it) => ({
        nguyen_lieu_id: new ObjectId(it.nguyen_lieu_id),
        qty: this._n(it.qty, 0),
        unit: (it.unit || "").toString().trim(),
        waste_rate: Math.max(0, Math.min(1, this._n(it.waste_rate, 0))),
      }));

    // gộp trùng nguyên liệu (cộng qty, lấy waste_rate lớn nhất)
    const map = new Map();
    for (const it of normalized) {
      const key = it.nguyen_lieu_id.toString();
      if (!map.has(key)) {
        map.set(key, { ...it });
      } else {
        const cur = map.get(key);
        cur.qty += it.qty;
        cur.waste_rate = Math.max(cur.waste_rate || 0, it.waste_rate || 0);
        if (!cur.unit && it.unit) cur.unit = it.unit;
      }
    }
    normalized = Array.from(map.values());

    return normalized;
  }

  /* ====================== Set / Get BOM ====================== */
  // items: [{ nguyen_lieu_id, qty, unit, waste_rate? (0..1) }]
  static async setBOM(san_pham_id, items = [], { ghi_chu = "" } = {}) {
    try {
      if (!san_pham_id) return { error: new Error("Thiếu san_pham_id") };

      // đảm bảo sản phẩm tồn tại
      const sp = await san_pham.findOne({ _id: new ObjectId(san_pham_id), trang_thai: { $ne: "deleted" } });
      if (!sp) return { error: new Error("Không tìm thấy sản phẩm") };

      const normalized = this._normalizeItems(items);

      // (tuỳ chọn) check nguyên liệu có tồn tại
      if (normalized.length) {
        const ids = normalized.map((i) => i.nguyen_lieu_id);
        const count = await nguyen_lieu.countDocuments({ _id: { $in: ids }, trang_thai: { $ne: "deleted" } });
        if (count !== ids.length) return { error: new Error("Có nguyên liệu không tồn tại hoặc đã bị xóa") };
      }

      const res = await bom.updateOne(
        { san_pham_id: new ObjectId(san_pham_id) },
        {
          $set: {
            items: normalized,
            ghi_chu: (ghi_chu || "").toString(),
            updateAt: new Date(),
          },
          $setOnInsert: {
            san_pham_id: new ObjectId(san_pham_id),
            createAt: new Date(),
          },
        },
        { upsert: true }
      );

      return { upserted: res.upsertedCount === 1, modifiedCount: res.modifiedCount };
    } catch (e) {
      console.error(`setBOM error: ${e}`);
      return { error: e };
    }
  }

  static async getBOM(san_pham_id) {
    try {
      const doc = await bom.findOne({ san_pham_id: new ObjectId(san_pham_id) });
      return doc || { error: new Error("Chưa khai báo BOM cho sản phẩm") };
    } catch (e) {
      return { error: e };
    }
  }

  /* ====================== Costing ====================== */
  // Tính giá thành lý thuyết / 1 đơn vị sản phẩm (theo gia_nhap hiện tại của nguyên liệu)
  static async calcUnitCost(san_pham_id) {
    const b = await this.getBOM(san_pham_id);
    if (!b || b.error) return b;

    const ids = (b.items || []).map((i) => i.nguyen_lieu_id);
    const nlDocs = await nguyen_lieu.find({ _id: { $in: ids } }).toArray();
    const map = new Map(nlDocs.map((nl) => [nl._id.toString(), nl]));

    let cost = 0;
    for (const it of b.items || []) {
      const nl = map.get(it.nguyen_lieu_id.toString());
      if (!nl) continue;

      const qtyReal = Number(it.qty) * (1 + (Number(it.waste_rate) || 0));
      cost += (Number(nl.gia_nhap) || 0) * qtyReal;
    }

    return { unitCost: cost };
  }
}
