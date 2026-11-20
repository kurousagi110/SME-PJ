import test from "node:test";
import assert from "node:assert/strict";

// Helper projecting 12-week buckets
function projectCashFlowBuckets(startingBalance, weeklyInflows = [], weeklyOutflows = []) {
  let runningBalance = Number(startingBalance || 0);
  const buckets = [];

  for (let i = 0; i < 12; i++) {
    const inflow = Number(weeklyInflows[i] || 0);
    const outflow = Number(weeklyOutflows[i] || 0);
    const netFlow = inflow - outflow;
    runningBalance += netFlow;

    buckets.push({
      weekIndex: i + 1,
      inflow,
      outflow,
      netFlow,
      endingBalance: runningBalance,
      isDeficit: runningBalance < 0,
    });
  }

  const hasDeficit = buckets.some((b) => b.isDeficit);
  const totalInflows = weeklyInflows.reduce((a, b) => a + b, 0);
  const totalOutflows = weeklyOutflows.reduce((a, b) => a + b, 0);

  return {
    startingBalance: Number(startingBalance),
    endingBalance: runningBalance,
    totalInflows,
    totalOutflows,
    hasDeficit,
    healthStatus: hasDeficit ? "DANGER" : "HEALTHY",
    buckets,
  };
}

// Helper bank reconciliation
function matchBankStatement(statementTxs, ledgerEntries) {
  const matched = [];
  const unmatched = [];

  for (const tx of statementTxs) {
    const found = ledgerEntries.find(
      (e) => e.so_tien === Math.abs(tx.amount) && e.loai_phieu === (tx.amount > 0 ? "thu" : "chi")
    );
    if (found) {
      matched.push({ txId: tx.id, ledgerId: found.id, amount: Math.abs(tx.amount) });
    } else {
      unmatched.push({ txId: tx.id, amount: tx.amount });
    }
  }

  const matchRate = Math.round((matched.length / statementTxs.length) * 100);
  return {
    total: statementTxs.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    matchRate,
    matched,
    unmatched,
  };
}

test("Cashflow - Projects 12 buckets correctly", () => {
  const starting = 100000000; // 100M VND
  const inflows = Array(12).fill(20000000); // 20M/week
  const outflows = Array(12).fill(15000000); // 15M/week

  const res = projectCashFlowBuckets(starting, inflows, outflows);
  assert.equal(res.buckets.length, 12);
  assert.equal(res.endingBalance, 160000000); // 100M + 12 * 5M = 160M
  assert.equal(res.hasDeficit, false);
  assert.equal(res.healthStatus, "HEALTHY");
});

test("Cashflow - Flags deficit when balance dips negative", () => {
  const starting = 10000000; // 10M VND
  const inflows = Array(12).fill(5000000);
  const outflows = Array(12).fill(20000000); // Outflow > Inflow

  const res = projectCashFlowBuckets(starting, inflows, outflows);
  assert.equal(res.hasDeficit, true);
  assert.equal(res.healthStatus, "DANGER");
  assert.equal(res.buckets[0].isDeficit, true);
});

test("Bank Reconcile - Matches exact receipts and disbursements", () => {
  const bankTxs = [
    { id: "TX1", amount: 15000000 },
    { id: "TX2", amount: -5000000 },
    { id: "TX3", amount: 2000000 }, // unmatched
  ];
  const ledgerEntries = [
    { id: "L1", so_tien: 15000000, loai_phieu: "thu" },
    { id: "L2", so_tien: 5000000, loai_phieu: "chi" },
  ];

  const res = matchBankStatement(bankTxs, ledgerEntries);
  assert.equal(res.total, 3);
  assert.equal(res.matchedCount, 2);
  assert.equal(res.unmatchedCount, 1);
  assert.equal(res.matchRate, 67);
});
