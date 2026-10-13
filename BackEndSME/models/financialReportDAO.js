/**
 * Financial Report DAO
 * Báo cáo Lãi - Lỗ (P&L - Profit and Loss Statement), Hiệu quả Sinh lời Sản phẩm, và Phân tích Tuổi nợ (Aging Debt)
 */

import { ObjectId } from "mongodb";
import logger from "../utils/logger.js";
import COGSService from "../services/cogsService.js";

let donHangCol = null;
let soQuyCol = null;
let sanPhamCol = null;
let nguyenLieuCol = null;
let returnCol = null;
let doiTacCol = null;
let luongCol = null;
let bangLuongChotCol = null;

export default class FinancialReportDAO {
  static async injectDB(conn) {
    if (donHangCol && soQuyCol) return;
    const dbName = process.env.SME_DB_NAME || process.env.DB_NAME || "SME_db_mongo";
    const db = conn.db(dbName);

    donHangCol = db.collection("don_hang");
    soQuyCol = db.collection("so_quy");
    sanPhamCol = db.collection("san_pham");
    nguyenLieuCol = db.collection("nguyen_lieu");
    returnCol = db.collection("doi_tra");
    doiTacCol = db.collection("doi_tac");
    luongCol = db.collection("luong");
    bangLuongChotCol = db.collection("bang_luong_chot");

    COGSService.injectDB(db);
    logger.info("FinancialReportDAO initialized");
  }

  /**
   * Helper parse date range
   */
  static _getDateRange({ date_from, date_to, year, month }) {
    let start, end;
    const now = new Date();

    if (year) {
      const y = Number(year);
      if (month) {
        const m = Number(month) - 1;
        start = new Date(y, m, 1, 0, 0, 0, 0);
        end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      } else {
        start = new Date(y, 0, 1, 0, 0, 0, 0);
        end = new Date(y, 11, 31, 23, 59, 59, 999);
      }
    } else if (date_from && date_to) {
      start = new Date(date_from);
      start.setHours(0, 0, 0, 0);
      end = new Date(date_to);
      end.setHours(23, 59, 59, 999);
    } else {
      // Mặc định: Năm hiện tại
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    return { start, end };
  }

  /**
   * Báo cáo Kết quả Hoạt động Kinh doanh & Lãi - Lỗ (P&L - Profit and Loss Statement)
   */
  static async getProfitAndLoss({ date_from, date_to, year, month } = {}) {
    try {
      const { start, end } = this._getDateRange({ date_from, date_to, year, month });

      // 1. Lấy tất cả đơn bán hàng hoàn thành trong kỳ
      const salesQuery = {
        loai_don: "sale",
        trang_thai: { $in: ["completed", "paid", "da_thanh_toan"] },
        $or: [
          { ngay_dat: { $gte: start, $lte: end } },
          { created_at: { $gte: start, $lte: end } },
        ],
      };

      const salesOrders = await donHangCol.find(salesQuery).toArray();

      // 2. Tính Doanh thu & Chiết khấu & Giá vốn
      let grossRevenue = 0;
      let totalDiscounts = 0;
      let shippingFeesCollected = 0;
      let totalCogs = 0;

      // Group theo tháng để vẽ biểu đồ
      const monthlyDataMap = new Map();
      for (let m = 0; m < 12; m++) {
        monthlyDataMap.set(m, {
          month: `Thg ${m + 1}`,
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          opex: 0,
          netProfit: 0,
          orderCount: 0,
        });
      }

      for (const order of salesOrders) {
        const orderDate = new Date(order.ngay_dat || order.created_at || start);
        const mIdx = orderDate.getMonth();

        const orderSubtotal = Number(order.tam_tinh || order.tong_tien || 0);
        const orderDiscount = Number(order.giam_gia || 0);
        const orderShipping = Number(order.phi_vc || 0);
        const orderNet = Math.max(0, Number(order.tong_tien || 0) - orderShipping);

        grossRevenue += orderSubtotal;
        totalDiscounts += orderDiscount;
        shippingFeesCollected += orderShipping;

        // Tính COGS của đơn
        let orderCogs = Number(order.tong_gia_von || 0);
        if (orderCogs <= 0 && Array.isArray(order.san_pham)) {
          // Ước tính nếu chưa có snapshot
          for (const item of order.san_pham) {
            const itemPrice = Number(item.don_gia || 0);
            const itemQty = Number(item.so_luong || 0);
            const unitCost = Number(item.gia_von || 0) || Math.round(itemPrice * 0.55);
            orderCogs += unitCost * itemQty;
          }
        }
        totalCogs += orderCogs;

        const mObj = monthlyDataMap.get(mIdx);
        if (mObj) {
          mObj.revenue += orderNet;
          mObj.cogs += orderCogs;
          mObj.grossProfit += orderNet - orderCogs;
          mObj.orderCount += 1;
        }
      }

      // 3. Hàng bán bị trả lại / Đổi trả hoàn tiền (RMA Returns)
      const returnsQuery = {
        trang_thai: { $in: ["completed", "da_hoan_tien", "resolved"] },
        $or: [
          { created_at: { $gte: start, $lte: end } },
          { ngay_tao: { $gte: start, $lte: end } },
        ],
      };
      const returnDocs = returnCol ? await returnCol.find(returnsQuery).toArray() : [];
      let totalSalesReturns = 0;
      for (const ret of returnDocs) {
        totalSalesReturns += Number(ret.tong_tien_hoan || ret.so_tien_hoan || 0);
      }

      // Doanh thu thuần = Doanh thu bán hàng - Giảm giá - Hàng bán trả lại
      const netRevenue = Math.max(0, grossRevenue - totalDiscounts - totalSalesReturns);

      // Lợi nhuận gộp
      const grossProfit = Math.max(0, netRevenue - totalCogs);
      const grossMarginPct = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 1000) / 10 : 0;

      // 4. Chi phí hoạt động (OPEX) từ Sổ Quỹ & Lương
      const cashbookQuery = {
        loai_phieu: "chi",
        trang_thai: "active",
        $or: [
          { ngay_ghi_nhan: { $gte: start, $lte: end } },
          { created_at: { $gte: start, $lte: end } },
        ],
      };
      const cashExpenses = await soQuyCol.find(cashbookQuery).toArray();

      let payrollExpenses = 0;
      let shippingExpenses = 0;
      let rentAndUtilitiesExpenses = 0;
      let otherOperatingExpenses = 0;

      for (const exp of cashExpenses) {
        const hangMuc = String(exp.hang_muc || "").toLowerCase();
        const amount = Number(exp.so_tien || 0);
        const expDate = new Date(exp.ngay_ghi_nhan || exp.created_at || start);
        const mIdx = expDate.getMonth();

        // LOẠI TRỪ:
        // 1. Chi mua nguyên vật liệu (đã tính vào giá vốn khi xuất kho/sản xuất)
        // 2. Chi hoàn tiền trả hàng (đã tính vào giảm trừ doanh thu)
        if (
          hangMuc.includes("nguyên vật liệu") ||
          hangMuc.includes("nguyen lieu") ||
          hangMuc.includes("mua nvl") ||
          hangMuc.includes("hoan_tien") ||
          hangMuc.includes("trả hàng")
        ) {
          continue;
        }

        if (hangMuc.includes("lương") || hangMuc.includes("luong") || hangMuc.includes("nhân sự")) {
          payrollExpenses += amount;
        } else if (hangMuc.includes("vận chuyển") || hangMuc.includes("giao hàng") || hangMuc.includes("shipping")) {
          shippingExpenses += amount;
        } else if (
          hangMuc.includes("mặt bằng") ||
          hangMuc.includes("xưởng") ||
          hangMuc.includes("điện") ||
          hangMuc.includes("nước")
        ) {
          rentAndUtilitiesExpenses += amount;
        } else {
          otherOperatingExpenses += amount;
        }

        const mObj = monthlyDataMap.get(mIdx);
        if (mObj) {
          mObj.opex += amount;
        }
      }

      const totalOpex = payrollExpenses + shippingExpenses + rentAndUtilitiesExpenses + otherOperatingExpenses;

      // Lợi nhuận ròng (Net Profit)
      const netOperatingProfit = grossProfit - totalOpex;
      const netMarginPct = netRevenue > 0 ? Math.round((netOperatingProfit / netRevenue) * 1000) / 10 : 0;

      // Tính netProfit cho từng tháng
      const monthlyTimeline = Array.from(monthlyDataMap.values()).map((m) => ({
        ...m,
        netProfit: m.grossProfit - m.opex,
      }));

      return {
        ok: true,
        period: {
          start,
          end,
          year: start.getFullYear(),
        },
        summary: {
          grossRevenue,
          totalDiscounts,
          totalSalesReturns,
          netRevenue,
          totalCogs,
          grossProfit,
          grossMarginPct,
          opex: {
            payroll: payrollExpenses,
            shipping: shippingExpenses,
            rentAndUtilities: rentAndUtilitiesExpenses,
            other: otherOperatingExpenses,
            total: totalOpex,
          },
          netOperatingProfit,
          netMarginPct,
          totalOrders: salesOrders.length,
        },
        monthlyTimeline,
      };
    } catch (err) {
      logger.error("[FinancialReportDAO.getProfitAndLoss] Error", { error: err.message });
      return { error: err.message };
    }
  }

  /**
   * Phân tích Hiệu quả Sinh lời theo từng Sản phẩm (Product Profitability)
   */
  static async getProductProfitability({ date_from, date_to, limit = 20 } = {}) {
    try {
      const { start, end } = this._getDateRange({ date_from, date_to });

      const salesOrders = await donHangCol
        .find({
          loai_don: "sale",
          trang_thai: { $in: ["completed", "paid", "da_thanh_toan"] },
          $or: [
            { ngay_dat: { $gte: start, $lte: end } },
            { created_at: { $gte: start, $lte: end } },
          ],
        })
        .toArray();

      const productMap = new Map();

      for (const order of salesOrders) {
        if (!Array.isArray(order.san_pham)) continue;
        for (const item of order.san_pham) {
          const code = item.ma_sp || "SP-KHAC";
          const name = item.ten_sp || "Sản phẩm khác";
          const qty = Number(item.so_luong || 0);
          const revenue = Number(item.thanh_tien || 0);
          const unitCost = Number(item.gia_von || 0) || Math.round(Number(item.don_gia || 0) * 0.55);
          const totalCost = Number(item.thanh_tien_gia_von || 0) || unitCost * qty;
          const profit = revenue - totalCost;

          if (!productMap.has(code)) {
            productMap.set(code, {
              code,
              name,
              qty: 0,
              revenue: 0,
              totalCost: 0,
              grossProfit: 0,
            });
          }

          const cur = productMap.get(code);
          cur.qty += qty;
          cur.revenue += revenue;
          cur.totalCost += totalCost;
          cur.grossProfit += profit;
        }
      }

      const list = Array.from(productMap.values()).map((p) => {
        const marginPct = p.revenue > 0 ? Math.round((p.grossProfit / p.revenue) * 1000) / 10 : 0;
        let classification = "Tiềm năng";
        if (p.grossProfit > 15000000 && marginPct >= 40) classification = "Ngôi sao (Star)";
        else if (p.revenue > 30000000 && marginPct < 30) classification = "Bò sữa (Cash Cow)";
        else if (marginPct < 20) classification = "Cần cải thiện (Low Margin)";

        return {
          ...p,
          marginPct,
          classification,
        };
      });

      // Sắp xếp theo Lợi nhuận gộp giảm dần
      list.sort((a, b) => b.grossProfit - a.grossProfit);

      return {
        ok: true,
        items: list.slice(0, Number(limit) || 20),
        totalProducts: list.length,
      };
    } catch (err) {
      logger.error("[FinancialReportDAO.getProductProfitability] Error", { error: err.message });
      return { error: err.message };
    }
  }

  /**
   * Báo cáo Phân tích Tuổi Nợ (Aging Debt Analysis)
   * Phân loại: Trong hạn, 1-30 ngày, 31-60 ngày, 61-90 ngày, >90 ngày (Nợ xấu)
   */
  static async getAgingDebtReport({ type = "customer", partner_id } = {}) {
    try {
      const now = new Date();
      now.setHours(23, 59, 59, 999);

      // 1. Lấy danh sách đối tác
      const partnerFilter = { trang_thai: { $ne: "inactive" } };
      if (type === "customer") {
        partnerFilter.$or = [{ loai_doi_tac: "khach_hang" }, { loai_doi_tac: "ca_hai" }];
      } else {
        partnerFilter.$or = [{ loai_doi_tac: "nha_cung_cap" }, { loai_doi_tac: "ca_hai" }];
      }
      if (partner_id && ObjectId.isValid(partner_id)) {
        partnerFilter._id = new ObjectId(partner_id);
      }

      const partners = await doiTacCol.find(partnerFilter).toArray();
      const partnerNames = partners.map((p) => p.ten).filter(Boolean);

      // 2. Tìm tất cả đơn hàng chưa thanh toán đủ
      const orderType = type === "customer" ? "sale" : "purchase_receipt";
      const nameField = type === "customer" ? "khach_hang_ten" : "nha_cung_cap_ten";

      const orders = await donHangCol
        .find({
          loai_don: orderType,
          trang_thai: { $nin: ["draft", "cancelled", "deleted"] },
          $or: [{ [nameField]: { $in: partnerNames } }, { [`${type}.ten`]: { $in: partnerNames } }],
        })
        .toArray();

      const orderCodes = orders.map((o) => o.ma_dh).filter(Boolean);
      const receipts = orderCodes.length
        ? await soQuyCol.find({ ma_chung_tu: { $in: orderCodes }, trang_thai: "active" }).toArray()
        : [];

      const receiptSum = new Map();
      for (const r of receipts) {
        const cur = receiptSum.get(r.ma_chung_tu) || 0;
        receiptSum.set(r.ma_chung_tu, cur + Number(r.so_tien || 0));
      }

      // 3. Gom nợ theo từng đối tác và phân bổ tuổi nợ
      const agingMap = new Map();

      // Khởi tạo cho mỗi đối tác
      for (const p of partners) {
        agingMap.set(p.ten, {
          partnerId: p._id,
          code: p.ma_doi_tac,
          name: p.ten,
          phone: p.so_dien_thoai || "",
          creditLimit: Number(p.han_muc_cong_no || 0),
          paymentTerms: Number(p.han_thanh_toan_ngay || 30),
          totalDebt: 0,
          current: 0, // 0 - 30 ngày (Trong hạn)
          days_31_60: 0, // Quá hạn 31 - 60 ngày
          days_61_90: 0, // Quá hạn 61 - 90 ngày
          days_over_90: 0, // Quá hạn > 90 ngày (Nợ xấu)
          maxDaysOverdue: 0,
          unpaidOrderCount: 0,
        });
      }

      let grandTotalDebt = 0;
      let grandCurrent = 0;
      let grand31_60 = 0;
      let grand61_90 = 0;
      let grandOver90 = 0;

      for (const order of orders) {
        const pName = order[nameField] || order.khach_hang?.ten || order.nha_cung_cap?.ten;
        if (!pName || !agingMap.has(pName)) continue;

        const totalAmount = Number(order.tong_tien || 0);
        const paidAmount = receiptSum.get(order.ma_dh) || (order.trang_thai === "paid" ? totalAmount : 0);
        const remainingDebt = Math.max(0, totalAmount - paidAmount);

        if (remainingDebt <= 0) continue;

        const partnerRecord = agingMap.get(pName);
        const terms = partnerRecord.paymentTerms || 30;
        const orderDate = new Date(order.ngay_dat || order.created_at || now);

        // Ngày đáo hạn = orderDate + terms
        const dueDate = new Date(orderDate.getTime() + terms * 24 * 60 * 60 * 1000);
        const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        partnerRecord.totalDebt += remainingDebt;
        partnerRecord.unpaidOrderCount += 1;
        grandTotalDebt += remainingDebt;

        if (diffDays <= 0) {
          // Chưa quá hạn
          partnerRecord.current += remainingDebt;
          grandCurrent += remainingDebt;
        } else if (diffDays <= 30) {
          // Quá hạn 1 - 30 ngày
          partnerRecord.current += remainingDebt;
          grandCurrent += remainingDebt;
          partnerRecord.maxDaysOverdue = Math.max(partnerRecord.maxDaysOverdue, diffDays);
        } else if (diffDays <= 60) {
          partnerRecord.days_31_60 += remainingDebt;
          grand31_60 += remainingDebt;
          partnerRecord.maxDaysOverdue = Math.max(partnerRecord.maxDaysOverdue, diffDays);
        } else if (diffDays <= 90) {
          partnerRecord.days_61_90 += remainingDebt;
          grand61_90 += remainingDebt;
          partnerRecord.maxDaysOverdue = Math.max(partnerRecord.maxDaysOverdue, diffDays);
        } else {
          partnerRecord.days_over_90 += remainingDebt;
          grandOver90 += remainingDebt;
          partnerRecord.maxDaysOverdue = Math.max(partnerRecord.maxDaysOverdue, diffDays);
        }
      }

      // Lọc danh sách các đối tác có nợ phát sinh
      const items = Array.from(agingMap.values())
        .filter((p) => p.totalDebt > 0)
        .sort((a, b) => b.totalDebt - a.totalDebt);

      return {
        ok: true,
        type,
        summary: {
          totalDebt: grandTotalDebt,
          current: grandCurrent,
          days_31_60: grand31_60,
          days_61_90: grand61_90,
          days_over_90: grandOver90,
          badDebtPercentage: grandTotalDebt > 0 ? Math.round((grandOver90 / grandTotalDebt) * 1000) / 10 : 0,
          totalDebtors: items.length,
        },
        items,
      };
    } catch (err) {
      logger.error("[FinancialReportDAO.getAgingDebtReport] Error", { error: err.message });
      return { error: err.message };
    }
  }

  /**
   * Quét và tính toán lại giá vốn lịch sử cho toàn bộ các đơn hàng bán hoàn thành
   */
  static async recalculateHistoricalCOGS() {
    try {
      // Đảm bảo cập nhật BOM cost cho danh mục sản phẩm trước
      await COGSService.syncAllProductBOMCosts();

      const orders = await donHangCol
        .find({
          loai_don: "sale",
          trang_thai: { $in: ["completed", "paid", "da_thanh_toan"] },
        })
        .toArray();

      let updatedOrders = 0;

      for (const order of orders) {
        if (!Array.isArray(order.san_pham)) continue;

        let totalOrderCogs = 0;
        let modified = false;
        const newItems = [...order.san_pham];

        for (const it of newItems) {
          if (it.loai_hang === "san_pham") {
            const qty = Number(it.so_luong || 0);
            let unitCost = Number(it.gia_von || 0);

            if (unitCost <= 0) {
              const spDoc = await sanPhamCol.findOne({
                $or: [{ ma_sp: it.ma_sp }, { ten_sp: it.ten_sp }],
              });
              unitCost = Number(spDoc?.gia_von || 0) || Math.round(Number(it.don_gia || 0) * 0.55);
              it.gia_von = unitCost;
              modified = true;
            }

            const lineCogs = Math.round(unitCost * qty);
            it.thanh_tien_gia_von = lineCogs;
            it.loi_nhuan_gop = Math.round(Number(it.thanh_tien || 0) - lineCogs);
            totalOrderCogs += lineCogs;
          }
        }

        const netRev = Math.max(0, Number(order.tong_tien || 0) - Number(order.phi_vc || 0));
        const orderGrossProfit = Math.max(0, netRev - totalOrderCogs);

        await donHangCol.updateOne(
          { _id: order._id },
          {
            $set: {
              san_pham: newItems,
              tong_gia_von: totalOrderCogs,
              loi_nhuan_gop: orderGrossProfit,
              cogs_calculated_at: new Date(),
            },
          }
        );
        updatedOrders++;
      }

      logger.info(`[FinancialReportDAO] Recalculated historical COGS for ${updatedOrders} orders`);
      return { ok: true, updatedOrders };
    } catch (err) {
      logger.error("[FinancialReportDAO.recalculateHistoricalCOGS] Error", { error: err.message });
      return { error: err.message };
    }
  }

  /**
   * Dự Báo Dòng Tiền & Cảnh Báo Ngân Quỹ (Cash Flow Forecasting & Runway)
   * Dự phóng dòng tiền vào / ra 30 - 60 - 90 ngày tới
   */
  static async getCashFlowForecast({ days = 90 } = {}) {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // 1. Số dư quỹ tiền mặt hiện tại
      const cashbookAgg = await soQuyCol
        .aggregate([
          { $match: { trang_thai: "active" } },
          {
            $group: {
              _id: "$loai_phieu",
              total: { $sum: { $toDouble: { $ifNull: ["$so_tien", 0] } } },
            },
          },
        ])
        .toArray();

      let currentIn = 0;
      let currentOut = 0;
      for (const item of cashbookAgg) {
        if (item._id === "thu") currentIn = item.total;
        else if (item._id === "chi") currentOut = item.total;
      }
      const currentCashBalance = Math.max(0, currentIn - currentOut);

      // 2. Tính mức chi tiêu vận hành trung bình hàng tháng (Monthly Burn Rate) từ 90 ngày qua
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
      const pastExpenses = await soQuyCol
        .aggregate([
          {
            $match: {
              loai_phieu: "chi",
              trang_thai: "active",
              $or: [
                { ngay_ghi_nhan: { $gte: ninetyDaysAgo } },
                { created_at: { $gte: ninetyDaysAgo } },
              ],
            },
          },
          {
            $group: {
              _id: null,
              totalOpex: { $sum: { $toDouble: { $ifNull: ["$so_tien", 0] } } },
            },
          },
        ])
        .toArray();

      const totalPastOpex = pastExpenses[0]?.totalOpex || 0;
      const monthlyBurnRate = Math.round(totalPastOpex > 0 ? totalPastOpex / 3 : 45000000);
      const runwayMonths = monthlyBurnRate > 0 ? Math.round((currentCashBalance / monthlyBurnRate) * 10) / 10 : 99;

      // 3. Dự thu từ công nợ khách hàng (Receivables)
      const unpaidSales = await donHangCol
        .find({
          loai_don: "sale",
          trang_thai: { $nin: ["draft", "cancelled", "deleted"] },
          "thanh_toan.status": { $ne: "paid" },
        })
        .toArray();

      const projectedInflows = [];
      for (const order of unpaidSales) {
        const orderDate = new Date(order.ngay_dat || order.created_at || now);
        const total = Number(order.tong_tien || 0);
        const paid = Number(order.thanh_toan?.da_thanh_toan || 0);
        const remaining = Math.max(0, total - paid);
        if (remaining <= 0) continue;

        // Dự kiến thu: 30 ngày từ ngày đặt hoặc 7 ngày từ hôm nay nếu đã quá hạn
        let expectedDate = new Date(orderDate.getTime() + 30 * 86400000);
        if (expectedDate < now) {
          expectedDate = new Date(now.getTime() + 7 * 86400000); // Đốc thúc thu trong tuần tới
        }

        projectedInflows.push({
          source: "Khách hàng nợ tiền hàng",
          referenceCode: order.ma_dh,
          partnerName: order.khach_hang_ten || "Khách mua hàng",
          amount: remaining,
          dueDate: expectedDate,
        });
      }

      // 4. Dự chi công nợ nhà cung cấp (Payables)
      const unpaidPurchases = await donHangCol
        .find({
          loai_don: "purchase_receipt",
          trang_thai: { $nin: ["draft", "cancelled", "deleted"] },
          "thanh_toan.status": { $ne: "paid" },
        })
        .toArray();

      const projectedOutflows = [];
      for (const po of unpaidPurchases) {
        const poDate = new Date(po.ngay_dat || po.created_at || now);
        const total = Number(po.tong_tien || 0);
        const paid = Number(po.thanh_toan?.da_thanh_toan || 0);
        const remaining = Math.max(0, total - paid);
        if (remaining <= 0) continue;

        let expectedDate = new Date(poDate.getTime() + 30 * 86400000);
        if (expectedDate < now) {
          expectedDate = new Date(now.getTime() + 5 * 86400000);
        }

        projectedOutflows.push({
          purpose: "Thanh toán NCC vật tư",
          referenceCode: po.ma_dh,
          partnerName: po.nha_cung_cap_ten || "Nhà cung cấp",
          amount: remaining,
          dueDate: expectedDate,
        });
      }

      // Dự chi quỹ lương nhân sự định kỳ (ngày 05 hàng tháng)
      const estimatedMonthlyPayroll = Math.round(monthlyBurnRate * 0.55);
      for (let m = 1; m <= 3; m++) {
        const payDate = new Date(now.getFullYear(), now.getMonth() + m, 5);
        if (payDate > now && payDate <= new Date(now.getTime() + days * 86400000)) {
          projectedOutflows.push({
            purpose: "Dự chi quỹ lương nhân viên định kỳ",
            referenceCode: `PAYROLL-M${payDate.getMonth() + 1}`,
            partnerName: "Toàn bộ nhân sự",
            amount: estimatedMonthlyPayroll,
            dueDate: payDate,
          });
        }
      }

      // Dự chi chi phí vận hành cố định (mặt bằng, điện nước, vận chuyển)
      const estimatedOpFixed = Math.round(monthlyBurnRate * 0.45);
      for (let m = 1; m <= 3; m++) {
        const opDate = new Date(now.getFullYear(), now.getMonth() + m, 15);
        if (opDate > now && opDate <= new Date(now.getTime() + days * 86400000)) {
          projectedOutflows.push({
            purpose: "Dự chi tiền thuê mặt bằng, điện nước & logistics",
            referenceCode: `OPEX-M${opDate.getMonth() + 1}`,
            partnerName: "Ban quản lý & Nhà mạng",
            amount: estimatedOpFixed,
            dueDate: opDate,
          });
        }
      }

      // 5. Phân bổ theo 12 tuần (Timeline 90 ngày)
      const weeklyBuckets = [];
      let runningCash = currentCashBalance;
      const numWeeks = Math.ceil(days / 7);

      for (let w = 0; w < numWeeks; w++) {
        const weekStart = new Date(now.getTime() + w * 7 * 86400000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000 - 1);

        const wInflows = projectedInflows
          .filter((item) => item.dueDate >= weekStart && item.dueDate <= weekEnd)
          .reduce((sum, item) => sum + item.amount, 0);

        const wOutflows = projectedOutflows
          .filter((item) => item.dueDate >= weekStart && item.dueDate <= weekEnd)
          .reduce((sum, item) => sum + item.amount, 0);

        const openingCash = runningCash;
        const netCashflow = wInflows - wOutflows;
        runningCash = openingCash + netCashflow;

        weeklyBuckets.push({
          week: `Tuần ${w + 1}`,
          startDate: weekStart.toISOString().slice(0, 10),
          endDate: weekEnd.toISOString().slice(0, 10),
          openingCash,
          inflows: wInflows,
          outflows: wOutflows,
          netCashflow,
          closingCash: runningCash,
          isDeficit: runningCash < 0,
        });
      }

      // Đánh giá mức độ an toàn ngân quỹ
      let healthStatus = "HEALTHY";
      let healthAdvice = "Dòng tiền ổn định, ngân quỹ duy trì trên mức an toàn.";
      if (weeklyBuckets.some((wb) => wb.isDeficit)) {
        healthStatus = "DANGER";
        healthAdvice = "CẢNH BÁO: Dự phóng thâm hụt tiền mặt trong kỳ. Cần đôn đốc thu hồi nợ xấu hoặc giãn nợ NCC!";
      } else if (runwayMonths < 2) {
        healthStatus = "WARNING";
        healthAdvice = "Ngân quỹ dự trữ mỏng (< 2 tháng hoạt động). Khuyến nghị siết chặt chi phí cố định.";
      }

      return {
        ok: true,
        currentCashBalance,
        monthlyBurnRate,
        runwayMonths,
        healthStatus,
        healthAdvice,
        totalProjectedInflow: projectedInflows.reduce((s, i) => s + i.amount, 0),
        totalProjectedOutflow: projectedOutflows.reduce((s, i) => s + i.amount, 0),
        weeklyBuckets,
        topReceivables: projectedInflows.sort((a, b) => b.amount - a.amount).slice(0, 10),
        topPayables: projectedOutflows.sort((a, b) => b.amount - a.amount).slice(0, 10),
      };
    } catch (err) {
      logger.error("[FinancialReportDAO.getCashFlowForecast] Error", { error: err.message });
      return { error: err.message };
    }
  }

  /**
   * Đối Soát Sao Kê Ngân Hàng Tự Động (Bank Reconciliation)
   * So khớp danh sách giao dịch sao kê với Sổ Quỹ SME
   */
  static async reconcileBankStatement({ transactions = [] } = {}) {
    try {
      if (!Array.isArray(transactions) || transactions.length === 0) {
        return { ok: false, message: "Danh sách giao dịch sao kê trống" };
      }

      const matched = [];
      const unmatchedBank = [];

      for (const tx of transactions) {
        const amount = Math.abs(Number(tx.amount || tx.so_tien || 0));
        const type = tx.type === "OUT" || Number(tx.amount || 0) < 0 ? "chi" : "thu";
        const content = String(tx.content || tx.description || "").trim();

        // Tìm trong sổ quỹ có phiếu cùng loại và số tiền tương đương
        const found = await soQuyCol.findOne({
          loai_phieu: type,
          so_tien: amount,
          trang_thai: "active",
        });

        if (found) {
          matched.push({
            bankTx: tx,
            ledgerEntry: {
              ma_phieu: found.ma_phieu,
              ngay_ghi_nhan: found.ngay_ghi_nhan,
              so_tien: found.so_tien,
              loai_phieu: found.loai_phieu,
              ly_do: found.ly_do,
            },
            status: "MATCHED",
          });
        } else {
          unmatchedBank.push({
            bankTx: tx,
            status: "UNMATCHED_IN_LEDGER",
            suggestedAction: `Cần lập ${type === "thu" ? "Phiếu Thu" : "Phiếu Chi"} số tiền ${amount.toLocaleString("vi-VN")} đ`,
          });
        }
      }

      return {
        ok: true,
        totalChecked: transactions.length,
        matchedCount: matched.length,
        unmatchedCount: unmatchedBank.length,
        matchedRate: Math.round((matched.length / transactions.length) * 100),
        matched,
        unmatchedBank,
      };
    } catch (err) {
      logger.error("[FinancialReportDAO.reconcileBankStatement] Error", { error: err.message });
      return { error: err.message };
    }
  }
}

