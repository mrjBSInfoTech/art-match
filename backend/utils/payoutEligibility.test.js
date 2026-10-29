import assert from "node:assert/strict";
import test from "node:test";
import { getPayoutHoldPolicy, loadPayoutEligibility, payoutToCentavos, refreshSellerPayoutEligibility } from "./payoutEligibility.js";

function fixture(overrides = {}) {
  const state = {
    order: { order_id: 41, seller_id: 17, customer_id: 7, payment_method: "paymongo", payment_status: "Paid",
      paymongo_payment_id: "pay_test_original", status: "Delivered", delivered_at: "2026-10-01 15:00:00",
      payout_eligible_at: "2026-10-08 15:00:00", payout_hold_elapsed: 1,
      subtotal: "300.00", shipping_fee: "0.00", total_amount: "300.00", ...overrides.order },
    split: { split_id: 21, order_id: 41, seller_id: 17, currency: "PHP", gross_amount: "300.00",
      commission_amount: "0.00", processing_fee_amount: "0.00", net_amount: "300.00", payout_status: "Held", ...overrides.split },
    items: overrides.items ?? [
      { order_item_id: 51, order_id: 41, unit_price: "100.00", quantity: 2 },
      { order_item_id: 52, order_id: 41, unit_price: "100.00", quantity: 1 },
    ],
    returnRows: overrides.returnRows ?? [], refunds: overrides.refunds ?? [],
  };
  const calls = [];
  const executor = {
    async query(sql, params = []) {
      sql = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql, params: structuredClone(params) });
      if (/^SELECT o\.order_id/.test(sql)) {
        assert.match(sql, /o\.payment_method = 'paymongo'/);
        assert.match(sql, /o\.payment_status IN \('Paid', 'Refunded'\)/);
        const sellerMatch = !/o\.seller_id = \?/.test(sql) || Number(params[0]) === Number(state.order.seller_id);
        return [[state.order.payment_method === "paymongo" && ["Paid", "Refunded"].includes(state.order.payment_status) && sellerMatch ? { order_id: 41 } : null].filter(Boolean)];
      }
      if (/^SELECT o\.\*/.test(sql)) return [[overrides.missingOrder ? null : state.order].filter(Boolean)];
      if (/^SELECT \* FROM seller_payment_split/.test(sql)) return [[overrides.missingSplit ? null : state.split].filter(Boolean)];
      if (/FROM marketplace_order_item/.test(sql)) return [state.items];
      if (/FROM marketplace_return_request/.test(sql)) return [state.returnRows];
      if (/FROM seller_order_refund/.test(sql)) return [state.refunds];
      if (/^UPDATE seller_payment_split/.test(sql)) {
        assert.equal(params[6], state.split.payout_status);
        assert.match(sql, /payout_status NOT IN \('Processing', 'Paid'\)/);
        state.split.payout_status = params[0];
        state.split.refund_amount = params[1];
        state.split.payout_amount = params[2];
        state.split.hold_reason = params[3];
        state.split.eligible_at = params[4];
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected eligibility SQL: ${sql}`);
    },
  };
  return { state, calls, executor, load: (options) => loadPayoutEligibility(executor, 41, options),
    refresh: (options) => refreshSellerPayoutEligibility(executor, options) };
}

const returned = (status, extra = {}) => ({
  return_request_id: 61, order_id: 41, seller_id: 17, customer_id: 7,
  status, order_item_id: 51, return_quantity: 2, ...extra,
});
const refund = (status, extra = {}) => ({
  refund_id: 71, order_id: 41, return_request_id: 61, provider_refund_id: "ref_test_one",
  provider_payment_id: "pay_test_original", amount: "200.00", status, ...extra,
});

test("immediate payout policy requires an explicit flag and TEST credentials", () => {
  for (const env of [
    {}, { PAYMONGO_SECRET_KEY: "sk_test_fixture" },
    { PAYMONGO_TEST_PAYOUT_IMMEDIATE: "true" },
    { PAYMONGO_SECRET_KEY: "sk_live_fixture", PAYMONGO_TEST_PAYOUT_IMMEDIATE: "true" },
    { PAYMONGO_SECRET_KEY: "sk_test_fixture", PAYMONGO_TEST_PAYOUT_IMMEDIATE: "false" },
  ]) assert.deepEqual(getPayoutHoldPolicy(env), { holdDays: 7, immediateTestPayouts: false });
  assert.deepEqual(getPayoutHoldPolicy({ PAYMONGO_SECRET_KEY: "sk_test_fixture", PAYMONGO_TEST_PAYOUT_IMMEDIATE: "true" }),
    { holdDays: 0, immediateTestPayouts: true });
});

test("the existing immediate flag also supports explicit demo mode, but never production or an unknown provider", () => {
  assert.deepEqual(getPayoutHoldPolicy({ PAYOUT_PROVIDER: "demo", PAYMONGO_TEST_PAYOUT_IMMEDIATE: "true", NODE_ENV: "development" }),
    { holdDays: 0, immediateTestPayouts: true });
  for (const env of [
    { PAYOUT_PROVIDER: "demo", PAYMONGO_TEST_PAYOUT_IMMEDIATE: "false" },
    { PAYOUT_PROVIDER: "demo", NODE_ENV: "production" },
    { PAYOUT_PROVIDER: "paymongo", NODE_ENV: "production", PAYMONGO_SECRET_KEY: "sk_test_fixture" },
    { PAYOUT_PROVIDER: "paymongo", NODE_ENV: "development", PAYMONGO_SECRET_KEY: "sk_live_fixture" },
    { PAYOUT_PROVIDER: "unknown", PAYMONGO_SECRET_KEY: "sk_test_fixture" },
  ]) assert.deepEqual(getPayoutHoldPolicy({ PAYMONGO_TEST_PAYOUT_IMMEDIATE: "true", ...env }),
    { holdDays: 7, immediateTestPayouts: false });
});

test("immediate TEST eligibility uses database delivery time and retains payment, delivery and refund holds", async (t) => {
  const previous = { key: process.env.PAYMONGO_SECRET_KEY, flag: process.env.PAYMONGO_TEST_PAYOUT_IMMEDIATE };
  t.after(() => {
    for (const [name, value] of [["PAYMONGO_SECRET_KEY", previous.key], ["PAYMONGO_TEST_PAYOUT_IMMEDIATE", previous.flag]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
  process.env.PAYMONGO_SECRET_KEY = "sk_test_fixture";
  process.env.PAYMONGO_TEST_PAYOUT_IMMEDIATE = "true";
  const current = fixture({ order: { payout_eligible_at: "2026-10-01 15:00:00" } });
  const [result] = await current.refresh();
  assert.equal(result.canSend, true);
  assert.equal(result.eligibleAt, current.state.order.delivered_at);
  assert.match(current.calls.find(call => /^SELECT o\.\*/.test(call.sql)).sql,
    /CURRENT_TIMESTAMP >= DATE_ADD\(o\.delivered_at, INTERVAL 0 DAY\)/);
  for (const overrides of [
    { order: { payment_status: "Pending" } }, { order: { status: "Shipped" } },
    { order: { delivered_at: null } }, { order: { payout_hold_elapsed: 0 } },
    { returnRows: [returned("Requested")] },
    { returnRows: [returned("Completed")], refunds: [refund("Pending")] },
  ]) assert.equal((await fixture(overrides).load()).nextStatus, "Held");

  process.env.PAYMONGO_SECRET_KEY = "sk_live_fixture";
  const live = fixture({ order: { payout_hold_elapsed: 0 } });
  assert.equal((await live.load()).nextStatus, "Held");
  assert.match(live.calls[0].sql, /INTERVAL 7 DAY/);
});

test("eligibility uses exact MySQL seven-day deadline and never an application clock", async () => {
  const current = fixture();
  const result = await current.load({ lock: true });
  assert.equal(result.nextStatus, "Eligible");
  assert.equal(result.payoutAmountCentavos, 30000);
  assert.equal(result.eligibleAt, "2026-10-08 15:00:00");
  assert.equal(result.canSend, false, "Held must be refreshed before execution");
  assert.match(current.calls[0].sql, /CURRENT_TIMESTAMP >= DATE_ADD\(o\.delivered_at, INTERVAL 7 DAY\)/);
  assert.match(current.calls[0].sql, /FOR UPDATE$/);
  assert.match(current.calls[1].sql, /FROM seller_payment_split.*FOR UPDATE$/);
});

for (const [name, order, expected] of [
  ["payment is pending", { payment_status: "Pending" }, /confirmed buyer payment/],
  ["paid but not delivered", { status: "Shipped" }, /delivery/],
  ["delivery timestamp absent", { delivered_at: null }, /delivery timestamp/],
  ["less than seven days elapsed", { payout_hold_elapsed: 0 }, /7-day/],
]) {
  test(`holds earnings when ${name}`, async () => {
    const result = await fixture({ order }).load();
    assert.equal(result.nextStatus, "Held");
    assert.match(result.holdReason, expected);
    assert.equal(result.canSend, false);
  });
}

for (const status of ["Requested", "Approved", "Return Shipped", "Received"]) {
  test(`${status} return holds payout beyond the deadline`, async () => {
    const result = await fixture({ returnRows: [returned(status)] }).load();
    assert.equal(result.nextStatus, "Held");
    assert.match(result.holdReason, /unresolved/);
  });
}

for (const status of ["Rejected", "Cancelled"]) {
  test(`${status} return allows eligibility after original deadline`, async () => {
    assert.equal((await fixture({ returnRows: [returned(status)] }).load()).nextStatus, "Eligible");
  });
}

test("completed physical return stays held without successful financial refund", async () => {
  const result = await fixture({ returnRows: [returned("Completed")] }).load();
  assert.equal(result.nextStatus, "Held");
  assert.match(result.holdReason, /verified refund resolution/);
  assert.equal(result.refundAmountCentavos, 0);
  assert.equal(result.payoutAmountCentavos, 30000);
});

test("pending buyer refund holds payout without prematurely subtracting money", async () => {
  const result = await fixture({ returnRows: [returned("Completed")], refunds: [refund("Pending")] }).load();
  assert.equal(result.nextStatus, "Held");
  assert.match(result.holdReason, /refund is still processing/);
  assert.equal(result.refundAmountCentavos, 0);
  assert.equal(result.payoutAmountCentavos, 30000);
});

test("verified selected-item partial refund releases only the remaining seller value", async () => {
  const result = await fixture({ returnRows: [returned("Completed")], refunds: [refund("Succeeded")] }).load();
  assert.equal(result.nextStatus, "Eligible");
  assert.equal(result.grossAmountCentavos, 30000);
  assert.equal(result.refundAmountCentavos, 20000);
  assert.equal(result.payoutAmountCentavos, 10000);
  assert.equal(result.returns[0].returned_amount_centavos, 20000);
  assert.equal(result.returns[0].succeeded_refund_centavos, 20000);
});

test("partial successful refund on a completed return does not resolve its remainder", async () => {
  const result = await fixture({ returnRows: [returned("Completed")], refunds: [refund("Succeeded", { amount: "100.00" })] }).load();
  assert.equal(result.nextStatus, "Held");
  assert.equal(result.payoutAmountCentavos, 20000);
});

test("full verified refund cancels the payout and never creates a zero-value transfer", async () => {
  const current = fixture({ returnRows: [returned("Completed"), returned("Completed", { order_item_id: 52, return_quantity: 1 })],
    refunds: [refund("Succeeded", { amount: "300.00" })] });
  const [result] = await current.refresh();
  assert.equal(result.nextStatus, "Cancelled");
  assert.equal(result.payoutAmountCentavos, 0);
  assert.equal(current.state.split.payout_status, "Cancelled");
  assert.equal(current.state.split.payout_amount, 0);
});

test("failed financial refund does not release a completed return", async () => {
  const result = await fixture({ returnRows: [returned("Completed")], refunds: [refund("Failed")] }).load();
  assert.equal(result.nextStatus, "Held");
  assert.equal(result.refundAmountCentavos, 0);
});

for (const [name, change] of [
  ["refund belongs to another payment", { provider_payment_id: "pay_test_other" }],
  ["refund belongs to another order", { order_id: 99 }],
  ["refund refers to another return", { return_request_id: 999 }],
  ["refund evidence has unknown status", { status: "Received" }],
  ["refund exceeds return value", { amount: "250.00" }],
  ["refund exceeds order value", { amount: "301.00", return_request_id: null }],
]) {
  test(`invalid accounting remains held: ${name}`, async () => {
    const result = await fixture({ returnRows: [returned("Completed")], refunds: [refund("Succeeded", change)] }).load();
    assert.equal(result.nextStatus, "Held");
    assert.equal(result.canSend, false);
    assert.ok(result.payoutAmountCentavos >= 0);
  });
}

test("the same provider refund cannot be deducted twice", async () => {
  const result = await fixture({ returnRows: [returned("Completed")], refunds: [refund("Succeeded"), refund("Succeeded", { refund_id: 72 })] }).load();
  assert.equal(result.nextStatus, "Held");
  assert.match(result.holdReason, /Refund evidence/);
});

for (const [name, overrides] of [
  ["split total does not match order", { split: { gross_amount: "301.00" } }],
  ["split net does not balance", { split: { net_amount: "299.00" } }],
  ["split belongs to different seller", { split: { seller_id: 999 } }],
  ["currency changed", { split: { currency: "USD" } }],
  ["unsupported historical commission", { split: { commission_amount: "1.00", net_amount: "299.00" } }],
  ["unsupported shipping policy", { order: { shipping_fee: "1.00", total_amount: "301.00" }, split: { gross_amount: "301.00", net_amount: "301.00" } }],
  ["item quantities do not match subtotal", { items: [{ order_item_id: 51, order_id: 41, unit_price: "100.00", quantity: 1 }] }],
  ["missing purchased items", { items: [] }],
  ["invalid item quantity", { items: [{ order_item_id: 51, order_id: 41, unit_price: "100.00", quantity: -3 }] }],
  ["fractional centavos", { split: { net_amount: "300.001" } }],
]) {
  test(`inconsistent trusted accounting fails closed: ${name}`, async () => {
    const result = await fixture(overrides).load();
    assert.equal(result.nextStatus, "Held");
    assert.equal(result.canSend, false);
  });
}

test("COD is never listed, made eligible, or transferred by payout refresh", async () => {
  const current = fixture({ order: { payment_method: "cod" }, split: { payout_status: "Eligible" } });
  assert.equal((await current.load()).nextStatus, "Cancelled");
  assert.deepEqual(await current.refresh(), []);
  assert.ok(!current.calls.some((call) => call.sql.startsWith("UPDATE")));
});

test("unpaid allocations never become payable earnings", async () => {
  const current = fixture({ order: { payment_status: "Pending" } });
  assert.deepEqual(await current.refresh(), []);
  assert.ok(!current.calls.some((call) => call.sql.startsWith("UPDATE")));
});

test("refresh persists Eligible without calling a provider and respects seller scope", async () => {
  const current = fixture();
  assert.deepEqual(await current.refresh({ sellerId: 999 }), []);
  const [result] = await current.refresh({ sellerId: 17 });
  assert.equal(current.state.split.payout_status, "Eligible");
  assert.equal(current.state.split.payout_amount, 300);
  assert.equal(result.canSend, true);
  assert.equal((await current.refresh({ sellerId: 17 }))[0].payoutAmountCentavos, 30000);
});

for (const status of ["Processing", "Paid"]) {
  test(`refresh never overwrites existing ${status} transfer state`, async () => {
    const current = fixture({ split: { payout_status: status }, returnRows: [returned("Requested")] });
    const [result] = await current.refresh();
    assert.equal(result.nextStatus, status);
    assert.equal(result.canSend, false);
    assert.ok(!current.calls.some((call) => call.sql.startsWith("UPDATE")));
  });
}

test("Failed cannot be automatically rearmed during any eligibility refresh", async () => {
  const current = fixture({ split: { payout_status: "Failed" } });
  assert.equal((await current.refresh())[0].nextStatus, "Eligible");
  assert.equal(current.state.split.payout_status, "Failed");
  current.state.returnRows = [returned("Requested")];
  assert.equal((await current.refresh())[0].nextStatus, "Held");
  assert.equal(current.state.split.payout_status, "Failed");
  current.state.returnRows = [returned("Cancelled")];
  assert.equal((await current.refresh())[0].canSend, false);
  assert.equal(current.state.split.payout_status, "Failed");
});

test("legacy Reversed balances do not revive on refresh", async () => {
  const current = fixture({ split: { payout_status: "Reversed" } });
  assert.equal((await current.refresh())[0].nextStatus, "Reversed");
  assert.equal(current.state.split.payout_status, "Reversed");
});

test("already Refunded online order is cancelled even if older evidence predates ledger", async () => {
  const current = fixture({ order: { payment_status: "Refunded" } });
  const [result] = await current.refresh();
  assert.equal(result.nextStatus, "Cancelled");
  assert.equal(result.payoutAmountCentavos, 0);
});

test("missing order or split does not fabricate earnings", async () => {
  assert.equal(await fixture({ missingOrder: true }).load(), null);
  assert.equal(await fixture({ missingSplit: true }).load(), null);
});

test("amount conversion rejects unsafe, negative and fractional-cent money", () => {
  assert.equal(payoutToCentavos("123.45"), 12345);
  assert.equal(payoutToCentavos("0.00"), 0);
  for (const value of [null, undefined, "", -1, Infinity, "0.001", "9007199254740992", {}]) {
    assert.throws(() => payoutToCentavos(value));
  }
  assert.throws(() => payoutToCentavos(0, { allowZero: false }));
});
