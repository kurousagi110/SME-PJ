import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeChatHistory,
  getAllowedAiTools,
  parseStructuredOcrJson,
  parseInvoiceTextOrLines,
} from "../utils/aiAgentParser.js";
import {
  computeDemandForecast,
  computeMaterialLeadTimeMap,
  computeAtpEstimate,
} from "../utils/planningEngine.js";
import { computeDynamicSafetyStock, computeReorderQty } from "../utils/reorderEngine.js";

describe("Phase 3: AI Copilot v2 (History, RBAC Tools & Fuzzy OCR)", () => {
  it("sanitizes multi-turn chat history, normalizing roles and capping length", () => {
    const raw = [
      { sender: "user", text: "Doanh thu tháng này?" },
      { sender: "ai", text: "Đạt 120 triệu." },
      { role: "invalid", content: "ignored" },
      { role: "user", content: "A".repeat(1500) },
    ];
    const clean = sanitizeChatHistory(raw, 10, 100);
    assert.equal(clean.length, 3);
    assert.equal(clean[0].role, "user");
    assert.equal(clean[1].role, "assistant");
    assert.ok(clean[2].content.length <= 101);
  });

  it("enforces fail-closed RBAC filtering on AI Copilot tools", () => {
    assert.equal(getAllowedAiTools(null).length, 0);

    const adminTools = getAllowedAiTools({ role: "admin", tai_khoan: "admin" });
    assert.equal(adminTools.length, 5);

    const warehouseStaff = {
      role: "warehouse_staff",
      quyen_han: ["warehouse.view"],
    };
    const whTools = getAllowedAiTools(warehouseStaff).map((t) => t.name);
    assert.ok(whTools.includes("get_low_stock_and_fefo"));
    assert.ok(!whTools.includes("get_cashflow_health"));
    assert.ok(!whTools.includes("lookup_partner_debt"));
  });

  it("parses structured JSON OCR output and fuzzy-matches slightly misspelled catalog items", () => {
    const catalog = [
      { _id: "nl1", ma_nl: "MDF17", ten_nl: "Gỗ MDF chống ẩm 17mm", gia_nhap: 450_000 },
      { _id: "nl2", ma_nl: "SONPU", ten_nl: "Sơn PU trắng bóng", gia_nhap: 120_000 },
    ];

    const jsonPayload = JSON.stringify({
      items: [
        { name: "Go MDF chong am 17m", qty: 15, unit_price: 460_000 },
        { name: "Son PU trang", qty: 5, unit_price: 0 },
      ],
    });

    const parsed = parseStructuredOcrJson(jsonPayload, catalog);
    assert.equal(parsed.total_items, 2);
    assert.equal(parsed.items[0].matched_id, "nl1");
    assert.ok(parsed.items[0].match_confidence >= 70);
    assert.equal(parsed.items[1].matched_id, "nl2");
    assert.equal(parsed.items[1].don_gia, 120_000); // fallback gia_nhap

    // Plain text fallback still works cleanly
    const plain = parseInvoiceTextOrLines("Gỗ MDF chống ẩm 17mm | 10 | 450000", catalog);
    assert.equal(plain.items[0].matched_code, "MDF17");
  });
});

describe("Phase 3: Demand Forecast v2, Dynamic Safety Stock & Historical Lead-Time ATP", () => {
  it("caps single-month Mega Sale outliers and outputs confidence bounds", () => {
    // 5 stable months around 20, one extreme outlier spike of 200
    const fc = computeDemandForecast([20, 22, 19, 200, 21, 23]);
    assert.ok(fc.t1 < 40, `Expected capped forecast < 40, got ${fc.t1}`);
    assert.ok(fc.forecast_min <= fc.t1 && fc.t1 <= fc.forecast_max);
    assert.ok(["low", "medium", "high"].includes(fc.volatility));
  });

  it("computes dynamic safety stock (Z * sigma * sqrt(L)) and reorder point", () => {
    const dyn = computeDynamicSafetyStock({
      dailyAvgDemand: 10,
      dailyStdDev: 4,
      leadTimeDays: 9,
      serviceLevelZ: 1.65,
    });
    // SS = ceil(1.65 * 4 * 3) = ceil(19.8) = 20; ROP = ceil(10 * 9 + 20) = 110
    assert.equal(dyn.safetyStock, 20);
    assert.equal(dyn.reorderPoint, 110);

    const qty = computeReorderQty(
      { so_luong: 80, ton_toi_thieu: 30, moq: 10 },
      { dailyAvgDemand: 10, dailyStdDev: 4, leadTimeDays: 9, cycleDays: 14 }
    );
    // target = 110 + 140 = 250 -> need 170
    assert.equal(qty, 170);
  });

  it("estimates ATP material lead time from historical completed purchase orders", () => {
    const completedPOs = [
      {
        trang_thai: "completed",
        created_at: new Date("2026-10-01"),
        updated_at: new Date("2026-10-11"), // 10 days
        san_pham: [{ nguyen_lieu_id: "nl1" }],
      },
      {
        trang_thai: "completed",
        created_at: new Date("2026-10-15"),
        updated_at: new Date("2026-10-23"), // 8 days -> avg = 9 days
        san_pham: [{ nguyen_lieu_id: "nl1" }],
      },
    ];
    const leadMap = computeMaterialLeadTimeMap(completedPOs, 5);
    assert.equal(leadMap.get("nl1"), 9);

    const atp = computeAtpEstimate({
      items: [{ san_pham_id: "sp1", so_luong: 10 }],
      productMap: new Map([["sp1", { _id: "sp1", ten_sp: "Tủ gỗ", so_luong: 0 }]]),
      bomMap: new Map([["sp1", { san_pham_id: "sp1", items: [{ nguyen_lieu_id: "nl1", dinh_muc: 2 }] }]]),
      materialMap: new Map([["nl1", { _id: "nl1", ten_nl: "Gỗ MDF", so_luong: 0 }]]),
      materialLeadTimeMap: leadMap,
      now: new Date("2026-11-01T00:00:00Z"),
    });
    assert.equal(atp.needsMaterialPurchase, true);
    assert.equal(atp.items[0].nvl_thieu[0].lead_time_days, 9);
    assert.ok(atp.estimatedDays >= 11); // >= 2 prod days + 9 lead days
  });
});
