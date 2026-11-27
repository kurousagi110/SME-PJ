import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PROMOTIONS,
  evaluatePromotion,
  calculateLoyaltyEarn,
  calculateLoyaltyRedeem,
  determineLoyaltyTier,
  computePosShiftSummary,
} from "../utils/promotionEngine.js";

test("PromotionEngine - percent discount respects max_discount cap", () => {
  const promo = {
    code: "SALE20",
    type: "percent",
    value: 20,
    max_discount: 500_000,
    min_order_amount: 1_000_000,
    is_active: true,
  };
  const res = evaluatePromotion(promo, { orderAmount: 5_000_000 });
  assert.equal(res.valid, true);
  assert.equal(res.discountAmount, 500_000);
});

test("PromotionEngine - rejects expired, inactive, over-limit, and wrong customer group coupons", () => {
  const pastPromo = {
    code: "OLD",
    type: "fixed",
    value: 100_000,
    is_active: true,
    end_date: "2020-01-01T00:00:00.000Z",
  };
  assert.equal(evaluatePromotion(pastPromo, { orderAmount: 500_000 }).code, "COUPON_EXPIRED");

  const usedUpPromo = {
    code: "LIMITED",
    type: "fixed",
    value: 50_000,
    is_active: true,
    max_usage: 10,
    used_count: 10,
  };
  assert.equal(evaluatePromotion(usedUpPromo, { orderAmount: 500_000 }).code, "COUPON_USAGE_EXCEEDED");

  const vipOnly = {
    code: "VIP20",
    type: "percent",
    value: 20,
    is_active: true,
    customer_groups: ["vip", "dai_ly_c1"],
  };
  assert.equal(
    evaluatePromotion(vipOnly, { orderAmount: 1_000_000, customerGroup: "khach_le" }).code,
    "COUPON_GROUP_RESTRICTED"
  );
  assert.equal(
    evaluatePromotion(vipOnly, { orderAmount: 1_000_000, customerGroup: "vip" }).discountAmount,
    200_000
  );
});

test("PromotionEngine - default seeded vouchers match legacy SME5/SME10/VIP50K/FREESHIP rules", () => {
  const sme5 = DEFAULT_PROMOTIONS.find((p) => p.code === "SME5");
  const sme10 = DEFAULT_PROMOTIONS.find((p) => p.code === "SME10");
  assert.equal(evaluatePromotion(sme5, { orderAmount: 2_000_000 }).discountAmount, 100_000);
  assert.equal(evaluatePromotion(sme10, { orderAmount: 5_000_000 }).valid, false);
  assert.equal(evaluatePromotion(sme10, { orderAmount: 10_000_000 }).discountAmount, 1_000_000);
});

test("LoyaltyEngine - earns, caps redeem at max_redeem_pct, and determines tiers accurately", () => {
  const earned = calculateLoyaltyEarn(1_255_000, { enabled: true, vnd_per_point: 10_000 });
  assert.equal(earned, 125);

  const insufficient = calculateLoyaltyRedeem(200, 100, 1_000_000);
  assert.equal(insufficient.valid, false);

  // Order 200k, max 50% = 100k => capped at 100 points
  const capped = calculateLoyaltyRedeem(150, 300, 200_000, {
    enabled: true,
    vnd_per_redeem_point: 1_000,
    max_redeem_pct: 50,
  });
  assert.equal(capped.valid, true);
  assert.equal(capped.capped, true);
  assert.equal(capped.pointsUsed, 100);
  assert.equal(capped.discountAmount, 100_000);

  assert.equal(determineLoyaltyTier(100).code, "bronze");
  assert.equal(determineLoyaltyTier(600).code, "silver");
  assert.equal(determineLoyaltyTier(2500).code, "gold");
  assert.equal(determineLoyaltyTier(6000).code, "platinum");
});

test("PosShiftSummary - reconciles opening cash, cash vs transfer sales, refunds and variance", () => {
  const summary = computePosShiftSummary({
    openingCash: 2_000_000,
    transactions: [
      { amount: 500_000, payment_method: "tien_mat", kind: "sale" },
      { amount: 1_200_000, payment_method: "chuyen_khoan", kind: "sale" },
      { amount: 300_000, payment_method: "tien_mat", kind: "sale" },
      { amount: 100_000, payment_method: "tien_mat", kind: "refund" },
    ],
    actualCash: 2_650_000,
  });

  assert.equal(summary.order_count, 3);
  assert.equal(summary.cash_sales, 800_000);
  assert.equal(summary.transfer_sales, 1_200_000);
  assert.equal(summary.cash_refunds, 100_000);
  assert.equal(summary.expected_cash, 2_700_000);
  assert.equal(summary.variance, -50_000);
  assert.equal(summary.reconciliation_status, "short");
});
