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

      const [ordersCount, pendingOrders, pendingAdjustments, cashEntries] = await Promise.all([
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
        db.collection("so_quy").find({ trang_thai: "active" }).project({ loai_phieu: 1, so_tien: 1 }).toArray(),
      ]);
      const pendingApprovals = pendingOrders + pendingAdjustments;

      const cashBalance = cashEntries.reduce(
        (sum, e) => sum + (e.loai_phieu === "thu" ? Number(e.so_tien || 0) : -Number(e.so_tien || 0)),
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
      const [overdueContracts, unpaidOrders] = await Promise.all([
        db
          .collection("hop_dong")
          .find({
            trang_thai: { $nin: ["completed", "cancelled", "deleted"] },
            "dot_thanh_toan.trang_thai": "pending",
          })
          .limit(10)
          .toArray(),
        db
          .collection("don_hang")
          .find({
            loai_don: "sale",
            trang_thai: { $nin: ["cancelled", "deleted"] },
            "thanh_toan.status": { $in: ["unpaid", "partial"] },
          })
          .limit(10)
          .toArray(),
      ]);

      title = "Cảnh Báo Công Nợ & Hợp Đồng B2B Quá Hạn";
      summary = `${overdueContracts.length} hợp đồng còn đợt chờ thu · ${unpaidOrders.length} đơn hàng chưa thu đủ`;

      if (trigger === "cron" && overdueContracts.length === 0 && unpaidOrders.length === 0) {
        return { ok: true, skipped: true, summary: "Không có công nợ quá hạn" };
      }

      message =
        `💳 <b>[CẢNH BÁO CÔNG NỢ & HỢP ĐỒNG]</b>\n` +
        `📄 Hợp đồng B2B còn đợt thanh toán chờ thu: <b>${overdueContracts.length}</b>\n` +
        `🧾 Đơn bán hàng chưa thu đủ tiền: <b>${unpaidOrders.length}</b>\n` +
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
    for (const dailyKey of ["morning_briefing", "overdue_debt_contract_alert"]) {
      const j = jobs[dailyKey];
      if (!j?.enabled) continue;
      if (shouldDailyJobRunNow(j.time, now, lastRunDateMap.get(dailyKey))) {
        lastRunDateMap.set(dailyKey, curDateKey);
        await runAutomationJob(dailyKey, "cron");
      }
    }

    // Interval jobs (minutes)
    for (const intKey of ["low_stock_fefo_alert", "production_bottleneck_alert"]) {
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
