import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeKpiPayrollRow } from "../utils/payrollCalculator.js";
import { computeAuditDiff, inferAuditSeverity } from "../utils/auditDiff.js";
import { computeAtpEstimate, computeSupplierScorecard } from "../utils/planningEngine.js";
import { detectAgenticIntent, parseInvoiceTextOrLines } from "../utils/aiAgentParser.js";
import {
  DEFAULT_AUTOMATION_CONFIG,
  mergeAutomationConfig,
  toPublicAutomationConfig,
  resolveTargetChannels,
  shouldDailyJobRunNow,
} from "../utils/automationConfig.js";

describe("Phase 1: KPI Payroll & Visual Diff Audit Log", () => {
  it("computes sales commission (2%), production piece-rate, and late penalties", () => {
    const row = computeKpiPayrollRow({
      ma_nv: "NV01",
      nv: { ho_ten: "Nguyễn Văn A", chuc_vu: { heSoluong: 5 } },
      thang: 11,
      nam: 2026,
      so_ngay_cong: 20,
      tong_gio_lam: 160,
      so_ngay_di_tre: 2,
      doanh_so_ban_hang: 100_000_000,
      san_luong_sx: 10,
      thuong_khac: 200_000,
      phat_khac: 50_000,
    });

    assert.equal(row.luong_co_ban, 5_000_000);
    assert.equal(row.luong_theo_cong, 5_000_000);
    assert.equal(row.hoa_hong_kd, 2_000_000); // 2% of 100M
    assert.equal(row.thuong_nang_suat_sx, 500_000); // 10 * 50k
    assert.equal(row.khau_tru_di_tre, 100_000); // 2 * 50k
    assert.equal(row.thuong, 2_700_000);
    assert.equal(row.phat, 150_000);
    assert.equal(row.luong_thuc_nhan, 7_550_000);
  });

  it("computes field-level before/after diff and infers audit severity", () => {
    const diff = computeAuditDiff(
      { gia_ban: 1_000_000, role: "sales_staff", active: true },
      { gia_ban: 1_200_000, role: "sales_manager", active: true }
    );
    assert.equal(diff.fields.length, 2);
    assert.deepEqual(diff.fields[0], { field: "gia_ban", before: 1_000_000, after: 1_200_000 });
    assert.equal(inferAuditSeverity("ROLE_CHANGE", "users"), "critical");
    assert.equal(inferAuditSeverity("UPDATE", "san_pham"), "warning");
    assert.equal(inferAuditSeverity("VIEW", "dashboard"), "info");
  });
});

describe("Phase 2: ATP Delivery Estimator & Supplier Scorecard", () => {
  it("estimates 1 day when stock is sufficient and adds production + material lead time when short", () => {
    const productMap = new Map([
      ["sp1", { _id: "sp1", ten_sp: "Bàn MDF", so_luong: 50 }],
      ["sp2", { _id: "sp2", ten_sp: "Tủ hồ sơ", so_luong: 2 }],
    ]);
    const bomMap = new Map([
      ["sp2", { san_pham_id: "sp2", nguyen_lieu: [{ nguyen_lieu_id: "nl1", so_luong: 3 }] }],
    ]);
    const materialMap = new Map([
      ["nl1", { _id: "nl1", ten_nl: "Gỗ MDF", so_luong: 5 }],
    ]);

    const atpOk = computeAtpEstimate({
      items: [{ san_pham_id: "sp1", so_luong: 10 }],
      productMap,
      bomMap,
      materialMap,
      now: new Date("2026-11-01T00:00:00Z"),
    });
    assert.equal(atpOk.canFulfillImmediately, true);
    assert.equal(atpOk.estimatedDays, 1);

    const atpShort = computeAtpEstimate({
      items: [{ san_pham_id: "sp2", so_luong: 10 }], // thiếu 8 cái => cần 24 gỗ, chỉ có 5 => thiếu 19
      productMap,
      bomMap,
      materialMap,
      activeProductionCount: 3,
      now: new Date("2026-11-01T00:00:00Z"),
    });
    assert.equal(atpShort.canFulfillImmediately, false);
    assert.equal(atpShort.needsMaterialPurchase, true);
    assert.equal(atpShort.items[0].nvl_thieu[0].thieu, 19);
    assert.ok(atpShort.estimatedDays >= 7);
  });

  it("scores suppliers based on completion rate, on-time delivery, and volume", () => {
    const suppliers = [
      { _id: "s1", ten_doi_tac: "NCC Gỗ An Cường" },
      { _id: "s2", ten_doi_tac: "NCC Mới" },
    ];
    const pos = [
      { doi_tac_id: "s1", trang_thai: "completed", tong_tien: 50_000_000 },
      { doi_tac_id: "s1", trang_thai: "completed", tong_tien: 30_000_000 },
      { doi_tac_id: "s2", trang_thai: "cancelled", tong_tien: 10_000_000 },
    ];
    const ranked = computeSupplierScorecard(suppliers, pos);
    assert.equal(ranked[0].ten_doi_tac, "NCC Gỗ An Cường");
    assert.ok(ranked[0].score > ranked[1].score);
    assert.equal(ranked[0].grade, "S");
  });
});

describe("Phase 3: Agentic AI Intent & Invoice OCR Parser", () => {
  it("detects CREATE_MRP_PO intent from Vietnamese chat commands", () => {
    const intent = detectAgenticIntent("Hãy tạo đơn mua tự động cho vật tư thiếu MRP");
    assert.ok(intent);
    assert.equal(intent.type, "CREATE_MRP_PO");
    assert.equal(intent.endpoint, "/planning/mrp/tao-don-mua");
  });

  it("parses invoice text lines and matches catalog items", () => {
    const catalog = [
      { _id: "nl1", ma_nl: "MDF17", ten_nl: "Gỗ MDF 17mm", gia_nhap: 450_000 },
      { _id: "nl2", ma_nl: "SONPU", ten_nl: "Sơn PU trắng", gia_nhap: 120_000 },
    ];
    const raw = `
      1. Gỗ MDF 17mm | 20 | 460000
      2. Sơn PU trắng - SL: 10 - Giá: 120.000
    `;
    const parsed = parseInvoiceTextOrLines(raw, catalog);
    assert.equal(parsed.total_items, 2);
    assert.equal(parsed.items[0].matched_code, "MDF17");
    assert.equal(parsed.items[0].so_luong, 20);
    assert.equal(parsed.items[0].don_gia, 460_000);
    assert.equal(parsed.items[1].matched_code, "SONPU");
    assert.equal(parsed.total_amount, 20 * 460_000 + 10 * 120_000);
  });
});

describe("Phase 4: Multi-Channel (Telegram & Zalo) Automation Config & Scheduler", () => {
  it("preserves masked tokens on Admin update and exposes public safe config", () => {
    const existing = structuredClone(DEFAULT_AUTOMATION_CONFIG);
    existing.channels.telegram = {
      enabled: true,
      bot_token: "123456789:SECRET_TELEGRAM_TOKEN",
      chat_id: "-100999",
    };
    existing.channels.zalo = {
      enabled: true,
      mode: "oa_api",
      oa_access_token: "ZALO_SECRET_TOKEN_XYZ",
      recipient_id: "u12345",
      template_id: "",
      webhook_url: "",
    };

    const merged = mergeAutomationConfig(existing, {
      channels: {
        telegram: { enabled: true, bot_token: "1234****OKEN", chat_id: "-100888" },
        zalo: { enabled: true, mode: "webhook", webhook_url: "https://hook.test/zalo" },
      },
      jobs: {
        morning_briefing: { enabled: true, time: "08:15", channel: "zalo" },
      },
    });

    assert.equal(merged.channels.telegram.bot_token, "123456789:SECRET_TELEGRAM_TOKEN");
    assert.equal(merged.channels.telegram.chat_id, "-100888");
    assert.equal(merged.channels.zalo.mode, "webhook");
    assert.equal(merged.jobs.morning_briefing.time, "08:15");
    assert.equal(merged.jobs.morning_briefing.channel, "zalo");

    const pub = toPublicAutomationConfig(merged);
    assert.equal(pub.channels.telegram.has_token, true);
    assert.ok(pub.channels.telegram.masked_token.includes("****"));
  });

  it("resolves active target channels and evaluates daily cron schedule", () => {
    const channels = {
      telegram: { enabled: true },
      zalo: { enabled: false },
    };
    assert.deepEqual(resolveTargetChannels("both", channels), ["telegram"]);
    assert.deepEqual(resolveTargetChannels("zalo", channels), []);

    channels.zalo.enabled = true;
    assert.deepEqual(resolveTargetChannels("both", channels), ["telegram", "zalo"]);

    const morningNow = new Date(2026, 10, 13, 7, 35, 0);
    assert.equal(shouldDailyJobRunNow("07:30", morningNow, null), true);
    assert.equal(shouldDailyJobRunNow("07:30", morningNow, "2026-11-13"), false);
    assert.equal(shouldDailyJobRunNow("08:00", morningNow, null), false);
  });
});
