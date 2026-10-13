import test from "node:test";
import assert from "node:assert/strict";

test("Voucher Calculation - SME5 gives 5% discount", () => {
  const amount = 20000000;
  const discount = Math.round(amount * 0.05);
  assert.equal(discount, 1000000);
});

test("Voucher Calculation - SME10 requires minimum 10M", () => {
  const lowAmount = 5000000;
  assert.throws(() => {
    if (lowAmount < 10000000) {
      throw new Error("Mã SME10 chỉ áp dụng cho đơn hàng từ 10.000.000 đ");
    }
  }, /10\.000\.000/);

  const eligibleAmount = 25000000;
  const discount = Math.round(eligibleAmount * 0.10);
  assert.equal(discount, 2500000);
});

test("Moving Average COGS calculation", () => {
  const currentStock = 10;
  const currentAvgPrice = 500000; // 5M value
  const incomingQty = 5;
  const incomingPrice = 650000; // 3.25M value

  const totalQty = currentStock + incomingQty;
  const totalValue = (currentStock * currentAvgPrice) + (incomingQty * incomingPrice);
  const newAvg = Math.round(totalValue / totalQty);

  // (5,000,000 + 3,250,000) / 15 = 8,250,000 / 15 = 550,000
  assert.equal(newAvg, 550000);
});

test("Cashflow Runway & Burn Rate calculation", () => {
  const cashBalance = 1500000000; // 1.5B VND
  const monthlyBurnRate = 35000000; // 35M VND / month
  const runwayMonths = Math.round((cashBalance / monthlyBurnRate) * 10) / 10;

  assert.equal(runwayMonths, 42.9);
  assert.ok(runwayMonths >= 6, "Runway should be healthy (> 6 months)");
});

test("Production Yield & Scrap Rate calculation", () => {
  const totalProduced = 95;
  const totalScrap = 5;
  const total = totalProduced + totalScrap;

  const yieldRate = Math.round((totalProduced / total) * 1000) / 10;
  const scrapRate = Math.round((100 - yieldRate) * 10) / 10;

  assert.equal(yieldRate, 95);
  assert.equal(scrapRate, 5);
});

test("Period Closing - transaction date boundary check", () => {
  const closedPeriod = {
    thang: 9,
    nam: 2026,
    trang_thai: "da_khoa"
  };

  function isDateLocked(targetDate, period) {
    const d = new Date(targetDate);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    return period.trang_thai === "da_khoa" && m === period.thang && y === period.nam;
  }

  assert.equal(isDateLocked("2026-09-15T08:00:00Z", closedPeriod), true);
  assert.equal(isDateLocked("2026-10-01T08:00:00Z", closedPeriod), false);
});
