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

      // Với từng mặt hàng, tính thẻ kho trong kỳ (xử lý song song theo batches 15 để tối ưu kết nối và tăng tốc 15x)
      const chunkSize = 15;
      for (let i = 0; i < itemsToInspect.length; i += chunkSize) {
        const chunk = itemsToInspect.slice(i, i + chunkSize);
        const cardResults = await Promise.all(
          chunk.map((item) =>
            StockLedgerDAO.getStockCard({
              itemId: item._id,
              itemType: item._type,
              tu_ngay: fromDate,
              den_ngay: toDate,
            }).catch(() => null)
          )
        );

        for (let j = 0; j < chunk.length; j++) {
          const item = chunk[j];
          const cardRes = cardResults[j];
          if (!cardRes || cardRes.error) continue;

          const price = Number(item.don_gia || item.gia_von || 0);
          const gia_tri_dau = cardRes.ton_dau_ky * price;
          const gia_tri_nhap = cardRes.tong_nhap_trong_ky * price;
          const gia_tri_xuat = cardRes.tong_xuat_trong_ky * price;
          const gia_tri_cuoi = cardRes.ton_cuoi_ky * price;

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
            ton_dau_ky: cardRes.ton_dau_ky,
            gia_tri_dau,
            nhap_trong_ky: cardRes.tong_nhap_trong_ky,
            gia_tri_nhap,
            xuat_trong_ky: cardRes.tong_xuat_trong_ky,
            gia_tri_xuat,
            ton_cuoi_ky: cardRes.ton_cuoi_ky,
            gia_tri_cuoi,
          });
        }
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
