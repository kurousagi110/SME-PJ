/**
 * EcommerceSyncDAO — Quản lý kết nối gian hàng Shopee / TikTok Shop / Lazada,
 * ánh xạ SKU ↔ sản phẩm nội bộ, đồng bộ tồn kho chống oversell, kéo đơn và quyết toán tiền sàn vào Sổ Quỹ.
 */

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import DonHangService from "../services/donHangService.js";
import SoQuyDAO from "./soQuyDAO.js";
import {
  computeSafeChannelStock,
  computeChannelSettlement,
  normalizeExternalChannelOrder,
} from "../utils/ecommerceSyncEngine.js";

let channelsCol = null;
let mappingsCol = null;
let syncLogsCol = null;
let sanPhamCol = null;

export default class EcommerceSyncDAO {
  static async injectDB(conn) {
    if (channelsCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("EcommerceSyncDAO.injectDB: missing SME_DB_NAME env var");
    const db = conn.db(dbName);

    channelsCol = db.collection("ecommerce_channels");
    mappingsCol = db.collection("ecommerce_sku_mappings");
    syncLogsCol = db.collection("ecommerce_sync_logs");
    sanPhamCol = db.collection("san_pham");

    try {
      await channelsCol.createIndex({ platform: 1, shop_id: 1 }, { unique: true });
      await mappingsCol.createIndex({ channel_id: 1, channel_sku: 1 }, { unique: true });
      await syncLogsCol.createIndex({ created_at: -1 });
    } catch (err) {
      logger.warn("EcommerceSyncDAO index warning", { error: err.message });
    }
  }

  static async listChannels() {
    try {
      const [channels, mappings, logs] = await Promise.all([
        channelsCol.find({}).sort({ created_at: -1 }).toArray(),
        mappingsCol.find({}).sort({ updated_at: -1 }).limit(200).toArray(),
        syncLogsCol.find({}).sort({ created_at: -1 }).limit(30).toArray(),
      ]);
      return { channels, mappings, logs };
    } catch (err) {
      logger.error("EcommerceSyncDAO.listChannels error", { error: err.message });
      return { error: err };
    }
  }

  static async upsertChannel(payload = {}, user = null) {
    try {
      const platform = String(payload.platform || "shopee").trim().toLowerCase();
      const shopId = String(payload.shop_id || "").trim();
      const shopName = String(payload.shop_name || "").trim();
      if (!shopId || !shopName) return { error: new Error("Thiếu mã gian hàng (shop_id) hoặc tên gian hàng") };

      const now = new Date();
      const doc = await channelsCol.findOneAndUpdate(
        { platform, shop_id: shopId },
        {
          $set: {
            shop_name: shopName,
            platform_fee_pct: Math.max(0, Number(payload.platform_fee_pct ?? 11)),
            payment_fee_pct: Math.max(0, Number(payload.payment_fee_pct ?? 3)),
            default_buffer_stock: Math.max(0, Math.floor(Number(payload.default_buffer_stock ?? 2))),
            auto_sync_inventory: payload.auto_sync_inventory !== false,
            is_active: payload.is_active !== false,
            updated_by: user ? user.ho_ten || user.tai_khoan : "Admin",
            updated_at: now,
          },
          $setOnInsert: { created_at: now, last_synced_at: null },
        },
        { upsert: true, returnDocument: "after" }
      );
      return { ok: true, doc };
    } catch (err) {
      logger.error("EcommerceSyncDAO.upsertChannel error", { error: err.message });
      return { error: err };
    }
  }

  static async upsertSkuMapping(payload = {}) {
    try {
      const channelId = String(payload.channel_id || "").trim();
      const channelSku = String(payload.channel_sku || "").trim().toUpperCase();
      const productId = String(payload.san_pham_id || "").trim();
      if (!channelId || !channelSku || !ObjectId.isValid(productId)) {
        return { error: new Error("Thiếu channel_id, channel_sku hoặc san_pham_id hợp lệ") };
      }

      const sp = await sanPhamCol.findOne({ _id: new ObjectId(productId) });
      if (!sp) return { error: new Error("Không tìm thấy sản phẩm nội bộ để ánh xạ") };

      const now = new Date();
      const doc = await mappingsCol.findOneAndUpdate(
        { channel_id: channelId, channel_sku: channelSku },
        {
          $set: {
            san_pham_id: productId,
            ma_sp: sp.ma_sp || "",
            ten_sp: sp.ten_sp || "",
            buffer_stock: Math.max(0, Math.floor(Number(payload.buffer_stock ?? 2))),
            max_publish_qty: Math.max(0, Math.floor(Number(payload.max_publish_qty ?? 0))),
            updated_at: now,
          },
          $setOnInsert: { created_at: now, last_pushed_qty: null },
        },
        { upsert: true, returnDocument: "after" }
      );
      return { ok: true, doc };
    } catch (err) {
      logger.error("EcommerceSyncDAO.upsertSkuMapping error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Đồng bộ tồn kho an toàn (trừ tồn đệm buffer_stock) cho tất cả SKU đã ánh xạ của 1 gian hàng.
   */
  static async syncInventory(channelId, user = null) {
    try {
      if (!ObjectId.isValid(channelId)) return { error: new Error("ID gian hàng không hợp lệ") };
      const channel = await channelsCol.findOne({ _id: new ObjectId(channelId) });
      if (!channel) return { error: new Error("Không tìm thấy gian hàng TMĐT") };

      const mappings = await mappingsCol.find({ channel_id: String(channel._id) }).toArray();
      const syncedItems = [];
      const now = new Date();

      for (const m of mappings) {
        if (!ObjectId.isValid(m.san_pham_id)) continue;
        const sp = await sanPhamCol.findOne({ _id: new ObjectId(m.san_pham_id) });
        const physical = Number(sp?.so_luong || 0);
        const safeQty = computeSafeChannelStock({
          physicalStock: physical,
          reservedStock: 0,
          bufferStock: m.buffer_stock ?? channel.default_buffer_stock ?? 2,
          maxPublishQty: m.max_publish_qty || 0,
        });

        await mappingsCol.updateOne(
          { _id: m._id },
          { $set: { last_pushed_qty: safeQty, last_physical_qty: physical, last_synced_at: now } }
        );
        syncedItems.push({
          channel_sku: m.channel_sku,
          ma_sp: m.ma_sp,
          physical_qty: physical,
          pushed_qty: safeQty,
        });
      }

      await channelsCol.updateOne({ _id: channel._id }, { $set: { last_synced_at: now, updated_at: now } });

      const logDoc = {
        channel_id: String(channel._id),
        platform: channel.platform,
        shop_name: channel.shop_name,
        action: "inventory_sync",
        items_count: syncedItems.length,
        summary: `Đồng bộ tồn kho an toàn ${syncedItems.length} SKU lên ${channel.shop_name}`,
        details: syncedItems,
        by: user ? user.ho_ten || user.tai_khoan : "Hệ thống",
        created_at: now,
      };
      await syncLogsCol.insertOne(logDoc);
      return { ok: true, syncedItems, log: logDoc };
    } catch (err) {
      logger.error("EcommerceSyncDAO.syncInventory error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Tiếp nhận / Kéo đơn hàng từ sàn TMĐT về SME (tự ánh xạ SKU → Sản phẩm nội bộ).
   */
  static async importOrder(channelId, rawOrder = {}, user = null) {
    try {
      if (!ObjectId.isValid(channelId)) return { error: new Error("ID gian hàng không hợp lệ") };
      const channel = await channelsCol.findOne({ _id: new ObjectId(channelId) });
      if (!channel) return { error: new Error("Không tìm thấy gian hàng TMĐT") };

      const normalized = normalizeExternalChannelOrder(channel.platform, rawOrder);
      const mappings = await mappingsCol.find({ channel_id: String(channel._id) }).toArray();
      const mapBySku = new Map(mappings.map((m) => [m.channel_sku, m]));

      const orderItems = [];
      for (const it of normalized.items) {
        const mapped = mapBySku.get(it.channel_sku);
        if (!mapped) {
          return { error: new Error(`SKU sàn "${it.channel_sku}" chưa được ánh xạ với sản phẩm SME`) };
        }
        orderItems.push({
          loai_hang: "san_pham",
          san_pham_id: mapped.san_pham_id,
          ma_sp: mapped.ma_sp,
          ten_sp: mapped.ten_sp,
          so_luong: it.quantity,
          don_gia: it.unit_price,
        });
      }
      if (orderItems.length === 0) {
        return { error: new Error("Đơn hàng sàn cần ít nhất 1 dòng SKU hợp lệ") };
      }

      const created = await DonHangService.create(
        {
          loai_don: "sale",
          khach_hang_ten: `${normalized.customer_name} (${channel.platform.toUpperCase()})`,
          san_pham: orderItems,
          ghi_chu: `Đơn đồng bộ từ ${channel.shop_name} — Mã sàn: ${normalized.external_order_id}`,
          trang_thai: "confirmed",
        },
        user?._id || null
      );

      await syncLogsCol.insertOne({
        channel_id: String(channel._id),
        platform: channel.platform,
        shop_name: channel.shop_name,
        action: "order_import",
        external_order_id: normalized.external_order_id,
        sme_order_code: created?.ma_dh || null,
        summary: `Kéo đơn sàn ${normalized.external_order_id} → Đơn SME ${created?.ma_dh || ""}`,
        by: user ? user.ho_ten || user.tai_khoan : "Hệ thống",
        created_at: new Date(),
      });

      return { ok: true, order: created, external_order_id: normalized.external_order_id };
    } catch (err) {
      logger.error("EcommerceSyncDAO.importOrder error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * Quyết toán tiền sàn TMĐT: tính net payout sau phí sàn & tự động sinh Phiếu Thu vào Sổ Quỹ.
   */
  static async settlePayout(channelId, payload = {}, user = null) {
    try {
      if (!ObjectId.isValid(channelId)) return { error: new Error("ID gian hàng không hợp lệ") };
      const channel = await channelsCol.findOne({ _id: new ObjectId(channelId) });
      if (!channel) return { error: new Error("Không tìm thấy gian hàng TMĐT") };

      const settlement = computeChannelSettlement({
        grossSales: payload.gross_sales,
        platformFeePct: payload.platform_fee_pct ?? channel.platform_fee_pct ?? 11,
        paymentFeePct: payload.payment_fee_pct ?? channel.payment_fee_pct ?? 3,
        shopVoucherCost: payload.shop_voucher_cost ?? 0,
        shippingSubsidy: payload.shipping_subsidy ?? 0,
        returnAmount: payload.return_amount ?? 0,
      });

      let phieuThu = null;
      if (settlement.net_payout > 0) {
        const sqRes = await SoQuyDAO.taoPhieu({
          loai_phieu: "thu",
          hang_muc: "thu_tien_ban_hang",
          so_tien: settlement.net_payout,
          phuong_thuc: "chuyen_khoan",
          doi_tuong: { loai: "khach_hang", ten: `${channel.shop_name} (${channel.platform.toUpperCase()})` },
          ma_chung_tu: payload.settlement_ref || `QT-${channel.platform.toUpperCase()}-${Date.now().toString().slice(-6)}`,
          ghi_chu: `Quyết toán doanh thu sàn ${channel.shop_name}: Gross ${settlement.gross_sales.toLocaleString("vi-VN")}đ - Phí & hoàn ${settlement.total_deductions.toLocaleString("vi-VN")}đ`,
          user,
        });
        phieuThu = sqRes?.doc || null;
      }

      await syncLogsCol.insertOne({
        channel_id: String(channel._id),
        platform: channel.platform,
        shop_name: channel.shop_name,
        action: "payout_settlement",
        settlement,
        ma_phieu_thu: phieuThu?.ma_phieu || null,
        summary: `Quyết toán tiền sàn ${channel.shop_name}: Thực nhận ${settlement.net_payout.toLocaleString("vi-VN")} đ`,
        by: user ? user.ho_ten || user.tai_khoan : "Hệ thống",
        created_at: new Date(),
      });

      return { ok: true, settlement, phieu_thu: phieuThu };
    } catch (err) {
      logger.error("EcommerceSyncDAO.settlePayout error", { error: err.message });
      return { error: err };
    }
  }
}
