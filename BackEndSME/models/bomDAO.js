// Phase 3 update: setBOM accepts { session } for transaction support
//                 setBOM syncs san_pham.nguyen_lieu to keep PROD_RECEIPT logic consistent
// Phase 4 update: replaced console.error with logger
import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";

let bom;         // collection: bom_san_pham
let san_pham;    // đọc sản phẩm
let nguyen_lieu; // đọc nguyên liệu (tham chiếu id)

export default class BomDAO {
  static async injectDB(conn) {
    if (bom && san_pham && nguyen_lieu) return;
    const db = conn.db(process.env.SME_DB_NAME || process.env.DB_NAME);

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
  // Phase 3: accepts { session } for atomic execution inside a transaction.
  // Phase 3: after updating bom_san_pham, syncs san_pham.nguyen_lieu so that
  //          PROD_RECEIPT inventory logic (_bomFromSanPhamDoc) stays consistent.
  static async setBOM(san_pham_id, items = [], { ghi_chu = "", session } = {}) {
    try {
      if (!san_pham_id) return { error: new Error("Thiếu san_pham_id") };

      const spOid = new ObjectId(san_pham_id);

      // Ensure product exists (inside session if provided)
      const sp = await san_pham.findOne(
        { _id: spOid, trang_thai: { $ne: "deleted" } },
        { session }
      );
      if (!sp) return { error: new Error("Không tìm thấy sản phẩm") };

      const normalized = this._normalizeItems(items);

      // Validate + fetch nguyen_lieu docs in one $in query
      let nlDocs = [];
      if (normalized.length) {
        const ids = normalized.map((i) => i.nguyen_lieu_id);
        nlDocs = await nguyen_lieu
          .find({ _id: { $in: ids }, trang_thai: { $ne: "deleted" } }, { session })
          .toArray();
        if (nlDocs.length !== ids.length) {
          return { error: new Error("Có nguyên liệu không tồn tại hoặc đã bị xóa") };
        }
      }
      const nlMap = new Map(nlDocs.map((nl) => [nl._id.toString(), nl]));

      // 1) Update bom_san_pham collection
      const res = await bom.updateOne(
        { san_pham_id: spOid },
        {
          $set: {
            items: normalized,
            ghi_chu: (ghi_chu || "").toString(),
            updateAt: new Date(),
          },
          $setOnInsert: {
            san_pham_id: spOid,
            createAt: new Date(),
          },
        },
        { upsert: true, session }
      );

      // 2) Sync san_pham.nguyen_lieu so PROD_RECEIPT reads the updated BOM
      //    _bomFromSanPhamDoc() in donHangDAO reads from san_pham.nguyen_lieu
      const syncedNguyenLieu = normalized.map((it) => {
        const nl = nlMap.get(it.nguyen_lieu_id.toString()) || {};
        return {
          ma_nl:    nl.ma_nl    || "",
          ten:      nl.ten_nl   || nl.ten || "",
          ten_nl:   nl.ten_nl   || "",
          don_vi:   it.unit     || nl.don_vi || "",
          so_luong: it.qty,      // dinh_muc per unit of finished product
          dinh_muc: it.qty,
        };
      });

      await san_pham.updateOne(
        { _id: spOid },
        { $set: { nguyen_lieu: syncedNguyenLieu, updateAt: new Date() } },
        { session }
      );

      return { upserted: res.upsertedCount === 1, modifiedCount: res.modifiedCount };
    } catch (e) {
      logger.error(`bomDAO.setBOM error`, { error: e.message });
      return { error: e };
    }
  }

  static async getBOM(san_pham_id, { session } = {}) {
    try {
      const doc = await bom.findOne({ san_pham_id: new ObjectId(san_pham_id) }, { session });
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
