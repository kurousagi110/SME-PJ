/**
 * COGS (Cost of Goods Sold) & Inventory Valuation Engine
 * Động cơ tính giá vốn hàng bán và định giá tồn kho theo chuẩn Bình quân gia quyền liên hoàn (Moving Weighted Average)
 */

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import { getDB } from "../config/database.js";

let sanPhamCol = null;
let nguyenLieuCol = null;
let bomCol = null;

export class COGSService {
  static injectDB(db) {
    sanPhamCol = db.collection("san_pham");
    nguyenLieuCol = db.collection("nguyen_lieu");
    bomCol = db.collection("bom_san_pham");
  }

  static getCollections() {
    if (!sanPhamCol || !nguyenLieuCol) {
      const db = getDB();
      if (db) this.injectDB(db);
    }
    return { sanPhamCol, nguyenLieuCol, bomCol };
  }

  /**
   * Tính toán giá thành định mức của sản phẩm dựa trên định mức BOM và đơn giá nguyên vật liệu hiện tại
   * @param {Object} productDoc
   * @param {Object} [options]
   * @returns {Promise<number>} Đơn giá vốn tính theo BOM (VND)
   */
  static async calculateBOMCost(productDoc, { session } = {}) {
    if (!productDoc) return 0;
    const { nguyenLieuCol: nlCol } = this.getCollections();

    // 1. Nếu sản phẩm có khai báo mảng nguyen_lieu trực tiếp
    const rawMaterials = Array.isArray(productDoc.nguyen_lieu) ? productDoc.nguyen_lieu : [];
    if (rawMaterials.length > 0 && nlCol) {
      const maNLs = rawMaterials.map((r) => r.ma_nl).filter(Boolean);
      const nlDocs = maNLs.length
        ? await nlCol.find({ ma_nl: { $in: maNLs } }, { session }).toArray()
        : [];
      const nlMap = new Map(nlDocs.map((nl) => [String(nl.ma_nl).trim(), nl]));

      let totalBomCost = 0;
      for (const item of rawMaterials) {
        const qty = Number(item.so_luong || item.dinh_muc || 0);
        if (qty <= 0) continue;
        const found = nlMap.get(String(item.ma_nl).trim());
        const unitPrice = Number(found?.gia_nhap || found?.gia_von || 0);
        totalBomCost += qty * unitPrice;
      }

      if (totalBomCost > 0) {
        return Math.round(totalBomCost);
      }
    }

    // 2. Nếu đã có gia_von lưu trước đó trên sản phẩm
    if (Number(productDoc.gia_von) > 0) {
      return Number(productDoc.gia_von);
    }

    // 3. Fallback: Ước tính tiêu chuẩn ngành nội thất/sản xuất (55% giá niêm yết bán)
    const listPrice = Number(productDoc.don_gia || 0);
    return Math.round(listPrice * 0.55);
  }

  /**
   * Cập nhật đơn giá vốn bình quân gia quyền liên hoàn (Moving Weighted Average Cost)
   * Công thức: Giá vốn mới = (Tồn cũ * Giá cũ + Nhập mới * Giá nhập mới) / (Tồn cũ + Nhập mới)
   */
  static async updateMovingAverageCost({
    itemId,
    itemType = "san_pham", // "san_pham" | "nguyen_lieu"
    incomingQty = 0,
    incomingPrice = 0,
    session = null,
  }) {
    const { sanPhamCol: spCol, nguyenLieuCol: nlCol } = this.getCollections();
    const col = itemType === "nguyen_lieu" ? nlCol : spCol;
    if (!col || !itemId) return null;

    try {
      const oid = typeof itemId === "string" ? new ObjectId(itemId) : itemId;
      const currentDoc = await col.findOne({ _id: oid }, { session });
      if (!currentDoc) return null;

      const currentQty = Math.max(0, Number(currentDoc.so_luong || 0));
      const currentCost = Number(
        itemType === "nguyen_lieu"
          ? currentDoc.gia_nhap || currentDoc.gia_von || 0
          : currentDoc.gia_von || (await this.calculateBOMCost(currentDoc, { session }))
      );

      const inQty = Math.max(0, Number(incomingQty));
      const inPrice = Math.max(0, Number(incomingPrice));

      let newAverageCost = currentCost;
      const totalQty = currentQty + inQty;

      if (totalQty > 0 && inQty > 0) {
        const totalValue = currentQty * currentCost + inQty * inPrice;
        newAverageCost = Math.round(totalValue / totalQty);
      } else if (currentCost <= 0 && inPrice > 0) {
        newAverageCost = inPrice;
      }

      const updateFields = {
        updateAt: new Date(),
      };

      if (itemType === "nguyen_lieu") {
        updateFields.gia_nhap = newAverageCost;
        updateFields.gia_von = newAverageCost;
      } else {
        updateFields.gia_von = newAverageCost;
      }

      await col.updateOne({ _id: oid }, { $set: updateFields }, { session });

      logger.info(`[COGSService] Updated moving average cost for ${itemType}`, {
        id: String(itemId),
        oldCost: currentCost,
        incomingPrice: inPrice,
        newAverageCost,
      });

      return newAverageCost;
    } catch (err) {
      logger.error("[COGSService.updateMovingAverageCost] Failed", { error: err.message });
      return null;
    }
  }

  /**
   * Đồng bộ khởi tạo đơn giá vốn chuẩn cho toàn bộ danh mục sản phẩm từ BOM
   */
  static async syncAllProductBOMCosts() {
    const { sanPhamCol: spCol } = this.getCollections();
    if (!spCol) return { updated: 0 };

    try {
      const products = await spCol.find({ trang_thai: { $ne: "deleted" } }).toArray();
      let updatedCount = 0;

      for (const sp of products) {
        const bomCost = await this.calculateBOMCost(sp);
        if (bomCost > 0) {
          await spCol.updateOne(
            { _id: sp._id },
            {
              $set: {
                gia_von: sp.gia_von ? Number(sp.gia_von) : bomCost,
                gia_von_dinh_muc: bomCost,
                updateAt: new Date(),
              },
            }
          );
          updatedCount++;
        }
      }

      logger.info(`[COGSService] Synced BOM costs for ${updatedCount} products`);
      return { updated: updatedCount };
    } catch (err) {
      logger.error("[COGSService.syncAllProductBOMCosts] Failed", { error: err.message });
      return { error: err.message };
    }
  }
}

export default COGSService;
