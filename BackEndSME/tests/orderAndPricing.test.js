import test from "node:test";
import assert from "node:assert/strict";

// Helper simulating customer pricing discount logic
function calculateCustomerDiscount(customerTier, subtotal) {
  let discountPct = 0;
  switch (customerTier) {
    case "vip":
      discountPct = 10;
      break;
    case "dai_ly_c1":
    case "khach_buon":
      discountPct = 25;
      break;
    case "dai_ly_c2":
      discountPct = 15;
      break;
    default:
      discountPct = 0;
  }
  const discountAmount = Math.round((subtotal * discountPct) / 100);
  return {
    tier: customerTier,
    discountPct,
    discountAmount,
    finalTotal: subtotal - discountAmount,
  };
}

// Helper simulating credit limit check logic in orderController.create
function checkCreditLimit({ currentDebt = 0, creditLimit = 0, orderAmount = 0, paymentMethod = "cong_no", isAdmin = false }) {
  if (paymentMethod === "tien_mat") {
    return { ok: true, reason: "Cash payment exempt from credit limit" };
  }
  if (creditLimit <= 0) {
    return { ok: true, reason: "No credit limit set" };
  }
  const projectedDebt = currentDebt + orderAmount;
  if (projectedDebt > creditLimit) {
    if (isAdmin) {
      return { ok: true, warning: true, reason: "Admin override allowed" };
    }
    const excess = projectedDebt - creditLimit;
    throw new Error(`CREDIT_LIMIT_EXCEEDED: Vượt hạn mức tín dụng ${excess.toLocaleString()} đ`);
  }
  return { ok: true, remainingCredit: creditLimit - projectedDebt };
}

// Helper simulating validateCoupon logic
function evaluateCoupon(code, orderAmount) {
  const clean = String(code || "").trim().toUpperCase();
  const amount = Number(orderAmount || 0);

  if (clean === "SME5") {
    return { code: clean, discountAmount: Math.round(amount * 0.05), message: "Giảm 5%" };
  }
  if (clean === "SME10") {
    if (amount < 10000000) {
      throw new Error("INVALID_MINIMUM: Mã SME10 chỉ áp dụng cho đơn từ 10.000.000 đ");
    }
    return { code: clean, discountAmount: Math.round(amount * 0.10), message: "Giảm 10%" };
  }
  if (clean === "VIP50K") {
    return { code: clean, discountAmount: Math.min(amount, 50000), message: "Giảm 50.000 đ" };
  }
  if (clean === "FREESHIP") {
    return { code: clean, discountAmount: 30000, message: "Freeship 30.000 đ" };
  }
  throw new Error("INVALID_COUPON: Mã không hợp lệ hoặc đã hết hạn");
}

test("Tiered Pricing - VIP receives 10% discount", () => {
  const res = calculateCustomerDiscount("vip", 10000000);
  assert.equal(res.discountPct, 10);
  assert.equal(res.discountAmount, 1000000);
  assert.equal(res.finalTotal, 9000000);
});

test("Tiered Pricing - Dai ly C1 receives 25% discount", () => {
  const res = calculateCustomerDiscount("dai_ly_c1", 20000000);
  assert.equal(res.discountPct, 25);
  assert.equal(res.discountAmount, 5000000);
  assert.equal(res.finalTotal, 15000000);
});

test("Tiered Pricing - Dai ly C2 receives 15% discount", () => {
  const res = calculateCustomerDiscount("dai_ly_c2", 20000000);
  assert.equal(res.discountPct, 15);
  assert.equal(res.discountAmount, 3000000);
  assert.equal(res.finalTotal, 17000000);
});

test("Credit Limit - Rejects order when projected debt exceeds limit", () => {
  assert.throws(() => {
    checkCreditLimit({
      currentDebt: 45000000,
      creditLimit: 50000000,
      orderAmount: 10000000,
      paymentMethod: "cong_no",
      isAdmin: false,
    });
  }, /CREDIT_LIMIT_EXCEEDED/);
});

test("Credit Limit - Approves order within limit", () => {
  const res = checkCreditLimit({
    currentDebt: 30000000,
    creditLimit: 50000000,
    orderAmount: 10000000,
    paymentMethod: "cong_no",
    isAdmin: false,
  });
  assert.equal(res.ok, true);
  assert.equal(res.remainingCredit, 10000000);
});

test("Credit Limit - Admin override allows warning pass", () => {
  const res = checkCreditLimit({
    currentDebt: 55000000,
    creditLimit: 50000000,
    orderAmount: 5000000,
    paymentMethod: "cong_no",
    isAdmin: true,
  });
  assert.equal(res.ok, true);
  assert.equal(res.warning, true);
});

test("Coupons - SME5 awards 5%", () => {
  const res = evaluateCoupon("SME5", 4000000);
  assert.equal(res.discountAmount, 200000);
});

test("Coupons - SME10 awards 10% on large order", () => {
  const res = evaluateCoupon("SME10", 30000000);
  assert.equal(res.discountAmount, 3000000);
});

test("Coupons - SME10 rejects order below 10M", () => {
  assert.throws(() => evaluateCoupon("SME10", 8000000), /INVALID_MINIMUM/);
});

test("Coupons - FREESHIP awards 30K", () => {
  const res = evaluateCoupon("FREESHIP", 500000);
  assert.equal(res.discountAmount, 30000);
});

test("Coupons - Unknown code throws INVALID_COUPON", () => {
  assert.throws(() => evaluateCoupon("EXPIRED99", 500000), /INVALID_COUPON/);
});
