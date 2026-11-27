import test from "node:test";
import assert from "node:assert/strict";
import {
  computePipelineMetrics,
  rankRfqVendorQuotes,
  evaluateThreeWayMatch,
  computeVendorScorecardRows,
} from "../utils/crmProcurementEngine.js";

test("CRM Pipeline - computes weighted forecast, win rate, and overdue follow-ups", () => {
  const now = new Date("2026-11-27T12:00:00Z");
  const metrics = computePipelineMetrics(
    [
      { stage: "lead", expected_value: 100_000_000, probability: 20, next_follow_up: "2026-11-20T00:00:00Z" },
      { stage: "negotiation", expected_value: 200_000_000, probability: 80, next_follow_up: "2026-12-01T00:00:00Z" },
      { stage: "won", expected_value: 150_000_000 },
      { stage: "lost", expected_value: 50_000_000 },
    ],
    now
  );

  assert.equal(metrics.open_pipeline_value, 300_000_000);
  assert.equal(metrics.weighted_forecast_value, 180_000_000); // 20M + 160M
  assert.equal(metrics.won_value, 150_000_000);
  assert.equal(metrics.win_rate_pct, 50);
  assert.equal(metrics.overdue_follow_ups, 1);
});

test("Procurement RFQ - ranks competing vendor quotes by price, speed, and payment terms", () => {
  const ranked = rankRfqVendorQuotes([
    { vendor_name: "NCC Đắt & Chậm", total_price: 125_000_000, lead_time_days: 10, payment_terms_days: 15 },
    { vendor_name: "NCC Giá Tốt", total_price: 95_000_000, lead_time_days: 3, payment_terms_days: 30 },
    { vendor_name: "NCC Nhanh Nhất", total_price: 115_000_000, lead_time_days: 2, payment_terms_days: 15 },
  ]);

  assert.equal(ranked.length, 3);
  assert.equal(ranked[0].vendor_name, "NCC Giá Tốt");
  assert.equal(ranked[0].is_recommended, true);
  assert.equal(ranked[0].is_lowest_price, true);
  assert.equal(ranked.find((r) => r.vendor_name === "NCC Nhanh Nhất").is_fastest, true);
});

test("Procurement 3-Way Match - detects MATCHED, QTY_MISMATCH, PRICE_MISMATCH, and BOTH_MISMATCH", () => {
  const ok = evaluateThreeWayMatch({
    poQty: 100,
    poUnitPrice: 50_000,
    receivedQty: 100,
    invoicedQty: 100,
    invoicedUnitPrice: 50_500, // 1% <= 2% tolerance
    priceTolerancePct: 2,
  });
  assert.equal(ok.status, "MATCHED");
  assert.equal(ok.approved_for_payment, true);

  const qtyBad = evaluateThreeWayMatch({
    poQty: 100,
    poUnitPrice: 50_000,
    receivedQty: 90,
    invoicedQty: 100,
    invoicedUnitPrice: 50_000,
  });
  assert.equal(qtyBad.status, "QTY_MISMATCH");
  assert.equal(qtyBad.approved_for_payment, false);

  const priceBad = evaluateThreeWayMatch({
    poQty: 100,
    poUnitPrice: 50_000,
    receivedQty: 100,
    invoicedQty: 100,
    invoicedUnitPrice: 55_000, // 10% > 2%
    priceTolerancePct: 2,
  });
  assert.equal(priceBad.status, "PRICE_MISMATCH");

  const bothBad = evaluateThreeWayMatch({
    poQty: 100,
    poUnitPrice: 50_000,
    receivedQty: 80,
    invoicedQty: 100,
    invoicedUnitPrice: 60_000,
  });
  assert.equal(bothBad.status, "BOTH_MISMATCH");
});

test("Procurement Vendor Scorecard - scores and grades suppliers accurately", () => {
  const rows = computeVendorScorecardRows([
    { vendor_name: "NCC Xuất Sắc", total_orders: 20, completed_orders: 20, on_time_orders: 19, defect_orders: 0, total_spend: 500_000_000 },
    { vendor_name: "NCC Yếu", total_orders: 10, completed_orders: 4, on_time_orders: 3, defect_orders: 4, total_spend: 80_000_000 },
  ]);

  assert.equal(rows[0].vendor_name, "NCC Xuất Sắc");
  assert.equal(rows[0].grade, "A");
  assert.ok(rows[0].score >= 95);
  assert.equal(rows[1].grade, "D");
});
