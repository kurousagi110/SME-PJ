import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";

let donHangCol;
let sanXuatLogsCol;
let dieuChinhKhoCol;
let doiTraCol;
let sanPhamCol;
let nguyenLieuCol;

export default class StockLedgerDAO {
  static async injectDB(conn) {
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME;
    if (!dbName) throw new Error("StockLedgerDAO: missing DB name");
    const db = conn.db(dbName);
    donHangCol = db.collection("don_hang");
    sanXuatLogsCol = db.collection("san_xuat_logs");
    dieuChinhKhoCol = db.collection("dieu_chinh_kho");
    doiTraCol = db.collection("doi_tra_hang");
    sanPhamCol = db.collection("san_pham");
    nguyenLieuCol = db.collection("nguyen_lieu");

    try {
      await donHangCol.createIndex({ "san_pham.san_pham_id": 1, created_at: -1 });
      await donHangCol.createIndex({ "san_pham.ma_sp": 1, created_at: -1 });
      await donHangCol.createIndex({ "items.san_pham_id": 1, created_at: -1 });
      await donHangCol.createIndex({ "items.nguyen_lieu_id": 1, created_at: -1 });
      await dieuChinhKhoCol.createIndex({ item_id: 1, created_at: -1 });
      await doiTraCol.createIndex({ "san_pham.san_pham_id": 1, created_at: -1 });
    } catch (err) {
      logger.warn("StockLedgerDAO: Index creation skipped or already exists", { error: err.message });
    }
  }

  /**
   * 1. Tra cứu Thẻ Kho (Stock Movement Card) cho 1 mặt hàng cụ thể
   */
  static async getStockCard({
    itemId,
    itemType = "product", // "product" | "material"
    tu_ngay,
    den_ngay,
  }) {
    try {
      const fromDate = tu_ngay ? new Date(tu_ngay) : new Date(0);
      const toDate = den_ngay ? new Date(new Date(den_ngay).setHours(23, 59, 59, 999)) : new Date();

      // Lấy thông tin mặt hàng hiện tại
      let item = null;
      if (itemType === "material") {
        item = await nguyenLieuCol.findOne({
          $or: [
            ObjectId.isValid(itemId) ? { _id: new ObjectId(itemId) } : null,
            { ma_vt: String(itemId).trim() },
            { ma_nl: String(itemId).trim() },
          ].filter(Boolean),
        });
      } else {
        item = await sanPhamCol.findOne({
          $or: [
            ObjectId.isValid(itemId) ? { _id: new ObjectId(itemId) } : null,
            { ma_sp: String(itemId).trim() },
          ].filter(Boolean),
        });
      }

      if (!item) {
        return { error: new Error("Không tìm thấy mặt hàng để tra cứu thẻ kho") };
      }

      const itemObjectId = item._id;
      const itemCode = item.ma_sp || item.ma_vt || item.ma_nl || "";
      const itemName = item.ten_sp || item.ten_nl || item.ten_vt || "";
      const currentStock = Number(item.so_luong || 0);
      const unit = item.don_vi || "Cái";

      // ── Thu thập toàn bộ biến động lịch sử ──
      const allMovements = [];

      // A. Đơn mua hàng (Nhập kho nguyên vật liệu hoặc thành phẩm)
      const purchaseOrders = await donHangCol
        .find({
          loai_don: "purchase_receipt",
          trang_thai: { $in: ["confirmed", "completed", "paid"] },
          $or: [
            { "san_pham.san_pham_id": itemObjectId },
            { "san_pham.nguyen_lieu_id": itemObjectId },
            { "items.san_pham_id": itemObjectId },
            { "items.nguyen_lieu_id": itemObjectId },
          ],
        })
        .toArray();

      for (const po of purchaseOrders) {
        const rawItems = po.san_pham || po.items || [];
        const line = rawItems.find(
          (i) =>
            String(i.san_pham_id) === String(itemObjectId) ||
            String(i.nguyen_lieu_id) === String(itemObjectId)
        );
        if (line) {
          allMovements.push({
            date: new Date(po.ngay_nhap || po.created_at || po.updated_at),
            ma_chung_tu: po.ma_dh,
            loai_giao_dich: "NHAP_MUA_HANG",
            mo_ta: `Nhập mua từ NCC: ${po.nha_cung_cap || po.nha_cung_cap_ten || "Nhà cung cấp"}`,
            so_luong_nhap: Number(line.so_luong || 0),
            so_luong_xuat: 0,
            don_gia: Number(line.don_gia || 0),
          });
        }
      }

      // B. Đơn bán hàng (Xuất kho thành phẩm)
      if (itemType === "product") {
        const saleOrders = await donHangCol
          .find({
            loai_don: { $in: ["sale", "order_sale"] },
            trang_thai: { $in: ["completed", "paid", "confirmed"] },
            $or: [
              { "san_pham.san_pham_id": itemObjectId },
              { "items.san_pham_id": itemObjectId },
            ],
          })
          .toArray();

        for (const so of saleOrders) {
          const rawItems = so.san_pham || so.items || [];
          const line = rawItems.find(
            (i) => String(i.san_pham_id) === String(itemObjectId)
          );
          if (line) {
            allMovements.push({
              date: new Date(so.ngay_dat || so.created_at || so.updated_at),
              ma_chung_tu: so.ma_dh,
              loai_giao_dich: "XUAT_BAN_HANG",
              mo_ta: `Xuất bán đơn hàng: ${so.ma_dh} (${so.khach_hang?.ten || so.khach_hang_ten || "Khách lẻ"})`,
              so_luong_nhap: 0,
              so_luong_xuat: Number(line.so_luong || 0),
              don_gia: Number(line.don_gia || 0),
            });
          }
        }
      }

      // C. Lệnh sản xuất
      if (itemType === "product") {
        // Nhập kho thành phẩm hoàn thành từ SX
        const sxLogs = await sanXuatLogsCol
          .find({ san_pham_id: itemObjectId })
          .toArray();
        for (const log of sxLogs) {
          allMovements.push({
            date: new Date(log.created_at),
            ma_chung_tu: log.ma_lo || "SX",
            loai_giao_dich: "NHAP_SAN_XUAT",
            mo_ta: `Nhập kho lô sản xuất: ${log.ma_lo || ""}`,
            so_luong_nhap: Number(log.so_luong_sx || 0),
            so_luong_xuat: 0,
            don_gia: Number(log.unit_cost || 0),
          });
        }
      } else {
        // Xuất kho nguyên vật liệu cho sản xuất
        const sxLogs = await sanXuatLogsCol
          .find({ "nguyen_lieu_used.nguyen_lieu_id": itemObjectId })
          .toArray();
        for (const log of sxLogs) {
          const used = (log.nguyen_lieu_used || []).find(
            (u) => String(u.nguyen_lieu_id) === String(itemObjectId)
          );
          if (used) {
            allMovements.push({
              date: new Date(log.created_at),
              ma_chung_tu: log.ma_lo || "SX",
              loai_giao_dich: "XUAT_SAN_XUAT",
              mo_ta: `Xuất dùng cho lệnh SX thành phẩm: ${log.ten_sp || ""}`,
              so_luong_nhap: 0,
              so_luong_xuat: Number(used.qty_need || 0),
              don_gia: Number(used.don_gia || 0),
            });
          }
        }
      }

      // D. Kiểm kê điều chỉnh kho (Tăng / Giảm)
      const adjustments = await dieuChinhKhoCol
        .find({
          trang_thai: "approved",
          $or: [
            { item_id: itemObjectId },
            { item_id: String(itemObjectId) },
            { "items.item_id": itemObjectId },
          ],
        })
        .toArray();

      for (const adj of adjustments) {
        if (adj.items && Array.isArray(adj.items)) {
          const line = adj.items.find(
            (i) => String(i.item_id) === String(itemObjectId)
          );
          if (line) {
            const delta = Number(line.chenh_lech || line.so_luong_dieu_chinh || 0);
            if (delta > 0) {
              allMovements.push({
                date: new Date(adj.approved_at || adj.created_at),
                ma_chung_tu: adj.ma_phieu,
                loai_giao_dich: "NHAP_DIEU_CHINH_TANG",
                mo_ta: `Điều chỉnh kiểm kê tăng: ${adj.ly_do || ""}`,
                so_luong_nhap: delta,
                so_luong_xuat: 0,
                don_gia: Number(item.don_gia || 0),
              });
            } else if (delta < 0) {
              allMovements.push({
                date: new Date(adj.approved_at || adj.created_at),
                ma_chung_tu: adj.ma_phieu,
                loai_giao_dich: "XUAT_DIEU_CHINH_GIAM",
                mo_ta: `Điều chỉnh kiểm kê giảm: ${adj.ly_do || ""}`,
                so_luong_nhap: 0,
                so_luong_xuat: Math.abs(delta),
                don_gia: Number(item.don_gia || 0),
              });
            }
          }
        } else if (String(adj.item_id) === String(itemObjectId)) {
          const delta = Number(adj.so_luong_dieu_chinh || 0);
          if (delta > 0) {
            allMovements.push({
              date: new Date(adj.approved_at || adj.created_at),
              ma_chung_tu: adj.ma_phieu,
              loai_giao_dich: "NHAP_DIEU_CHINH_TANG",
              mo_ta: `Điều chỉnh kiểm kê tăng: ${adj.ly_do || ""}`,
              so_luong_nhap: delta,
              so_luong_xuat: 0,
              don_gia: Number(item.don_gia || 0),
            });
          } else if (delta < 0) {
            allMovements.push({
              date: new Date(adj.approved_at || adj.created_at),
              ma_chung_tu: adj.ma_phieu,
              loai_giao_dich: "XUAT_DIEU_CHINH_GIAM",
              mo_ta: `Điều chỉnh kiểm kê giảm: ${adj.ly_do || ""}`,
              so_luong_nhap: 0,
              so_luong_xuat: Math.abs(delta),
              don_gia: Number(item.don_gia || 0),
            });
          }
        }
      }

      // E. Đổi trả hàng RMA (Nhập lại kho hàng hoàn)
      if (itemType === "product") {
        const rmaOrders = await doiTraCol
          .find({
            trang_thai: { $in: ["hoan_thanh", "completed"] },
            $or: [
              { "san_pham.san_pham_id": String(itemObjectId) },
              { "san_pham.san_pham_id": itemObjectId },
              { "san_pham.ma_sp": itemCode },
            ],
          })
          .toArray();

        for (const rma of rmaOrders) {
          const line = (rma.san_pham || []).find(
            (p) =>
              (p.san_pham_id && String(p.san_pham_id) === String(itemObjectId)) ||
              p.ma_sp === itemCode
          );
          if (line && (line.qc_result === "nhap_lai_kho" || !line.qc_result)) {
            allMovements.push({
              date: new Date(rma.completed_at || rma.updated_at || rma.created_at),
              ma_chung_tu: rma.ma_rma,
              loai_giao_dich: "NHAP_TRA_HANG_RMA",
              mo_ta: `Nhập lại kho từ RMA: ${rma.ma_rma} (Đơn gốc ${rma.ma_dh})`,
              so_luong_nhap: Number(line.so_luong || 0),
              so_luong_xuat: 0,
              don_gia: Number(line.don_gia || 0),
            });
          }
        }
      }

      // Sắp xếp toàn bộ giao dịch theo thời gian tăng dần
      allMovements.sort((a, b) => a.date - b.date);

      // Phân bổ Tồn đầu kỳ và Tồn lũy kế
      // Tính ngược: tổng chênh lệch sau `toDate` và trước `fromDate`
      let runningBalance = 0;
      let ton_dau_ky = 0;
      const inPeriodMovements = [];
      let tong_nhap_trong_ky = 0;
      let tong_xuat_trong_ky = 0;

      for (const m of allMovements) {
        if (m.date < fromDate) {
          ton_dau_ky += m.so_luong_nhap - m.so_luong_xuat;
        } else if (m.date <= toDate) {
          if (inPeriodMovements.length === 0) {
            runningBalance = ton_dau_ky;
          }
          runningBalance += m.so_luong_nhap - m.so_luong_xuat;
          tong_nhap_trong_ky += m.so_luong_nhap;
          tong_xuat_trong_ky += m.so_luong_xuat;

          inPeriodMovements.push({
            ...m,
            ton_luy_ke: runningBalance,
          });
        }
      }

      const ton_cuoi_ky = ton_dau_ky + tong_nhap_trong_ky - tong_xuat_trong_ky;

      return {
        item: {
          id: itemObjectId,
          ma_hang: itemCode,
          ten_hang: itemName,
          don_vi: unit,
          don_gia: Number(item.don_gia || 0),
          ton_hien_tai: currentStock,
        },
        san_pham: {
          id: itemObjectId,
          ma_sp: itemCode,
          ten_sp: itemName,
          don_vi: unit,
          don_gia: Number(item.don_gia || 0),
          so_luong: currentStock,
        },
        tu_ngay: fromDate.toISOString(),
        den_ngay: toDate.toISOString(),
        ton_dau_ky,
        tong_nhap_trong_ky,
        tong_xuat_trong_ky,
        ton_cuoi_ky,
        movements: inPeriodMovements,
        dong_the_kho: inPeriodMovements,
      };
    } catch (err) {
      logger.error("StockLedgerDAO.getStockCard error", { error: err.message });
      return { error: err };
    }
  }

  /**
   * 2. Báo Cáo Xuất - Nhập - Tồn (In-Out-Balance Inventory Report)
   */
  static async getInOutBalanceReport({
    itemType = "product", // "product" | "material" | "all"
    tu_ngay,
    den_ngay,
    search = "",
  }) {
    try {
      const fromDate = tu_ngay ? new Date(tu_ngay) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = den_ngay ? new Date(new Date(den_ngay).setHours(23, 59, 59, 999)) : new Date();

      const itemsToInspect = [];

      // Query products
      if (itemType === "product" || itemType === "all") {
        const pFilter = {};
        if (search) {
          pFilter.$or = [
            { ma_sp: { $regex: search, $options: "i" } },
            { ten_sp: { $regex: search, $options: "i" } },
          ];
        }
        const products = await sanPhamCol.find(pFilter).limit(200).toArray();
        for (const p of products) {
          itemsToInspect.push({ ...p, _type: "product" });
        }
      }

      // Query materials
      if (itemType === "material" || itemType === "all") {
        const mFilter = {};
        if (search) {
          mFilter.$or = [
            { ma_nl: { $regex: search, $options: "i" } },
            { ma_vt: { $regex: search, $options: "i" } },
            { ten_nl: { $regex: search, $options: "i" } },
          ];
        }
        const materials = await nguyenLieuCol.find(mFilter).limit(200).toArray();
        for (const m of materials) {
          itemsToInspect.push({ ...m, _type: "material" });
        }
      }

      let tong_gia_tri_ton_dau = 0;
      let tong_gia_tri_nhap = 0;
      let tong_gia_tri_xuat = 0;
      let tong_gia_tri_ton_cuoi = 0;

      const reportRows = [];

      const itemObjectIds = itemsToInspect.map((it) => it._id);
      const stringItemIds = itemObjectIds.map(String);
      const productCodes = itemsToInspect.map((it) => it.ma_sp).filter(Boolean);

      // Bulk query all 5 sources concurrently in 1 batch (eliminates O(N) query anti-pattern):
      const [purchaseOrders, saleOrders, sxLogs, adjustments, rmaOrders] = await Promise.all([
        // 1. Purchase orders
        donHangCol
          .find({
            loai_don: "purchase_receipt",
            trang_thai: { $in: ["confirmed", "completed", "paid"] },
            $or: [
              { "san_pham.san_pham_id": { $in: itemObjectIds } },
              { "san_pham.nguyen_lieu_id": { $in: itemObjectIds } },
              { "items.san_pham_id": { $in: itemObjectIds } },
              { "items.nguyen_lieu_id": { $in: itemObjectIds } },
            ],
          })
          .toArray(),

        // 2. Sale orders
        donHangCol
          .find({
            loai_don: { $in: ["sale", "order_sale"] },
            trang_thai: { $in: ["completed", "paid", "confirmed"] },
            $or: [
              { "san_pham.san_pham_id": { $in: itemObjectIds } },
              { "items.san_pham_id": { $in: itemObjectIds } },
            ],
          })
          .toArray(),

        // 3. Production logs
        sanXuatLogsCol
          .find({
            $or: [
              { san_pham_id: { $in: itemObjectIds } },
              { "nguyen_lieu_used.nguyen_lieu_id": { $in: itemObjectIds } },
            ],
          })
          .toArray(),

        // 4. Stock adjustments
        dieuChinhKhoCol
          .find({
            trang_thai: "approved",
            $or: [
              { item_id: { $in: [...itemObjectIds, ...stringItemIds] } },
              { "items.item_id": { $in: itemObjectIds } },
            ],
          })
          .toArray(),

        // 5. RMA returns
        doiTraCol
          .find({
            trang_thai: { $in: ["hoan_thanh", "completed", "approved", "qc_passed"] },
            $or: [
              { "san_pham.san_pham_id": { $in: [...itemObjectIds, ...stringItemIds] } },
              { "san_pham.ma_sp": { $in: productCodes } },
            ],
          })
          .toArray(),
      ]);

      // Index movements by itemId
      const movementsMap = new Map();
      const getList = (id) => {
        const key = String(id);
        if (!movementsMap.has(key)) movementsMap.set(key, []);
        return movementsMap.get(key);
      };

      // 1. Process purchase orders
      for (const po of purchaseOrders) {
        const d = new Date(po.ngay_nhap || po.created_at || po.updated_at);
        for (const line of (po.san_pham || po.items || [])) {
          const targetId = line.san_pham_id || line.nguyen_lieu_id;
          if (targetId) {
            getList(targetId).push({
              date: d,
              nhap: Number(line.so_luong || 0),
              xuat: 0,
            });
          }
        }
      }

      // 2. Process sale orders
      for (const so of saleOrders) {
        const d = new Date(so.ngay_dat || so.created_at || so.updated_at);
        for (const line of (so.san_pham || so.items || [])) {
          if (line.san_pham_id) {
            getList(line.san_pham_id).push({
              date: d,
              nhap: 0,
              xuat: Number(line.so_luong || 0),
            });
          }
        }
      }

      // 3. Process production logs
      for (const log of sxLogs) {
        const d = new Date(log.created_at);
        if (log.san_pham_id) {
          getList(log.san_pham_id).push({
            date: d,
            nhap: Number(log.so_luong_sx || 0),
            xuat: 0,
          });
        }
        for (const u of (log.nguyen_lieu_used || [])) {
          if (u.nguyen_lieu_id) {
            getList(u.nguyen_lieu_id).push({
              date: d,
              nhap: 0,
              xuat: Number(u.qty_need || 0),
            });
          }
        }
      }

      // 4. Process adjustments
      for (const adj of adjustments) {
        const d = new Date(adj.approved_at || adj.created_at);
        if (adj.items && Array.isArray(adj.items)) {
          for (const line of adj.items) {
            if (line.item_id) {
              const delta = Number(line.chenh_lech || line.so_luong_dieu_chinh || 0);
              getList(line.item_id).push({
                date: d,
                nhap: delta > 0 ? delta : 0,
                xuat: delta < 0 ? Math.abs(delta) : 0,
              });
            }
          }
        } else if (adj.item_id) {
          const delta = Number(adj.so_luong_dieu_chinh || 0);
          getList(adj.item_id).push({
            date: d,
            nhap: delta > 0 ? delta : 0,
            xuat: delta < 0 ? Math.abs(delta) : 0,
          });
        }
      }

      // 5. Process RMA returns
      for (const rma of rmaOrders) {
        const d = new Date(rma.completed_at || rma.updated_at || rma.created_at);
        for (const line of (rma.san_pham || [])) {
          if (line.qc_result === "nhap_lai_kho" || !line.qc_result) {
            if (line.san_pham_id) {
              getList(line.san_pham_id).push({
                date: d,
                nhap: Number(line.so_luong || 0),
                xuat: 0,
              });
            }
          }
        }
      }

      // Compute balance for each item in memory
      for (const item of itemsToInspect) {
        const key = String(item._id);
        const movements = movementsMap.get(key) || [];
        let ton_dau_ky = 0;
        let nhap_trong_ky = 0;
        let xuat_trong_ky = 0;

        for (const m of movements) {
          if (m.date < fromDate) {
            ton_dau_ky += m.nhap - m.xuat;
          } else if (m.date <= toDate) {
            nhap_trong_ky += m.nhap;
            xuat_trong_ky += m.xuat;
          }
        }

        const ton_cuoi_ky = ton_dau_ky + nhap_trong_ky - xuat_trong_ky;
        const price = Number(item.don_gia || item.gia_von || 0);
        const gia_tri_dau = ton_dau_ky * price;
        const gia_tri_nhap = nhap_trong_ky * price;
        const gia_tri_xuat = xuat_trong_ky * price;
        const gia_tri_cuoi = ton_cuoi_ky * price;

        tong_gia_tri_ton_dau += gia_tri_dau;
        tong_gia_tri_nhap += gia_tri_nhap;
        tong_gia_tri_xuat += gia_tri_xuat;
        tong_gia_tri_ton_cuoi += gia_tri_cuoi;

        reportRows.push({
          id: item._id,
          loai: item._type === "product" ? "Thành phẩm" : "Nguyên vật liệu",
          ma_hang: item.ma_sp || item.ma_nl || item.ma_vt || "",
          ten_hang: item.ten_sp || item.ten_nl || item.ten_vt || "",
          don_vi: item.don_vi || "Cái",
          don_gia: price,
          ton_dau_ky,
          gia_tri_dau,
          nhap_trong_ky,
          gia_tri_nhap,
          xuat_trong_ky,
          gia_tri_xuat,
          ton_cuoi_ky,
          gia_tri_cuoi,
        });
      }

      return {
        tu_ngay: fromDate.toISOString(),
        den_ngay: toDate.toISOString(),
        tong_so_mat_hang: reportRows.length,
        summary: {
          tong_gia_tri_ton_dau,
          tong_gia_tri_nhap,
          tong_gia_tri_xuat,
          tong_gia_tri_ton_cuoi,
        },
        items: reportRows,
      };
    } catch (err) {
      logger.error("StockLedgerDAO.getInOutBalanceReport error", { error: err.message });
      return { error: err };
    }
  }
}
