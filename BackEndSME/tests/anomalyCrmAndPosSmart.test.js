import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { detectEnterpriseAnomalies } from "../utils/anomalyEngine.js";
import { computeCrmRfmAndChurn } from "../utils/crmIntelligence.js";
import {
  buildCoOccurrenceMap,
  recommendCrossSellProducts,
  evaluateCartMarginGuard,
} from "../utils/salesRecommendationEngine.js";
import { mergeAutomationConfig, DEFAULT_AUTOMATION_CONFIG } from "../utils/automationConfig.js";

describe("Phase 4: Enterprise Anomaly Detection Engine", () => {
  it("detects revenue drop, QC scrap spike, abnormal discount, and OPEX Z-score spike", () => {
    const report = detectEnterpriseAnomalies({
      dailyRevenueSeries: [10_000_000, 11_000_000, 9_500_000, 10_500_000, 10_200_000, 9_800_000, 2_000_000],
      recentSalesOrders: [{ ma_dh: "DH-999", tam_tinh: 10_000_000, tong_tien: 6_000_000, giam_gia: 4_000_000 }],
      baselineExpenses: [
        { so_tien: 1_000_000 },
        { so_tien: 1_100_000 },
        { so_tien: 950_000 },
        { so_tien: 1_050_000 },
        { so_tien: 980_000 },
        { so_tien: 1_020_000 },
      ],
      recentExpenses: [{ ma_phieu: "PC-888", so_tien: 8_500_000, hang_muc: "chi_khac" }],
      productionOrders: [{ ma_dh: "LSX-01", so_luong_san_xuat: 100, so_luong_phe_pham: 18 }],
    });

    assert.equal(report.hasAnomalies, true);
    assert.equal(report.totalAnomalies, 4);
    const types = new Set(report.anomalies.map((a) => a.type));
    assert.ok(types.has("REVENUE_DROP"));
    assert.ok(types.has("QC_SCRAP_SPIKE"));
    assert.ok(types.has("ABNORMAL_DISCOUNT"));
    assert.ok(types.has("OPEX_SPIKE"));
  });

  it("normalizes anomaly_detection job settings in automationConfig", () => {
    const merged = mergeAutomationConfig(DEFAULT_AUTOMATION_CONFIG, {
      jobs: {
        anomaly_detection: {
          enabled: true,
          interval_minutes: 120,
          revenue_drop_pct: 35,
          discount_alert_pct: 20,
          scrap_rate_alert_pct: 8,
          channel: "telegram",
        },
      },
    });
    assert.equal(merged.jobs.anomaly_detection.enabled, true);
    assert.equal(merged.jobs.anomaly_detection.interval_minutes, 120);
    assert.equal(merged.jobs.anomaly_detection.channel, "telegram");
  });
});

describe("Phase 4: CRM RFM Segmentation & Churn Risk Prediction", () => {
  it("classifies Champions vs High Churn Risk based on personal purchase cycle", () => {
    const now = new Date("2026-11-20T00:00:00Z");
    const partners = [
      { _id: "c1", ma_doi_tac: "KH-01", ten: "Công ty Thành Đạt", loai_doi_tac: "khach_hang", nhom: "vip" },
      { _id: "c2", ma_doi_tac: "KH-02", ten: "Nội thất Minh Khang", loai_doi_tac: "khach_hang", nhom: "khach_buon" },
    ];
    const orders = [
      // c1: mua đều đặn gần đây, giá trị lớn
      { doi_tac_id: "c1", tong_tien: 50_000_000, ngay_dat: "2026-09-20", trang_thai: "completed" },
      { doi_tac_id: "c1", tong_tien: 60_000_000, ngay_dat: "2026-10-20", trang_thai: "completed" },
      { doi_tac_id: "c1", tong_tien: 70_000_000, ngay_dat: "2026-11-15", trang_thai: "completed" },
      // c2: chu kỳ mua 15 ngày nhưng đã 65 ngày không quay lại => High Churn Risk
      { doi_tac_id: "c2", tong_tien: 20_000_000, ngay_dat: "2026-09-01", trang_thai: "completed" },
      { doi_tac_id: "c2", tong_tien: 22_000_000, ngay_dat: "2026-09-16", trang_thai: "completed" },
    ];

    const res = computeCrmRfmAndChurn(partners, orders, now);
    assert.equal(res.summary.totalCustomers, 2);
    assert.equal(res.summary.highChurnCount, 1);

    const c1 = res.customers.find((c) => c._id === "c1");
    const c2 = res.customers.find((c) => c._id === "c2");
    assert.equal(c1.churnRisk, "low");
    assert.equal(c2.churnRisk, "high");
    assert.equal(c2.avgCycleDays, 15);
  });
});

describe("Phase 4: POS & Quotation Smart Recommendations + Margin Guard", () => {
  it("recommends frequently co-purchased in-stock items and excludes cart items", () => {
    const orders = [
      { trang_thai: "completed", san_pham: [{ san_pham_id: "sp1" }, { san_pham_id: "sp2" }, { san_pham_id: "sp3" }] },
      { trang_thai: "completed", san_pham: [{ san_pham_id: "sp1" }, { san_pham_id: "sp2" }] },
      { trang_thai: "cancelled", san_pham: [{ san_pham_id: "sp1" }, { san_pham_id: "sp4" }] },
    ];
    const products = [
      { _id: "sp1", ma_sp: "BAN01", ten_sp: "Bàn làm việc", don_gia: 2_000_000, so_luong: 10 },
      { _id: "sp2", ma_sp: "GHE01", ten_sp: "Ghế công thái học", don_gia: 1_500_000, so_luong: 8 },
      { _id: "sp3", ma_sp: "HOC01", ten_sp: "Hộc tủ di động", don_gia: 800_000, so_luong: 5 },
      { _id: "sp4", ma_sp: "DEN01", ten_sp: "Đèn bàn", don_gia: 300_000, so_luong: 0 }, // out of stock
    ];

    const coMap = buildCoOccurrenceMap(orders);
    const recs = recommendCrossSellProducts({
      cartProductIds: ["sp1"],
      coOccurrenceMap: coMap,
      products,
      limit: 3,
    });

    assert.equal(recs.length, 2);
    assert.equal(recs[0].san_pham_id, "sp2"); // count 2 > count 1
    assert.equal(recs[0].coOccurrenceCount, 2);
    assert.equal(recs[1].san_pham_id, "sp3");
  });

  it("warns on low margin and flags LOSS when discount breaches COGS", () => {
    const items = [{ san_pham_id: "sp1", don_gia: 1_000_000, gia_von: 700_000, so_luong: 1 }];

    const healthy = evaluateCartMarginGuard({ items, discountAmount: 50_000, minMarginPct: 10 });
    assert.equal(healthy.status, "HEALTHY");
    assert.ok(healthy.marginPct > 20);

    const low = evaluateCartMarginGuard({ items, discountAmount: 250_000, minMarginPct: 10 });
    assert.equal(low.status, "LOW_MARGIN"); // net 750k, profit 50k = 6.7% < 10%
    assert.ok(low.warningMessage);

    const loss = evaluateCartMarginGuard({ items, discountAmount: 350_000, minMarginPct: 10 });
    assert.equal(loss.status, "LOSS"); // net 650k < cost 700k
    assert.equal(loss.grossProfit, -50_000);
  });
});
