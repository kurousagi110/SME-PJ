import test from "node:test";
import assert from "node:assert/strict";
import {
  computeVatDeclaration,
  computeMonthlyDepreciation,
  computeBatchDepreciationRun,
  computeBudgetVarianceRows,
} from "../utils/vatAssetBudgetEngine.js";

test("VAT Declaration - computes output VAT, input VAT, payable vs carryforward credit", () => {
  const res = computeVatDeclaration({
    salesOrders: [
      { ma_dh: "DH-01", khach_hang_ten: "KH A", tam_tinh: 100_000_000, giam_gia: 0, thue_rate: 8, thue_tien: 8_000_000 },
      { ma_dh: "DH-02", khach_hang_ten: "KH B", tam_tinh: 50_000_000, giam_gia: 0, thue_rate: 10, thue_tien: 5_000_000 },
    ],
    purchaseOrders: [
      { ma_dh: "PN-01", nha_cung_cap_ten: "NCC X", tam_tinh: 60_000_000, giam_gia: 0, thue_rate: 8, thue_tien: 4_800_000 },
    ],
  });

  assert.equal(res.summary.total_output_vat, 13_000_000);
  assert.equal(res.summary.total_input_vat, 4_800_000);
  assert.equal(res.summary.vat_payable, 8_200_000);
  assert.equal(res.summary.vat_credit_carryforward, 0);

  // Case where Input VAT > Output VAT -> credit carryforward
  const creditRes = computeVatDeclaration({
    salesOrders: [{ ma_dh: "DH-03", tam_tinh: 10_000_000, thue_rate: 8, thue_tien: 800_000 }],
    purchaseOrders: [{ ma_dh: "PN-02", tam_tinh: 30_000_000, thue_rate: 8, thue_tien: 2_400_000 }],
  });
  assert.equal(creditRes.summary.vat_payable, 0);
  assert.equal(creditRes.summary.vat_credit_carryforward, 1_600_000);
});

test("Fixed Assets - straight-line depreciation & idempotent monthly batch run", () => {
  const asset = {
    _id: "a1",
    ma_tai_san: "TSCD-CNC01",
    ten_tai_san: "Máy CNC 3 trục",
    original_cost: 120_000_000,
    salvage_value: 0,
    useful_life_months: 60,
    accumulated_depreciation: 20_000_000,
    status: "active",
    depreciated_periods: ["2026-10"],
  };

  const calc = computeMonthlyDepreciation(asset);
  assert.equal(calc.monthly_depreciation, 2_000_000);
  assert.equal(calc.net_book_value, 100_000_000);
  assert.equal(calc.remaining_months, 50);

  // Running for already-depreciated period 2026-10 skips it
  const dupRun = computeBatchDepreciationRun([asset], { month: 10, year: 2026 });
  assert.equal(dupRun.asset_count, 0);
  assert.equal(dupRun.total_depreciation, 0);

  // Running for 2026-11 posts 2,000,000
  const runNov = computeBatchDepreciationRun([asset], { month: 11, year: 2026 });
  assert.equal(runNov.asset_count, 1);
  assert.equal(runNov.total_depreciation, 2_000_000);
  assert.equal(runNov.entries[0].new_book_value, 98_000_000);
});

test("Budget vs Actual - flags OK (<80%), WARNING (80-100%), and EXCEEDED (>100%)", () => {
  const actualMap = new Map([
    ["phòng kinh doanh|marketing", 25_000_000], // 125% -> EXCEEDED
    ["xưởng sản xuất|chi_phi_van_hanh", 42_000_000], // 84% -> WARNING
    ["phòng nhân sự|all", 10_000_000], // 50% -> OK
  ]);

  const report = computeBudgetVarianceRows(
    [
      { department: "Phòng kinh doanh", category: "marketing", planned_amount: 20_000_000 },
      { department: "Xưởng sản xuất", category: "chi_phi_van_hanh", planned_amount: 50_000_000 },
      { department: "Phòng nhân sự", category: "all", planned_amount: 20_000_000 },
    ],
    actualMap
  );

  assert.equal(report.summary.exceeded_count, 1);
  assert.equal(report.summary.warning_count, 1);
  assert.equal(report.rows[0].alert_status, "EXCEEDED");
  assert.equal(report.rows[1].alert_status, "WARNING");
  assert.equal(report.rows[2].alert_status, "OK");
});
