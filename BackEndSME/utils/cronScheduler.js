/**
 * Background Cron Scheduler & Proactive Enterprise Alerts
 * Hỗ trợ cấu hình động bởi Admin qua MongoDB (ai_settings: automation_config)
 * và gửi đa kênh qua Telegram / Zalo / In-App Notification.
 */

import logger from "./logger.js";
import { getDB } from "../config/database.js";
import { BotNotifierService } from "../services/botNotifierService.js";
import { shouldDailyJobRunNow } from "./automationConfig.js";
import { notifyAdmin, notifyApprover } from "./socketManager.js";
import { planAutoReorderBatches } from "./reorderEngine.js";
import { detectEnterpriseAnomalies } from "./anomalyEngine.js";
import { PlanningDAO } from "../models/planningDAO.js";

let tickTimer = null;
const lastRunDateMap = new Map(); // jobName -> "YYYY-MM-DD"
const lastIntervalRunMap = new Map(); // jobName -> epochMs

function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function saveAutomationLog({ jobKey, trigger, title, summary, dispatchResult, error = null }) {
  try {
    const db = getDB();
    if (!db) return;
    await db.collection("automation_logs").insertOne({
      job_key: jobKey,
      trigger, // "cron" | "manual"
      title,
      summary,
      targets: dispatchResult?.targets || [],
      channel_results: dispatchResult?.results || {},
      status: error ? "error" : "success",
      error: error || null,
      created_at: new Date(),
    });
  } catch (err) {
    logger.warn("[CronScheduler] saveAutomationLog failed", { error: err.message });
  }
}

export async function runAutomationJob(jobKey, trigger = "manual") {
  const db = getDB();
  if (!db) {
    return { ok: false, error: "Database chưa sẵn sàng" };
  }

  const config = await BotNotifierService.getAutomationConfig();
  const jobCfg = config.jobs?.[jobKey] || {};
  const jobChannel = jobCfg.channel || "both";

  try {
    let title = "";
    let message = "";
    let summary = "";

    if (jobKey === "morning_briefing") {
      const startOfYesterday = new Date();
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      startOfYesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(startOfYesterday);
      endOfYesterday.setDate(endOfYesterday.getDate() + 1);

      const [ordersCount, pendingOrders, pendingAdjustments, cashAgg] = await Promise.all([
        db.collection("don_hang").countDocuments({
          loai_don: "sale",
          trang_thai: { $in: ["completed", "paid"] },
          $or: [
            { ngay_dat: { $gte: startOfYesterday, $lt: endOfYesterday } },
            { created_at: { $gte: startOfYesterday, $lt: endOfYesterday } },
          ],
        }),
        db.collection("don_hang").countDocuments({ trang_thai: "draft" }),
        db.collection("dieu_chinh_kho").countDocuments({ trang_thai: "pending" }),
        db
          .collection("so_quy")
          .aggregate([
            { $match: { trang_thai: "active" } },
            {
              $group: {
                _id: "$loai_phieu",
                total: { $sum: { $ifNull: ["$so_tien", 0] } },
              },
            },
          ])
          .toArray(),
      ]);
      const pendingApprovals = pendingOrders + pendingAdjustments;

      const cashBalance = cashAgg.reduce(
        (sum, row) => sum + (row._id === "thu" ? Number(row.total || 0) : -Number(row.total || 0)),
        0
      );

      title = "Báo Cáo Điều Hành Buổi Sáng";
      summary = `${ordersCount} đơn bán hôm qua · ${pendingApprovals} chứng từ chờ duyệt · Tồn quỹ: ${cashBalance.toLocaleString("vi-VN")} đ`;
      message =
        `☀️ <b>[BÁO CÁO ĐIỀU HÀNH BUỔI SÁNG]</b>\n` +
        `📦 Đơn hàng hoàn thành hôm qua: <b>${ordersCount} đơn</b>\n` +
        `⏳ Chứng từ đang chờ phê duyệt: <b>${pendingApprovals}</b>\n` +
        `💰 Số dư sổ quỹ hiện tại: <b>${cashBalance.toLocaleString("vi-VN")} đ</b>\n` +
        `🚀 Chúc Ban Giám Đốc một ngày làm việc hiệu quả!`;
    } else if (jobKey === "low_stock_fefo_alert") {
      const fefoDays = Number(jobCfg.fefo_days_threshold || 15);
      const cutoffDate = new Date(Date.now() + fefoDays * 86_400_000);

      const [lowMaterials, lowProducts, expiringBatches] = await Promise.all([
        db
          .collection("nguyen_lieu")
          .find({
            trang_thai: { $ne: "deleted" },
            $expr: { $lte: [{ $ifNull: ["$so_luong", 0] }, { $ifNull: ["$ton_toi_thieu", 10] }] },
          })
          .limit(10)
          .toArray(),
        db
          .collection("san_pham")
          .find({
            trang_thai: { $ne: "deleted" },
            $expr: { $lte: [{ $ifNull: ["$so_luong", 0] }, { $ifNull: ["$ton_toi_thieu", 5] }] },
          })
          .limit(10)
          .toArray(),
        db
          .collection("lo_san_xuat")
          .find({
            trang_thai: "active",
            so_luong_ton: { $gt: 0 },
            han_su_dung: { $lte: cutoffDate, $gte: new Date() },
          })
          .limit(10)
          .toArray(),
      ]);

      title = "Cảnh Báo Tồn Kho & Lô FEFO Sắp Hết Hạn";
      summary = `${lowMaterials.length} NVL thấp · ${lowProducts.length} SP thấp · ${expiringBatches.length} lô sắp hết hạn <= ${fefoDays} ngày`;

      if (trigger === "cron" && lowMaterials.length === 0 && lowProducts.length === 0 && expiringBatches.length === 0) {
        return { ok: true, skipped: true, summary: "Tồn kho và hạn sử dụng an toàn" };
      }

      message =
        `⚠️ <b>[CẢNH BÁO TỒN KHO & FEFO]</b>\n` +
        `🔻 Nguyên vật liệu dưới mức tối thiểu: <b>${lowMaterials.length}</b>\n` +
        `📦 Thành phẩm dưới mức tối thiểu: <b>${lowProducts.length}</b>\n` +
        `⏳ Lô hàng sắp hết hạn (≤ ${fefoDays} ngày): <b>${expiringBatches.length}</b>\n` +
        `👉 Vui lòng kiểm tra phân hệ Kho & Hoạch định MRP.`;
    } else if (jobKey === "overdue_debt_contract_alert") {
      const now = new Date();
      const defaultOverdueCutoff = new Date(now.getTime() - 30 * 86_400_000);

      const [activeContracts, unpaidOrders, partners] = await Promise.all([
        db
          .collection("hop_dong")
          .find({
            trang_thai: { $nin: ["completed", "cancelled", "deleted"] },
            "dot_thanh_toan.trang_thai": "pending",
          })
          .project({ ma_hop_dong: 1, partner_name: 1, ngay_het_han: 1, ngay_ky: 1, dot_thanh_toan: 1 })
          .toArray(),
        db
          .collection("don_hang")
          .find({
            loai_don: "sale",
            trang_thai: { $nin: ["draft", "cancelled", "deleted"] },
            "thanh_toan.status": { $in: ["unpaid", "partial"] },
          })
          .project({
            ma_dh: 1,
            khach_hang_ten: 1,
            doi_tac_id: 1,
            ngay_dat: 1,
            created_at: 1,
            tong_tien: 1,
            thanh_toan: 1,
          })
          .toArray(),
        db
          .collection("doi_tac")
          .find({ trang_thai: { $ne: "deleted" } })
          .project({ _id: 1, ten: 1, han_thanh_toan_ngay: 1 })
          .toArray(),
      ]);

      // Map kỳ hạn thanh toán thực tế theo đối tác (mặc định 30 ngày)
      const paymentTermsById = new Map();
      const paymentTermsByName = new Map();
      for (const p of partners) {
        const termDays = Math.max(1, Number(p.han_thanh_toan_ngay || 30));
        if (p._id) paymentTermsById.set(String(p._id), termDays);
        if (p.ten) paymentTermsByName.set(String(p.ten).trim().toLowerCase(), termDays);
      }

      // Lọc hợp đồng có đợt thanh toán thực sự quá hạn (han_thanh_toan < now hoặc HĐ đã hết hạn)
      const overdueContracts = activeContracts.filter((c) => {
        const contractExpired = c.ngay_het_han && new Date(c.ngay_het_han) < now;
        const hasOverdueMilestone = (c.dot_thanh_toan || []).some((m) => {
          if (m.trang_thai !== "pending") return false;
          if (m.han_thanh_toan) return new Date(m.han_thanh_toan) < now;
          return contractExpired;
        });
        return hasOverdueMilestone;
      });

      // Lọc đơn bán quá hạn thanh toán theo kỳ hạn thực tế của từng khách hàng
      const overdueOrders = unpaidOrders.filter((o) => {
        const remaining = Math.max(0, Number(o.tong_tien || 0) - Number(o.thanh_toan?.da_thanh_toan || 0));
        if (remaining <= 0) return false;
        const orderDate = new Date(o.ngay_dat || o.created_at || now);
        const termDays =
          paymentTermsById.get(String(o.doi_tac_id || "")) ||
          paymentTermsByName.get(String(o.khach_hang_ten || "").trim().toLowerCase()) ||
          30;
        const dueDate = new Date(orderDate.getTime() + termDays * 86_400_000);
        return dueDate < now || orderDate < defaultOverdueCutoff && termDays <= 30;
      });

      title = "Cảnh Báo Công Nợ & Hợp Đồng B2B Quá Hạn";
      summary = `${overdueContracts.length} hợp đồng quá hạn đợt thu · ${overdueOrders.length} đơn hàng quá hạn thanh toán`;

      if (trigger === "cron" && overdueContracts.length === 0 && overdueOrders.length === 0) {
        return { ok: true, skipped: true, summary: "Không có công nợ hoặc hợp đồng quá hạn" };
      }

      message =
        `💳 <b>[CẢNH BÁO CÔNG NỢ & HỢP ĐỒNG QUÁ HẠN]</b>\n` +
        `📄 Hợp đồng B2B quá hạn đợt thanh toán: <b>${overdueContracts.length}</b>\n` +
        `🧾 Đơn bán hàng quá hạn thanh toán: <b>${overdueOrders.length}</b>\n` +
        `👉 Bộ phận Kế toán & Kinh doanh vui lòng đôn đốc thu hồi công nợ.`;
    } else if (jobKey === "production_bottleneck_alert") {
      const thresholdHours = Number(jobCfg.threshold_hours || 48);
      const cutoff = new Date(Date.now() - thresholdHours * 3600_000);

      const stuckOrders = await db
        .collection("don_hang")
        .find({
          loai_don: { $in: ["prod_receipt", "production_receipt"] },
          trang_thai: { $nin: ["completed", "cancelled", "deleted"] },
          updated_at: { $lt: cutoff },
        })
        .limit(10)
        .toArray();

      title = "Cảnh Báo Nghẽn Cổ Chai Sản Xuất";
      summary = `${stuckOrders.length} lệnh sản xuất chậm tiến độ > ${thresholdHours}h`;

      if (trigger === "cron" && stuckOrders.length === 0) {
        return { ok: true, skipped: true, summary: "Xưởng sản xuất vận hành bình thường" };
      }

      message =
        `🏭 <b>[CẢNH BÁO NGHẼN SẢN XUẤT]</b>\n` +
        `⏱️ Số lệnh sản xuất chưa chuyển công đoạn quá <b>${thresholdHours} giờ</b>: <b>${stuckOrders.length}</b>\n` +
        (stuckOrders.length > 0
          ? `📌 Mã lệnh tiêu biểu: ${stuckOrders.slice(0, 3).map((o) => o.ma_dh || o._id).join(", ")}\n`
          : "") +
        `👉 Quản đốc xưởng vui lòng kiểm tra bảng Kanban sản xuất.`;
    } else if (jobKey === "auto_reorder") {
      const [materials, pendingPurchaseOrders, recentPurchaseOrders] = await Promise.all([
        db
          .collection("nguyen_lieu")
          .find({ trang_thai: { $nin: ["deleted", "inactive"] } })
          .toArray(),
        db
          .collection("don_hang")
          .find({
            loai_don: "purchase_receipt",
            trang_thai: { $in: ["draft", "pending", "cho_duyet", "confirmed", "paid", "approved", "ordered"] },
          })
          .project({ trang_thai: 1, san_pham: 1 })
          .toArray(),
        db
          .collection("don_hang")
          .find({
            loai_don: "purchase_receipt",
            trang_thai: { $nin: ["cancelled", "deleted"] },
          })
          .sort({ created_at: -1, _id: -1 })
          .limit(100)
          .project({ nha_cung_cap_ten: 1, nha_cung_cap: 1, san_pham: 1, created_at: 1, ngay_dat: 1 })
          .toArray(),
      ]);

      const plan = planAutoReorderBatches({
        materials,
        pendingPurchaseOrders,
        recentPurchaseOrders,
      });

      if (plan.batches.length === 0) {
        const noNeedMsg =
          plan.skippedDuplicateCount > 0
            ? `Đã có đơn mua chờ duyệt cho ${plan.skippedDuplicateCount} vật tư tồn thấp — không tạo trùng`
            : "Tất cả vật tư đang ở mức an toàn, không cần tạo đơn mua nháp";
        if (trigger === "cron") {
          return { ok: true, skipped: true, summary: noNeedMsg };
        }
        title = "Tự Động Tạo Đơn Mua Nháp (Auto-Reorder)";
        summary = noNeedMsg;
        message = `📦 <b>[AUTO-REORDER]</b>\n${noNeedMsg}`;
      } else {
        const createdPOs = [];
        for (const batch of plan.batches) {
          // eslint-disable-next-line no-await-in-loop
          const created = await PlanningDAO.taoDonMuaTuMRP({
            items: batch.items,
            nha_cung_cap_ten: batch.nha_cung_cap_ten,
            ghi_chu: `Đơn mua nháp tạo tự động (Auto-Reorder) cho ${batch.items.length} vật tư chạm điểm đặt hàng`,
            user: { ho_ten: "Auto-Reorder Scheduler" },
          });
          if (created?.ma_dh) createdPOs.push(created);
        }

        title = "Tạo Đơn Mua Nháp Tự Động (Auto-Reorder)";
        summary = `Đã tạo ${createdPOs.length} đơn mua nháp (${plan.totalItems} vật tư) chờ duyệt tại /approvals`;
        message =
          `🛒 <b>[AUTO-REORDER: ĐƠN MUA NHÁP CHỜ DUYỆT]</b>\n` +
          `📄 Số đơn mua nháp vừa tạo: <b>${createdPOs.length}</b> (${plan.totalItems} mặt hàng)\n` +
          `🏷️ Mã đơn: <b>${createdPOs.map((c) => c.ma_dh).join(", ")}</b>\n` +
          `👉 Vui lòng vào <b>Trung tâm Phê duyệt (/approvals)</b> để kiểm tra và duyệt đặt hàng.`;
      }
    } else if (jobKey === "anomaly_detection") {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
      const last48h = new Date(now.getTime() - 48 * 3600_000);

      const [dailySalesAgg, recentSalesOrders, baselineExpenses, recentExpenses, productionOrders] =
        await Promise.all([
          db
            .collection("don_hang")
            .aggregate([
              {
                $match: {
                  loai_don: "sale",
                  trang_thai: { $nin: ["draft", "cancelled", "deleted"] },
                  created_at: { $gte: thirtyDaysAgo },
                },
              },
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                  total: { $sum: { $ifNull: ["$tong_tien", 0] } },
                },
              },
              { $sort: { _id: 1 } },
            ])
            .toArray(),
          db
            .collection("don_hang")
            .find({
              loai_don: "sale",
              trang_thai: { $nin: ["cancelled", "deleted"] },
              created_at: { $gte: last48h },
              giam_gia: { $gt: 0 },
            })
            .project({ ma_dh: 1, tam_tinh: 1, tong_tien: 1, giam_gia: 1 })
            .toArray(),
          db
            .collection("so_quy")
            .find({
              loai_phieu: "chi",
              trang_thai: "active",
              created_at: { $gte: thirtyDaysAgo, $lt: last48h },
            })
            .project({ so_tien: 1, hang_muc: 1 })
            .toArray(),
          db
            .collection("so_quy")
            .find({
              loai_phieu: "chi",
              trang_thai: "active",
              created_at: { $gte: last48h },
            })
            .project({ ma_phieu: 1, so_tien: 1, hang_muc: 1 })
            .toArray(),
          db
            .collection("don_hang")
            .find({
              loai_don: { $in: ["prod_receipt", "production_receipt"] },
              trang_thai: { $nin: ["cancelled", "deleted"] },
              updated_at: { $gte: last48h },
            })
            .project({ ma_dh: 1, so_luong_san_xuat: 1, tong_so_luong: 1, so_luong_phe_pham: 1, tong_phe_pham: 1 })
            .toArray(),
        ]);

      const report = detectEnterpriseAnomalies({
        dailyRevenueSeries: dailySalesAgg.map((d) => Number(d.total || 0)),
        recentSalesOrders,
        baselineExpenses,
        recentExpenses,
        productionOrders,
        thresholds: {
          revenueDropPct: Number(jobCfg.revenue_drop_pct || 40),
          discountAlertPct: Number(jobCfg.discount_alert_pct || 25),
          scrapRateAlertPct: Number(jobCfg.scrap_rate_alert_pct || 10),
        },
      });

      if (!report.hasAnomalies) {
        if (trigger === "cron") {
          return { ok: true, skipped: true, summary: "Không phát hiện bất thường vận hành nào" };
        }
        title = "Giám Sát Bất Thường Hệ Thống (Anomaly Detection)";
        summary = "Các chỉ số doanh thu, chiết khấu, QC và OPEX đang trong ngưỡng an toàn";
        message = `🛡️ <b>[GIÁM SÁT BẤT THƯỜNG]</b>\n✅ Không phát hiện dấu hiệu bất thường trong 48h qua.`;
      } else {
        title = `Phát Hiện ${report.totalAnomalies} Bất Thường Vận Hành`;
        summary = `${report.criticalCount} nghiêm trọng · ${report.warningCount} cảnh báo: ${report.anomalies
          .slice(0, 2)
          .map((a) => a.title)
          .join("; ")}`;
        const lines = report.anomalies
          .slice(0, 5)
          .map((a) => `${a.severity === "critical" ? "🔴" : "🟠"} <b>${a.title}</b>: ${a.detail}`)
          .join("\n");
        message =
          `🚨 <b>[PHÁT HIỆN BẤT THƯỜNG DOANH NGHIỆP]</b>\n` +
          `${lines}\n` +
          `👉 Vui lòng kiểm tra Dashboard Tài chính & Nhật ký hệ thống.`;
      }
    } else {
      return { ok: false, error: `Tác vụ không hợp lệ: ${jobKey}` };
    }

    // 1. Gửi đa kênh (Telegram / Zalo / Both) theo cấu hình Admin
    const dispatchResult = await BotNotifierService.dispatchMultiChannelAlert({
      title,
      message,
      jobChannel,
      config,
    });

    // 2. Phát realtime Socket notification trong app
    try {
      const socketPayload = {
        tieu_de: title,
        noi_dung: summary,
        loai: "automation_alert",
      };
      notifyAdmin(socketPayload);
      notifyApprover(socketPayload);
    } catch {
      // socket optional
    }

    await saveAutomationLog({ jobKey, trigger, title, summary, dispatchResult });

    return {
      ok: true,
      jobKey,
      title,
      summary,
      targets: dispatchResult.targets,
      results: dispatchResult.results,
    };
  } catch (err) {
    logger.error(`[CronScheduler] runAutomationJob(${jobKey}) failed`, { error: err.message });
    await saveAutomationLog({
      jobKey,
      trigger,
      title: jobKey,
      summary: "Lỗi thực thi tác vụ tự động",
      dispatchResult: null,
      error: err.message,
    });
    return { ok: false, error: err.message };
  }
}

async function schedulerTick() {
  try {
    const config = await BotNotifierService.getAutomationConfig();
    const jobs = config.jobs || {};
    const now = new Date();
    const curDateKey = todayKey(now);

    // Daily jobs ("HH:mm")
    for (const dailyKey of ["morning_briefing", "overdue_debt_contract_alert", "auto_reorder"]) {
      const j = jobs[dailyKey];
      if (!j?.enabled) continue;
      if (shouldDailyJobRunNow(j.time, now, lastRunDateMap.get(dailyKey))) {
        lastRunDateMap.set(dailyKey, curDateKey);
        await runAutomationJob(dailyKey, "cron");
      }
    }

    // Interval jobs (minutes)
    for (const intKey of ["low_stock_fefo_alert", "production_bottleneck_alert", "anomaly_detection"]) {
      const j = jobs[intKey];
      if (!j?.enabled) continue;
      const intervalMs = Math.max(15, Number(j.interval_minutes || 120)) * 60_000;
      const prevMs = lastIntervalRunMap.get(intKey) || 0;
      if (now.getTime() - prevMs >= intervalMs) {
        lastIntervalRunMap.set(intKey, now.getTime());
        await runAutomationJob(intKey, "cron");
      }
    }
  } catch (err) {
    logger.warn("[CronScheduler] schedulerTick error", { error: err.message });
  }
}

export function startCronScheduler() {
  if (tickTimer) return;
  // Kiểm tra mỗi 60 giây
  tickTimer = setInterval(schedulerTick, 60_000);
  if (typeof tickTimer.unref === "function") tickTimer.unref();
  logger.info("Background Cron Scheduler started (interval: 60s, Admin-configurable Telegram/Zalo)");
}

export function getCronSchedulerStatus() {
  return {
    running: Boolean(tickTimer),
    lastDailyRuns: Object.fromEntries(lastRunDateMap.entries()),
    lastIntervalRuns: Object.fromEntries(lastIntervalRunMap.entries()),
  };
}
