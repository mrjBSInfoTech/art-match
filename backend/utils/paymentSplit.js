/*
 * Splitting one buyer payment across several seller orders.
 *
 * All arithmetic is done in integer centavos. Percentages are applied to each
 * seller's own gross amount, and every remainder is assigned deterministically
 * so the parts always add back up to the whole — a peso must never vanish or
 * appear twice when a cart spans multiple storefronts.
 */

const toCentavos = (pesos) => Math.round(Number(pesos || 0) * 100);
const toPesos = (centavos) => Number((centavos / 100).toFixed(2));
// Sum values that are already in pesos exactly once, in centavos.
const pesosSum = (values) =>
  toPesos(values.reduce((sum, value) => sum + toCentavos(value), 0));

/*
 * Largest-remainder apportionment: give everyone their floor, then hand out
 * the leftover centavos to the largest fractional remainders (ties broken by
 * order, so the result is stable across runs).
 */
export const apportion = (totalCentavos, weightsCentavos) => {
  const total = Math.max(0, Math.round(totalCentavos));
  const weightSum = weightsCentavos.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) {
    return total === 0 ? weightsCentavos.map(() => 0) : apportionByEqually(total, weightsCentavos.length);
  }

  const shares = weightsCentavos.map((weight) => (total * weight) / weightSum);
  const floors = shares.map((share) => Math.floor(share));
  let leftover = total - floors.reduce((sum, value) => sum + value, 0);

  const order = shares
    .map((share, index) => ({ index, remainder: share - Math.floor(share) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let i = 0; leftover > 0 && i < order.length; i += 1) {
    floors[order[i].index] += 1;
    leftover -= 1;
  }

  // A pathological leftover (more centavos than entries) loops back around.
  let cursor = 0;
  while (leftover > 0) {
    floors[cursor % floors.length] += 1;
    leftover -= 1;
    cursor += 1;
  }

  return floors;
};

const apportionByEqually = (total, count) => {
  if (count === 0) return [];
  const base = Math.floor(total / count);
  const parts = new Array(count).fill(base);
  for (let i = 0; i < total - base * count; i += 1) parts[i] += 1;
  return parts;
};

/**
 * @param {Array<{orderId:number, sellerId:number, subtotal:number, shippingFee:number, totalAmount:number}>} orders
 * @param {{commissionRate?: number, processingFee?: number}} options
 *        processingFee is the processor's charge on the WHOLE payment (pesos).
 */
export const buildPaymentSplit = (orders, { commissionRate = 0, processingFee = 0 } = {}) => {
  if (!orders.length) return { splits: [], totals: emptyTotals() };

  /*
   * No platform commission is charged: ArtMatch takes no share of a sale, so
   * each seller is owed the full amount of their items. A caller-supplied rate
   * is ignored rather than applied, so an old call site cannot start
   * deducting money.
   */
  void commissionRate;
  const rate = 0;
  // Accept the plain-`total` shape used by the checkout handler as well as the
  // explicit `totalAmount`. Anything non-numeric is treated as a hard error
  // rather than quietly becoming zero.
  const amountOf = (order) => {
    const value = order.totalAmount ?? order.total;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(
        `Cannot split order ${order.orderId}: invalid amount ${JSON.stringify(value)}`,
      );
    }
    return amount;
  };

  const grossCentavos = orders.map((order) => toCentavos(amountOf(order)));
  const grossTotal = grossCentavos.reduce((sum, value) => sum + value, 0);

  // The processor fee is charged once on the whole payment, so it is spread
  // across sellers in proportion to what each one contributed. It is never
  // allowed to exceed a seller's gross (no negative payouts).
  const feeCentavos = Math.min(Math.max(0, toCentavos(processingFee)), grossTotal);
  const feeShares = apportion(feeCentavos, grossCentavos);

  /*
   * Commission and processor fees are charged on the WHOLE payment, then
   * apportioned. Rounding each seller's slice independently would leave the
   * platform's total slightly short (or over) versus what was actually
   * charged, so both are computed once from the total and split by weight.
   */
  const commissionTotal = Math.round(grossTotal * rate);
  const commissionShares = apportion(commissionTotal, grossCentavos);

  const splits = orders.map((order, index) => {
    const gross = grossCentavos[index];
    const commission = commissionShares[index];
    const fee = Math.min(feeShares[index], Math.max(0, gross - commission));
    const net = gross - commission - fee;

    return {
      orderId: order.orderId,
      sellerId: order.sellerId,
      currency: "PHP",
      grossAmount: toPesos(gross),
      commissionRate: rate,
      commissionAmount: toPesos(commission),
      processingFeeAmount: toPesos(fee),
      netAmount: toPesos(net),
    };
  });

  return {
    splits,
    totals: {
      currency: "PHP",
      grossAmount: pesosSum(splits.map((s) => s.grossAmount)),
      commissionAmount: pesosSum(splits.map((s) => s.commissionAmount)),
      processingFeeAmount: pesosSum(splits.map((s) => s.processingFeeAmount)),
      netAmount: pesosSum(splits.map((s) => s.netAmount)),
      sellerCount: splits.length,
    },
  };
};

const emptyTotals = () => ({
  currency: "PHP",
  grossAmount: 0,
  commissionAmount: 0,
  processingFeeAmount: 0,
  netAmount: 0,
  sellerCount: 0,
});

/**
 * Invariants every split must satisfy. Used before persisting and in tests.
 */
export const validateSplits = (splits, totals, expectedGross) => {
  const problems = [];
  const sum = (key) => toCentavos(splits.reduce((acc, split) => acc + Number(split[key] || 0), 0));
  const totalGross = toCentavos(totals.grossAmount);

  for (const split of splits) {
    const parts = toCentavos(split.commissionAmount) + toCentavos(split.processingFeeAmount) + toCentavos(split.netAmount);
    if (parts !== toCentavos(split.grossAmount)) {
      problems.push(`order ${split.orderId}: parts do not add up to gross`);
    }
    if (toCentavos(split.netAmount) < 0) {
      problems.push(`order ${split.orderId}: negative seller payout`);
    }
  }

  if (sum("grossAmount") !== totalGross) {
    problems.push("split gross does not match its own total");
  }
  if (expectedGross !== undefined && sum("grossAmount") !== toCentavos(expectedGross)) {
    problems.push("split gross does not match the payment amount");
  }

  return problems;
};
