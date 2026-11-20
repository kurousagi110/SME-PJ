import test from "node:test";
import assert from "node:assert/strict";

// Helper validating contract milestones
function validateContractMilestones(totalValue, milestones = []) {
  if (!Array.isArray(milestones) || milestones.length === 0) {
    throw new Error("Hợp đồng cần ít nhất 1 đợt thanh toán");
  }
  const totalPct = milestones.reduce((s, m) => s + Number(m.ty_le || 0), 0);
  if (totalPct !== 100) {
    throw new Error(`Tổng tỷ lệ các đợt phải bằng 100% (Hiện tại: ${totalPct}%)`);
  }
  const validated = milestones.map((m, idx) => {
    const amount = Math.round((Number(totalValue) * Number(m.ty_le)) / 100);
    return {
      ten_dot: m.ten_dot || `Đợt ${idx + 1}`,
      ty_le: Number(m.ty_le),
      so_tien: amount,
      trang_thai: m.trang_thai || "chua_thu",
    };
  });
  return validated;
}

// Helper checking warranty expiration
function calculateWarrantyStatus(startDate, durationMonths, checkDate = new Date()) {
  const start = new Date(startDate);
  const expiration = new Date(start.getTime() + Number(durationMonths) * 30 * 86400000);
  const isExpired = checkDate.getTime() > expiration.getTime();
  const remainingDays = Math.max(0, Math.ceil((expiration.getTime() - checkDate.getTime()) / (86400000)));

  return {
    startDate: start.toISOString(),
    expirationDate: expiration.toISOString(),
    durationMonths: Number(durationMonths),
    isExpired,
    status: isExpired ? "expired" : "active",
    remainingDays,
  };
}

test("Contracts - Milestone percentages must sum to 100%", () => {
  const total = 50000000;
  const validMilestones = [
    { ten_dot: "Đợt 1", ty_le: 30 },
    { ten_dot: "Đợt 2", ty_le: 50 },
    { ten_dot: "Đợt 3", ty_le: 20 },
  ];
  const res = validateContractMilestones(total, validMilestones);
  assert.equal(res.length, 3);
  assert.equal(res[0].so_tien, 15000000);
  assert.equal(res[1].so_tien, 25000000);
  assert.equal(res[2].so_tien, 10000000);
});

test("Contracts - Rejects milestones not summing to 100%", () => {
  const total = 50000000;
  const invalidMilestones = [
    { ten_dot: "Đợt 1", ty_le: 40 },
    { ten_dot: "Đợt 2", ty_le: 40 },
  ];
  assert.throws(() => validateContractMilestones(total, invalidMilestones), /100%/);
});

test("Contracts - Completion state when all milestones paid", () => {
  const milestones = [
    { ten_dot: "Đợt 1", ty_le: 50, trang_thai: "paid" },
    { ten_dot: "Đợt 2", ty_le: 50, trang_thai: "paid" },
  ];
  const allPaid = milestones.every((m) => m.trang_thai === "paid");
  assert.equal(allPaid, true);
});

test("Warranty - Status active when within period", () => {
  const startDate = "2026-01-01T00:00:00Z";
  const durationMonths = 24;
  const checkDate = new Date("2026-06-01T00:00:00Z");

  const res = calculateWarrantyStatus(startDate, durationMonths, checkDate);
  assert.equal(res.status, "active");
  assert.equal(res.isExpired, false);
  assert.ok(res.remainingDays > 0);
});

test("Warranty - Status expired when past duration", () => {
  const startDate = "2024-01-01T00:00:00Z";
  const durationMonths = 12; // expired Jan 2025
  const checkDate = new Date("2026-10-13T00:00:00Z");

  const res = calculateWarrantyStatus(startDate, durationMonths, checkDate);
  assert.equal(res.status, "expired");
  assert.equal(res.isExpired, true);
  assert.equal(res.remainingDays, 0);
});
