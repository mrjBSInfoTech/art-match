import assert from "node:assert/strict";
import test from "node:test";
import { apportion, buildPaymentSplit, validateSplits } from "./paymentSplit.js";

const order = (id, sellerId, totalAmount) => ({
  orderId: id,
  sellerId,
  subtotal: totalAmount,
  shippingFee: 0,
  totalAmount,
});

test("one storefront: the seller receives the full amount", () => {
  const { splits, totals } = buildPaymentSplit([order(1, 10, 2000)]);

  assert.equal(splits.length, 1);
  assert.equal(splits[0].grossAmount, 2000);
  assert.equal(splits[0].commissionAmount, 0);
  assert.equal(splits[0].netAmount, 2000);
  assert.deepEqual(validateSplits(splits, totals, 2000), []);
});

test("no platform commission is deducted, even if a rate is supplied", () => {
  const { splits, totals } = buildPaymentSplit([order(1, 10, 2000)], {
    commissionRate: 0.25,
  });

  assert.equal(splits[0].commissionAmount, 0);
  assert.equal(splits[0].commissionRate, 0);
  assert.equal(splits[0].netAmount, 2000);
  assert.equal(totals.commissionAmount, 0);
});

test("three storefronts each get their own share and the parts add up", () => {
  const orders = [order(1, 10, 1150), order(2, 20, 2150), order(3, 30, 500)];
  const { splits, totals } = buildPaymentSplit(orders);

  assert.equal(splits.length, 3);
  assert.deepEqual(splits.map((s) => s.grossAmount), [1150, 2150, 500]);
  // No commission, no shipping: the seller is owed the full item total.
  assert.deepEqual(splits.map((s) => s.netAmount), [1150, 2150, 500]);
  assert.equal(totals.grossAmount, 3800);
  assert.equal(totals.netAmount, 3800);
  assert.deepEqual(validateSplits(splits, totals, 3800), []);
});

test("a processor fee is spread proportionally and never makes a payout negative", () => {
  const orders = [order(1, 10, 1000), order(2, 20, 3000)];
  const { splits, totals } = buildPaymentSplit(orders, {
    processingFee: 100,
  });

  assert.deepEqual(splits.map((s) => s.processingFeeAmount), [25, 75]);
  assert.deepEqual(splits.map((s) => s.netAmount), [975, 2925]);
  assert.equal(totals.processingFeeAmount, 100);
  assert.deepEqual(validateSplits(splits, totals, 4000), []);
});

test("a fee larger than the payment cannot produce a negative payout", () => {
  const { splits, totals } = buildPaymentSplit([order(1, 10, 100)], {
    processingFee: 500,
  });

  assert.equal(splits[0].netAmount, 0);
  assert.ok(splits[0].processingFeeAmount <= 100);
  assert.deepEqual(validateSplits(splits, totals, 100), []);
});

test("no centavo is lost or duplicated when shares do not divide evenly", () => {
  const orders = [order(1, 10, 10.01), order(2, 20, 10.01), order(3, 30, 10.01)];
  const { splits, totals } = buildPaymentSplit(orders, {
    processingFee: 1.27,
  });

  assert.deepEqual(validateSplits(splits, totals, 30.03), []);
  assert.equal(totals.grossAmount, 30.03);
  // Everything collected is either commission, processor fee, or seller money.
  assert.equal(
    Math.round(
      (totals.commissionAmount + totals.processingFeeAmount + totals.netAmount) * 100,
    ),
    Math.round(totals.grossAmount * 100),
  );
});

test("apportion distributes an indivisible amount deterministically", () => {
  assert.deepEqual(apportion(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(apportion(10, [0, 0]), [5, 5]);
  assert.deepEqual(apportion(0, [5, 5]), [0, 0]);
});

test("every seller is paid, and only once, for a 5-storefront cart", () => {
  const orders = Array.from({ length: 5 }, (_, i) =>
    order(i + 1, 100 + i, 333.33),
  );
  const { splits, totals } = buildPaymentSplit(orders);

  assert.equal(new Set(splits.map((s) => s.sellerId)).size, 5);
  assert.equal(new Set(splits.map((s) => s.orderId)).size, 5);
  assert.deepEqual(validateSplits(splits, totals, 1666.65), []);
});

test("validation catches a split whose parts do not add up", () => {
  const broken = [
    {
      orderId: 1,
      sellerId: 10,
      grossAmount: 100,
      commissionAmount: 10,
      processingFeeAmount: 10,
      netAmount: 10,
    },
  ];
  const problems = validateSplits(
    broken,
    { grossAmount: 100 },
    100,
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0], /do not add up/);
});

test("accepts the checkout handler's plain `total` field", () => {
  const { splits, totals } = buildPaymentSplit(
    [
      { orderId: 8, sellerId: 4, subtotal: 1150, total: 1300 },
      { orderId: 9, sellerId: 5, subtotal: 2150, total: 2300 },
    ],
  );

  assert.deepEqual(splits.map((s) => s.grossAmount), [1300, 2300]);
  assert.equal(totals.grossAmount, 3600);
  assert.deepEqual(validateSplits(splits, totals, 3600), []);
});

test("a missing amount is rejected instead of silently becoming zero", () => {
  assert.throws(
    () => buildPaymentSplit([{ orderId: 1, sellerId: 1 }], {}),
    /invalid amount/,
  );
});
