/**
 * WarehouseDAO — Quản lý Đa Kho, Vị Trí Kệ (Bin Location) & Phiếu Điều Chuyển Kho Nội Bộ.
 * Đảm bảo tương thích ngược 100% với trường tổng tồn `san_pham.so_luong` và `nguyen_lieu.so_luong`.
 */

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import { escapeSafeRegexPattern } from "../utils/securityHelpers.js";
import {
  DEFAULT_WAREHOUSES,
  TRANSFER_STATUS,
  canTransitionTransfer,
  validateTransferDraft,
  computeTransferReceiptDelta,
} from "../utils/warehouseTransferEngine.js";

let warehousesCol = null;
let stocksCol = null;
let transfersCol = null;
let sanPhamCol = null;
let nguyenLieuCol = null;

function genTransferCode() {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `CK-${ymd}-${rand}`;
}

export default class WarehouseDAO {
  static async injectDB(conn) {
    if (warehousesCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("WarehouseDAO.injectDB: missing SME_DB_NAME env var");
    const db = conn.db(dbName);

    warehousesCol = db.collection("warehouses");
    stocksCol = db.collection("warehouse_stocks");
    transfersCol = db.collection("stock_transfers");
    sanPhamCol = db.collection("san_pham");
    nguyenLieuCol = db.collection("nguyen_lieu");

    try {
      await warehousesCol.createIndex({ code: 1 }, { unique: true });
      await stocksCol.createIndex({ warehouse_code: 1, item_type: 1, item_id: 1 }, { unique: true });
      await stocksCol.createIndex({ bin_location: 1 });
      await transfersCol.createIndex({ ma_phieu: 1 }, { unique: true });
      await transfersCol.createIndex({ trang_thai: 1, created_at: -1 });

      const count = await warehousesCol.countDocuments();
      if (count === 0) {
        const now = new Date();
        await warehousesCol.insertMany(
          DEFAULT_WAREHOUSES.map((w) => ({ ...w, created_at: now, updated_at: now }))
        );
      }
    } catch (err) {
      logger.warn("WarehouseDAO init warning", { error: err.message });
    }
  }

  /* ═══════════════════════ 1. DANH MỤC KHO ═══════════════════════ */

  static async listWarehouses({ includeInactive = false } = {}) {
    try {
      const filter = includeInactive ? {} : { is_active: { $ne: false } };
      const warehouses = await warehousesCol.find(filter).sort({ created_at: 1 }).toArray();

      // Thống kê nhanh số SKU & tổng tồn theo từng kho
      const agg = await stocksCol
        .aggregate([
          {
            $group: {
              _id: "$warehouse_code",
              sku_count: { $sum: 1 },
              total_qty: { $sum: "$so_luong" },
              low_stock_count: {
                $sum: {
                  $cond: [{ $and: [{ $gt: ["$min_stock", 0] }, { $lte: ["$so_luong", "$min_stock"] }] }, 1, 0],
                },
              },
            },
          },
        ])
        .toArray();
      const statMap = new Map(agg.map((a) => [a._id, a]));

      return warehouses.map((w) => {
        const st = statMap.get(w.code) || { sku_count: 0, total_qty: 0, low_stock_count: 0 };
        return {
          ...w,
          sku_count: st.sku_count,
          total_qty: st.total_qty,
          low_stock_count: st.low_stock_count,
        };
      });
    } catch (err) {
      logger.error("WarehouseDAO.listWarehouses error", { error: err.message });
      return [];
    }
  }

  static async createWarehouse(payload = {}, user = null) {
    try {
      const code = String(payload.code || "").trim().toUpperCase();
      const name = String(payload.name || "").trim();
      if (!code || !name) return { error: new Error("Thiếu mã kho (code) hoặc tên kho (name)") };

      const exists = await warehousesCol.findOne({ code });
      if (exists) return { error: new Error(`Mã kho "${code}" đã tồn tại`) };

      const now = new Date();
      const doc = {
        code,
        name,
        type: payload.type || "general",
        address: String(payload.address || "").trim(),
        manager_name: String(payload.manager_name || "").trim(),
        is_active: payload.is_active !== false,
        created_by: user ? { user_id: String(user._id || ""), ho_ten: user.ho_ten || user.tai_khoan } : null,
        created_at: now,
        updated_at: now,
      };
      const res = await warehousesCol.insertOne(doc);
      return { ok: true, doc: { ...doc, _id: res.insertedId } };
    } catch (err) {
      logger.error("WarehouseDAO.createWarehouse error", { error: err.message });
      return { error: err };
    }
  }

  static async updateWarehouse(id, patch = {}) {
    try {
      if (!ObjectId.isValid(id)) return { error: new Error("ID kho không hợp lệ") };
      const updateFields = { updated_at: new Date() };
      for (const k of ["name", "type", "address", "manager_name", "is_active"]) {
        if (patch[k] !== undefined) updateFields[k] = patch[k];
      }
      const updated = await warehousesCol.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateFields },
        { returnDocument: "after" }
      );
      if (!updated) return { error: new Error("Không tìm thấy kho") };
      return { ok: true, doc: updated };
    } catch (err) {
      logger.error("WarehouseDAO.updateWarehouse error", { error: err.message });
      return { error: err };
    }
  }

  /* ═══════════════════════ 2. TỒN KHO THEO KHO & BIN LOCATION ═══════════════════════ */

  /**
   * Đồng bộ khởi tạo phân bổ tồn kho từ danh mục san_pham (vào KHO-TONG) & nguyen_lieu (vào KHO-XUONG)
   * cho những mặt hàng chưa có bản ghi trong `warehouse_stocks`.
   */
  static async syncInitialStocks() {
    try {
      const [products, materials, existing] = await Promise.all([
        sanPhamCol.find({ trang_thai: { $ne: "deleted" } }).toArray(),
        nguyenLieuCol.find({ trang_thai: { $ne: "deleted" } }).toArray(),
        stocksCol.find({}, { projection: { item_type: 1, item_id: 1 } }).toArray(),
      ]);

      const existingSet = new Set(existing.map((e) => `${e.item_type}:${String(e.item_id)}`));
      const ops = [];
      const now = new Date();

      for (const p of products) {
        const key = `san_pham:${String(p._id)}`;
        if (existingSet.has(key)) continue;
        ops.push({
          updateOne: {
            filter: { warehouse_code: "KHO-TONG", item_type: "san_pham", item_id: String(p._id) },
            update: {
              $setOnInsert: {
                warehouse_code: "KHO-TONG",
                item_type: "san_pham",
                item_id: String(p._id),
                item_code: p.ma_sp || "",
                item_name: p.ten_sp || "",
                unit: p.don_vi || "cái",
                so_luong: Math.max(0, Number(p.so_luong || 0)),
                bin_location: "A1-01",
                min_stock: Number(p.ton_toi_thieu || 5),
                created_at: now,
                updated_at: now,
              },
            },
            upsert: true,
          },
        });
      }

      for (const m of materials) {
        const key = `nguyen_lieu:${String(m._id)}`;
        if (existingSet.has(key)) continue;
        ops.push({
          updateOne: {
            filter: { warehouse_code: "KHO-XUONG", item_type: "nguyen_lieu", item_id: String(m._id) },
            update: {
              $setOnInsert: {
                warehouse_code: "KHO-XUONG",
                item_type: "nguyen_lieu",
                item_id: String(m._id),
                item_code: m.ma_nl || m.ma_nguyen_lieu || "",
                item_name: m.ten_nl || m.ten || "",
                unit: m.don_vi || "cái",
                so_luong: Math.max(0, Number(m.so_luong || 0)),
                bin_location: "B1-01",
                min_stock: Number(m.ton_toi_thieu || 10),
                created_at: now,
                updated_at: now,
              },
            },
            upsert: true,
          },
        });
      }

      if (ops.length > 0) {
        await stocksCol.bulkWrite(ops, { ordered: false });
      }
      return { ok: true, syncedCount: ops.length };
    } catch (err) {
      logger.error("WarehouseDAO.syncInitialStocks error", { error: err.message });
      return { error: err };
    }
  }

  static async listStocks({ warehouseCode = "", itemType = "", q = "", limit = 100 } = {}) {
    try {
      // Tự đồng bộ lần đầu nếu collection warehouse_stocks đang rỗng
      const totalDocs = await stocksCol.countDocuments();
      if (totalDocs === 0) {
        await this.syncInitialStocks();
      }

      const filter = {};
      if (warehouseCode) filter.warehouse_code = String(warehouseCode).trim().toUpperCase();
      if (itemType) filter.item_type = itemType;
      if (q && String(q).trim()) {
        const rx = new RegExp(escapeSafeRegexPattern(String(q).trim()), "i");
        filter.$or = [{ item_code: rx }, { item_name: rx }, { bin_location: rx }];
      }

      const items = await stocksCol
        .find(filter)
        .sort({ warehouse_code: 1, bin_location: 1, item_code: 1 })
        .limit(Number(limit) || 100)
        .toArray();
      return { items, total: items.length };
    } catch (err) {
      logger.error("WarehouseDAO.listStocks error", { error: err.message });
      return { error: err };
    }
  }

  static async updateStockBin({ warehouseCode, itemType, itemId, binLocation = "", minStock }) {
    try {
      const code = String(warehouseCode || "").trim().toUpperCase();
      if (!code || !itemId) return { error: new Error("Thiếu warehouseCode hoặc itemId") };

      const updateFields = {
        bin_location: String(binLocation || "").trim().toUpperCase(),
        updated_at: new Date(),
      };
      if (minStock !== undefined && minStock !== null) {
        updateFields.min_stock = Math.max(0, Number(minStock) || 0);
      }

      const updated = await stocksCol.findOneAndUpdate(
        { warehouse_code: code, item_type: itemType || "san_pham", item_id: String(itemId) },
        { $set: updateFields },
        { returnDocument: "after" }
      );
      if (!updated) return { error: new Error("Không tìm thấy bản ghi tồn kho tại kho này") };
      return { ok: true, doc: updated };
    } catch (err) {
      logger.error("WarehouseDAO.updateStockBin error", { error: err.message });
      return { error: err };
    }
  }

  /* ═══════════════════════ 3. ĐIỀU CHUYỂN KHO NỘI BỘ ═══════════════════════ */

  static async createTransfer({ fromWarehouse, toWarehouse, items = [], note = "", user = null }) {
    try {
      const fromCode = String(fromWarehouse || "").trim().toUpperCase();
      const toCode = String(toWarehouse || "").trim().toUpperCase();

      const sourceRows = await stocksCol.find({ warehouse_code: fromCode }).toArray();
      const stockMap = new Map(sourceRows.map((r) => [`${r.item_type}:${String(r.item_id)}`, Number(r.so_luong || 0)]));

      const validation = validateTransferDraft({
        fromWarehouse: fromCode,
        toWarehouse: toCode,
        items,
        sourceStockMap: stockMap,
      });
      if (!validation.valid) {
        return { error: new Error(validation.message), shortages: validation.shortages };
      }

      const now = new Date();
      const doc = {
        ma_phieu: genTransferCode(),
        from_warehouse: validation.from_warehouse,
        to_warehouse: validation.to_warehouse,
        items: validation.items,
        trang_thai: TRANSFER_STATUS.DRAFT,
        ghi_chu: String(note || "").trim(),
        created_by: user ? { user_id: String(user._id || ""), ho_ten: user.ho_ten || user.tai_khoan } : null,
        dispatched_at: null,
        received_at: null,
        created_at: now,
        updated_at: now,
      };
      const res = await transfersCol.insertOne(doc);
      return { ok: true, doc: { ...doc, _id: res.insertedId } };
    } catch (err) {
      logger.error("WarehouseDAO.createTransfer error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Xuất chuyển kho (draft → in_transit): trừ tồn kho nguồn & ghi thẻ kho.
   */
  static async dispatchTransfer(transferId, user = null) {
    try {
      if (!ObjectId.isValid(transferId)) return { error: new Error("ID phiếu chuyển kho không hợp lệ") };
      const transfer = await transfersCol.findOne({ _id: new ObjectId(transferId) });
      if (!transfer) return { error: new Error("Không tìm thấy phiếu chuyển kho") };
      if (!canTransitionTransfer(transfer.trang_thai, TRANSFER_STATUS.IN_TRANSIT)) {
        return { error: new Error(`Không thể xuất chuyển phiếu ở trạng thái "${transfer.trang_thai}"`) };
      }

      // Trừ tồn kho nguồn có bảo vệ compensation rollback nếu bất kỳ dòng nào không đủ tồn hoặc race condition
      const deductedItems = [];
      const rollbackDeducted = async () => {
        for (const d of deductedItems) {
          try {
            await stocksCol.updateOne(
              {
                warehouse_code: transfer.from_warehouse,
                item_type: d.item_type,
                item_id: String(d.item_id),
              },
              { $inc: { so_luong: d.quantity }, $set: { updated_at: new Date() } }
            );
          } catch (rbErr) {
            logger.error("WarehouseDAO.dispatchTransfer rollback failed", { error: rbErr.message, item: d });
          }
        }
      };

      for (const it of transfer.items) {
        const resDec = await stocksCol.updateOne(
          {
            warehouse_code: transfer.from_warehouse,
            item_type: it.item_type,
            item_id: String(it.item_id),
            so_luong: { $gte: it.quantity },
          },
          { $inc: { so_luong: -it.quantity }, $set: { updated_at: new Date() } }
        );
        if (resDec.modifiedCount === 0) {
          await rollbackDeducted();
          return { error: new Error(`Kho ${transfer.from_warehouse} không đủ tồn cho ${it.item_name || it.item_code}`) };
        }
        deductedItems.push(it);
      }

      const now = new Date();
      const updated = await transfersCol.findOneAndUpdate(
        { _id: transfer._id, trang_thai: TRANSFER_STATUS.DRAFT },
        {
          $set: {
            trang_thai: TRANSFER_STATUS.IN_TRANSIT,
            dispatched_at: now,
            dispatched_by: user ? { user_id: String(user._id || ""), ho_ten: user.ho_ten || user.tai_khoan } : null,
            updated_at: now,
          },
        },
        { returnDocument: "after" }
      );
      if (!updated) {
        await rollbackDeducted();
        return { error: new Error("Phiếu chuyển kho đã thay đổi trạng thái bởi phiên khác, đã hoàn tồn kho nguồn") };
      }

      return { ok: true, doc: updated };
    } catch (err) {
      logger.error("WarehouseDAO.dispatchTransfer error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Xác nhận nhập kho đích (in_transit → received): cộng tồn kho đích & xử lý hao hụt vận chuyển (nếu có).
   */
  static async receiveTransfer(transferId, { receivedItems = [], note = "", user = null } = {}) {
    try {
      if (!ObjectId.isValid(transferId)) return { error: new Error("ID phiếu chuyển kho không hợp lệ") };
      const transfer = await transfersCol.findOne({ _id: new ObjectId(transferId) });
      if (!transfer) return { error: new Error("Không tìm thấy phiếu chuyển kho") };
      if (!canTransitionTransfer(transfer.trang_thai, TRANSFER_STATUS.RECEIVED)) {
        return { error: new Error(`Không thể nhập kho phiếu ở trạng thái "${transfer.trang_thai}"`) };
      }

      const delta = computeTransferReceiptDelta(transfer.items, receivedItems);
      const now = new Date();

      for (const line of delta.lines) {
        if (line.received_qty > 0) {
          await stocksCol.updateOne(
            {
              warehouse_code: transfer.to_warehouse,
              item_type: line.item_type,
              item_id: String(line.item_id),
            },
            {
              $inc: { so_luong: line.received_qty },
              $set: { updated_at: now },
              $setOnInsert: {
                item_code: line.item_code,
                item_name: line.item_name,
                unit: line.unit || "cái",
                bin_location: line.to_bin || "INBOUND-01",
                min_stock: 5,
                created_at: now,
              },
            },
            { upsert: true }
          );
        }

        // Nếu phát sinh hao hụt trong quá trình vận chuyển → đồng bộ giảm tổng tồn ở danh mục gốc
        if (line.loss_qty > 0 && ObjectId.isValid(line.item_id)) {
          const targetCol = line.item_type === "nguyen_lieu" ? nguyenLieuCol : sanPhamCol;
          await targetCol.updateOne(
            { _id: new ObjectId(line.item_id), so_luong: { $gte: line.loss_qty } },
            { $inc: { so_luong: -line.loss_qty }, $set: { updated_at: now } }
          );
        }
      }

      const updated = await transfersCol.findOneAndUpdate(
        { _id: transfer._id, trang_thai: TRANSFER_STATUS.IN_TRANSIT },
        {
          $set: {
            trang_thai: TRANSFER_STATUS.RECEIVED,
            items: delta.lines,
            receipt_summary: {
              total_dispatched: delta.total_dispatched,
              total_received: delta.total_received,
              total_loss: delta.total_loss,
              has_discrepancy: delta.has_discrepancy,
            },
            received_at: now,
            received_by: user ? { user_id: String(user._id || ""), ho_ten: user.ho_ten || user.tai_khoan } : null,
            receipt_note: String(note || "").trim(),
            updated_at: now,
          },
        },
        { returnDocument: "after" }
      );

      return { ok: true, doc: updated };
    } catch (err) {
      logger.error("WarehouseDAO.receiveTransfer error", { error: err.message });
      return { error: err };
    }
  }

  static async cancelTransfer(transferId, { reason = "", user = null } = {}) {
    try {
      if (!ObjectId.isValid(transferId)) return { error: new Error("ID phiếu chuyển kho không hợp lệ") };
      const transfer = await transfersCol.findOne({ _id: new ObjectId(transferId) });
      if (!transfer) return { error: new Error("Không tìm thấy phiếu chuyển kho") };
      if (!canTransitionTransfer(transfer.trang_thai, TRANSFER_STATUS.CANCELLED)) {
        return { error: new Error(`Không thể hủy phiếu ở trạng thái "${transfer.trang_thai}"`) };
      }

      // Nếu phiếu đã xuất đi đường (`in_transit`) thì hoàn tồn lại kho nguồn
      if (transfer.trang_thai === TRANSFER_STATUS.IN_TRANSIT) {
        for (const it of transfer.items) {
          await stocksCol.updateOne(
            { warehouse_code: transfer.from_warehouse, item_type: it.item_type, item_id: String(it.item_id) },
            { $inc: { so_luong: it.quantity }, $set: { updated_at: new Date() } }
          );
        }
      }

      const updated = await transfersCol.findOneAndUpdate(
        { _id: transfer._id },
        {
          $set: {
            trang_thai: TRANSFER_STATUS.CANCELLED,
            cancel_reason: String(reason || "").trim(),
            cancelled_by: user ? { user_id: String(user._id || ""), ho_ten: user.ho_ten || user.tai_khoan } : null,
            updated_at: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      return { ok: true, doc: updated };
    } catch (err) {
      logger.error("WarehouseDAO.cancelTransfer error", { error: err.message });
      return { error: err };
    }
  }

  static async listTransfers({ status = "", warehouseCode = "", page = 1, limit = 50 } = {}) {
    try {
      const filter = {};
      if (status) filter.trang_thai = status;
      if (warehouseCode) {
        const code = String(warehouseCode).trim().toUpperCase();
        filter.$or = [{ from_warehouse: code }, { to_warehouse: code }];
      }

      const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
      const [items, total] = await Promise.all([
        transfersCol.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).toArray(),
        transfersCol.countDocuments(filter),
      ]);
      return { items, total, page: Number(page), limit: Number(limit) };
    } catch (err) {
      logger.error("WarehouseDAO.listTransfers error", { error: err.message });
      return { error: err };
    }
  }
}
