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
 *
 * Phase 5 (2026-07-09): wrap mọi thao tác ghi kho trong MongoDB transaction
 * để đảm bảo all-or-nothing. Nếu MongoDB là standalone (không support txn),
 * fallback về compensation: revert lại NL đã trừ nếu step sau fail.
 */
export default class SanXuatService {
  static async injectDB(conn) {
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("SanXuatService.injectDB: missing SME_DB_NAME env var");
    const db = await conn.db(dbName);
    san_pham = db.collection("san_pham");
    nguyen_lieu = db.collection("nguyen_lieu");
    bom = db.collection("bom_san_pham");
    san_xuat_logs = db.collection("san_xuat_logs");
    await san_xuat_logs.createIndex({ created_at: -1 });
  }

  static _n(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }

  /**
   * Sản xuất sản phẩm.
   *
   * @param {{ san_pham_id, so_luong_sx, ghi_chu?, mongoClient? }} opts
   *        mongoClient được truyền vào từ controller để dùng transaction.
   *        Nếu null/undefined → fallback compensation (standalone MongoDB).
   */
  static async produce({ san_pham_id, so_luong_sx, ghi_chu = "", mongoClient = null }) {
    if (!san_pham_id) return { error: new Error("Thiếu san_pham_id") };
    const qty = Math.max(0, this._n(so_luong_sx, 0));
    if (qty <= 0) return { error: new Error("Số lượng sản xuất phải > 0") };

    const sp = await san_pham.findOne({ _id: new ObjectId(san_pham_id) });
    if (!sp) return { error: new Error("Không tìm thấy sản phẩm") };

    const b = await bom.findOne({ san_pham_id: new ObjectId(san_pham_id) });
    if (!b) return { error: new Error("Chưa có BOM cho sản phẩm") };

    // Tính nhu cầu NL tổng = định lượng * (1 + hao hụt) * qty
    const need = b.items.map((it) => ({
      nguyen_lieu_id: it.nguyen_lieu_id,
      qty_need: (Number(it.qty) * (1 + Number(it.waste_rate || 0))) * qty,
    }));

    // Kiểm tra đủ tồn
    const ids = need.map((n) => n.nguyen_lieu_id);
    const nls = await nguyen_lieu.find({ _id: { $in: ids }, trang_thai: { $ne: "deleted" } }).toArray();
    const map = new Map(nls.map((nl) => [nl._id.toString(), nl]));
    const lack = [];
    for (const n of need) {
      const nlKey = n.nguyen_lieu_id?.toString();
      const nlFound = map.get(nlKey);
      if (!nlFound || nlFound.so_luong < n.qty_need) {
        lack.push({ nguyen_lieu_id: n.nguyen_lieu_id, required: n.qty_need, available: nlFound?.so_luong ?? 0 });
      }
    }
    if (lack.length) return { error: new Error("Không đủ nguyên liệu"), lack };

    // Tính giá thành đơn vị hiện tại từ giá NL (trước khi ghi, để log dùng)
    let unitCost = 0;
    for (const it of b.items) {
      const nlKey = it.nguyen_lieu_id?.toString();
      const nlFound = map.get(nlKey);
      unitCost += (nlFound?.gia_nhap || 0) * (Number(it.qty) * (1 + Number(it.waste_rate || 0)));
    }
    const totalCost = unitCost * qty;

    /**
     * Inner write: thực hiện 3 bước ghi kho, có thể nhận session từ ngoài.
     * @returns {ok, unitCost, totalCost, logId} hoặc throw để rollback.
     */
    const performWrites = async (session) => {
      // Step 1: trừ tồn NL (filter so_luong>=qty_need chống race)
      const nlOps = need.map((n) => ({
        updateOne: {
          filter: { _id: n.nguyen_lieu_id, so_luong: { $gte: n.qty_need } },
          update: { $inc: { so_luong: -n.qty_need }, $set: { updateAt: new Date() } },
        },
      }));
      const nlResult = await nguyen_lieu.bulkWrite(nlOps, { ordered: true, session });
      // Nếu số doc đã update khác số op mong đợi → race condition, rollback
      if (nlResult.modifiedCount !== need.length) {
        throw new Error(`bulkWrite NL không đủ (modified=${nlResult.modifiedCount}, expected=${need.length})`);
      }

      // Step 2: cộng tồn thành phẩm
      await san_pham.updateOne(
        { _id: new ObjectId(san_pham_id) },
        { $inc: { so_luong: qty }, $set: { updateAt: new Date() } },
        { session }
      );

      // Step 3: ghi log lô sản xuất
      const log = {
        san_pham_id: new ObjectId(san_pham_id),
        so_luong_sx: qty,
        bom_snapshot: b.items,
        nguyen_lieu_used: need,
        unit_cost: unitCost,
        total_cost: totalCost,
        ghi_chu,
        created_at: new Date(),
      };
      const resLog = await san_xuat_logs.insertOne(log, { session });

      return { logId: resLog.insertedId };
    };

    // Path A: có mongoClient → dùng transaction (preferred)
    if (mongoClient?.startSession) {
      const session = mongoClient.startSession();
      try {
        let result;
        await session.withTransaction(async () => {
          result = await performWrites(session);
        });
        return { ok: true, unitCost, totalCost, logId: result.logId };
      } catch (e) {
        // MongoDB standalone không hỗ trợ transaction → fallback compensation
        if (!e?.message?.includes("Transaction numbers are only allowed")) throw e;
        // Fall through to compensation path below
      } finally {
        await session.endSession();
      }
    }

    // Path B: standalone MongoDB (no txn support) — dùng compensation
    // Ghi nhận các NL đã trừ, nếu step sau fail thì cộng lại.
    const deducted = [];
    try {
      // Step 1
      for (const n of need) {
        const result = await nguyen_lieu.updateOne(
          { _id: n.nguyen_lieu_id, so_luong: { $gte: n.qty_need } },
          { $inc: { so_luong: -n.qty_need }, $set: { updateAt: new Date() } }
        );
        if (result.modifiedCount !== 1) {
          throw new Error(`Trừ kho NL ${n.nguyen_lieu_id} thất bại (race)`);
        }
        deducted.push({ id: n.nguyen_lieu_id, qty: n.qty_need });
      }

      // Step 2
      await san_pham.updateOne(
        { _id: new ObjectId(san_pham_id) },
        { $inc: { so_luong: qty }, $set: { updateAt: new Date() } }
      );

      // Step 3
      const log = {
        san_pham_id: new ObjectId(san_pham_id),
        so_luong_sx: qty,
        bom_snapshot: b.items,
        nguyen_lieu_used: need,
        unit_cost: unitCost,
        total_cost: totalCost,
        ghi_chu,
        created_at: new Date(),
      };
      const resLog = await san_xuat_logs.insertOne(log);
      return { ok: true, unitCost, totalCost, logId: resLog.insertedId };
    } catch (err) {
      // Compensation: cộng lại NL đã trừ
      for (const d of deducted) {
        try {
          await nguyen_lieu.updateOne(
            { _id: d.id },
            { $inc: { so_luong: d.qty } }
          );
        } catch {
          // Bỏ qua lỗi compensation — đã log error gốc
        }
      }
      return { error: err };
    }
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
