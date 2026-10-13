import test from "node:test";
import assert from "node:assert/strict";

const KANBAN_STAGES = [
  "pending",
  "raw_material_prep",
  "machining",
  "finishing",
  "assembly_qc",
  "completed",
];

// Helper validating stage transition
function validateStageTransition(currentStage, nextStage) {
  if (!KANBAN_STAGES.includes(nextStage)) {
    throw new Error(`INVALID_STAGE: Công đoạn '${nextStage}' không tồn tại`);
  }
  const curIdx = KANBAN_STAGES.indexOf(currentStage);
  const nextIdx = KANBAN_STAGES.indexOf(nextStage);
  return {
    valid: true,
    isForward: nextIdx >= curIdx,
    currentStage,
    nextStage,
  };
}

// Helper calculating yield and scrap rates
function calculateYieldAndScrap(totalProduced, scrapRecords = []) {
  const totalScrap = scrapRecords.reduce((s, r) => s + Number(r.qty || 0), 0);
  const totalProcessed = Number(totalProduced || 0) + totalScrap;

  if (totalProcessed === 0) {
    return {
      totalProduced: 0,
      totalScrap: 0,
      yieldRate: 100,
      scrapRate: 0,
      stageBreakdown: {},
    };
  }

  const yieldRate = Math.round((Number(totalProduced) / totalProcessed) * 1000) / 10;
  const scrapRate = Math.round((100 - yieldRate) * 10) / 10;

  const stageBreakdown = {};
  for (const r of scrapRecords) {
    const stage = r.stage || "other";
    stageBreakdown[stage] = (stageBreakdown[stage] || 0) + Number(r.qty || 0);
  }

  return {
    totalProduced: Number(totalProduced),
    totalScrap,
    yieldRate,
    scrapRate,
    stageBreakdown,
  };
}

test("Kanban - 6 valid stages defined in order", () => {
  assert.equal(KANBAN_STAGES.length, 6);
  assert.equal(KANBAN_STAGES[0], "pending");
  assert.equal(KANBAN_STAGES[5], "completed");
});

test("Kanban - Rejects invalid stage name", () => {
  assert.throws(() => validateStageTransition("pending", "invalid_stage"), /INVALID_STAGE/);
});

test("Kanban - Valid stage advance", () => {
  const res = validateStageTransition("raw_material_prep", "machining");
  assert.equal(res.valid, true);
  assert.equal(res.isForward, true);
});

test("Yield & Scrap - 100% yield when no scrap", () => {
  const res = calculateYieldAndScrap(50, []);
  assert.equal(res.totalProduced, 50);
  assert.equal(res.totalScrap, 0);
  assert.equal(res.yieldRate, 100);
  assert.equal(res.scrapRate, 0);
});

test("Yield & Scrap - Accurate yield and breakdown with multiple scrap records", () => {
  const scrapRecords = [
    { stage: "machining", qty: 3, reason: "Mẻ phôi" },
    { stage: "finishing", qty: 2, reason: "Trầy xước sơn" },
  ];
  const res = calculateYieldAndScrap(95, scrapRecords);
  // total = 95 + 5 = 100
  // yield = 95 / 100 = 95.0%
  assert.equal(res.totalProduced, 95);
  assert.equal(res.totalScrap, 5);
  assert.equal(res.yieldRate, 95.0);
  assert.equal(res.scrapRate, 5.0);
  assert.equal(res.stageBreakdown.machining, 3);
  assert.equal(res.stageBreakdown.finishing, 2);
});
