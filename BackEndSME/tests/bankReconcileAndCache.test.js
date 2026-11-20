import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { extractReferenceCodes, reconcileBankTransactions } from "../utils/bankReconcileEngine.js";
import { withCache, cacheInvalidate, invalidateReportCaches, REPORT_CACHE_PREFIXES } from "../utils/cache.js";
import { detectAgenticIntent } from "../utils/aiAgentParser.js";

describe("Phase 1: Smart Bank Reconciliation Engine", () => {
  it("extracts ERP document codes from bank transfer descriptions", () => {
    const codes = extractReferenceCodes("KH Nguyen Van A CK thanh toan DH-2026-0012 va HD_2026_0003");
    assert.deepEqual(codes, ["DH-2026-0012", "HD-2026-0003"]);
  });

  it("prevents double-matching two equal-amount transactions to a single ledger entry", () => {
    const bankTxs = [
      { id: "TX1", amount: 5_000_000, date: "2026-11-10", content: "Thanh toan DH-2026-0001" },
      { id: "TX2", amount: 5_000_000, date: "2026-11-11", content: "Thanh toan DH-2026-0002" },
    ];
    const ledger = [
      {
        _id: "sq1",
        ma_phieu: "PT-0001",
        ma_chung_tu: "DH-2026-0001",
        loai_phieu: "thu",
        so_tien: 5_000_000,
        ngay_ghi_nhan: new Date("2026-11-10"),
        trang_thai: "active",
      },
    ];

    const res = reconcileBankTransactions(bankTxs, ledger);
    assert.equal(res.ok, true);
    assert.equal(res.matchedCount, 1);
    assert.equal(res.unmatchedCount, 1);
    assert.equal(res.matched[0].bankTx.id, "TX1");
    assert.equal(res.matched[0].matchQuality, "EXACT_REF");
    assert.ok(res.matched[0].confidenceScore >= 90);
    assert.equal(res.unmatchedBank[0].bankTx.id, "TX2");
  });

  it("picks the closest-date and matching-reference ledger entry among multiple candidates", () => {
    const bankTxs = [
      { id: "TXA", amount: 12_000_000, date: "2026-11-18", content: "CK HD-2026-0008 Cong ty ABC" },
    ];
    const ledger = [
      {
        _id: "sq_old",
        ma_phieu: "PT-0010",
        ma_chung_tu: "HD-2026-0001",
        loai_phieu: "thu",
        so_tien: 12_000_000,
        ngay_ghi_nhan: new Date("2026-10-01"),
        trang_thai: "active",
      },
      {
        _id: "sq_target",
        ma_phieu: "PT-0099",
        ma_chung_tu: "HD-2026-0008",
        loai_phieu: "thu",
        so_tien: 12_000_000,
        ngay_ghi_nhan: new Date("2026-11-18"),
        doi_tuong: { ten: "Công ty ABC" },
        trang_thai: "active",
      },
    ];

    const res = reconcileBankTransactions(bankTxs, ledger);
    assert.equal(res.matchedCount, 1);
    assert.equal(res.matched[0].ledgerEntry.ma_phieu, "PT-0099");
    assert.equal(res.matched[0].confidenceScore, 100);
  });
});

describe("Phase 1: Cache Deduplication, Invalidation & Route Fix", () => {
  it("coalesces concurrent withCache calls and invalidates scoped report caches", async () => {
    let calls = 0;
    const key = `${REPORT_CACHE_PREFIXES.FINANCIAL}test_coalesce`;
    cacheInvalidate(REPORT_CACHE_PREFIXES.FINANCIAL);

    const fetcher = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 15));
      return { ok: true, value: 42 };
    };

    const [a, b, c] = await Promise.all([
      withCache(key, fetcher, 60),
      withCache(key, fetcher, 60),
      withCache(key, fetcher, 60),
    ]);

    assert.equal(calls, 1);
    assert.equal(a.value, 42);
    assert.equal(b.value, 42);
    assert.equal(c.value, 42);

    // Does not cache error objects
    const errKey = `${REPORT_CACHE_PREFIXES.FINANCIAL}test_err`;
    let errCalls = 0;
    await withCache(errKey, async () => {
      errCalls += 1;
      return { error: "temporary failure" };
    });
    await withCache(errKey, async () => {
      errCalls += 1;
      return { ok: true };
    });
    assert.equal(errCalls, 2);

    const removed = invalidateReportCaches([REPORT_CACHE_PREFIXES.FINANCIAL]);
    assert.ok(removed >= 1);
  });

  it("routes financial report agentic intent to /financial-reports", () => {
    const intent = detectAgenticIntent("Mở báo cáo tài chính và lãi lỗ giúp tôi");
    assert.ok(intent);
    assert.equal(intent.route, "/financial-reports");
  });
});
