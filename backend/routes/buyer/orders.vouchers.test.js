import assert from "node:assert/strict";
import test from "node:test";
import { databaseFixture, invoke, loadPaymentRoute } from "../../test/paymentHarness.js";

const validVoucher = (overrides = {}) => ({ voucher_id: 1, student_id: 5, code: "SAVE10", discount_type: "percentage", discount_value: "10.00", minimum_purchase: "100.00", applies_to_all: 1, is_active: 1, ...overrides });
function setup(vouchers = [validVoucher()], overrides = {}) {
  const fixture = databaseFixture({
    orders: [], orderItems: [], vouchers,
    cartItems: [{ add_to_id: 1, artwork_id: 20 }, { add_to_id: 1, artwork_id: 21 }, { add_to_id: 2, artwork_id: 20 }],
    ...overrides,
  });
  const sessions = [];
  const routes = loadPaymentRoute("../routes/buyer/orders.js", {
    ...fixture, getPayMongoPaymentMethodTypes: async () => ["card", "gcash", "paymaya", "qrph"],
    createPayMongoCheckoutSession: async (options) => {
      sessions.push(options);
      return { checkoutSessionId: "cs_test_voucher_fixture", checkoutUrl: "https://checkout.paymongo.com/test-fixture" };
    },
  });
  return { fixture, sessions, routes };
}

test("preview validates only selected buyer-owned cart items and never creates an order", async () => {
  const { fixture, routes, sessions } = setup();
  const result = await invoke(routes, "post", "/vouchers/validate", { body: { voucher_code: " save10 ", artwork_ids: [20, 21] } });
  assert.equal(result.status, 200);
  assert.equal(result.body.discount_amount, 100);
  assert.equal(result.body.subtotal, 3000);
  assert.equal(result.body.total, 2900);
  assert.equal(result.body.eligible_subtotal, 1000);
  assert.equal(fixture.state.orders.length, 0);
  assert.equal(sessions.length, 0);
  assert.equal((await invoke(routes, "post", "/vouchers/validate", { user: { customer_id: 2 }, body: { voucher_code: "SAVE10", artwork_ids: [21] } })).status, 400);
});

test("minimum warning cannot be bypassed with another seller or forged client totals", async () => {
  const { fixture, routes, sessions } = setup([validVoucher({ minimum_purchase: "1100.00" })]);
  const before = structuredClone(fixture.state);
  for (const path of ["/vouchers/validate", "/checkout"]) {
    const response = await invoke(routes, "post", path, { body: { voucher_code: "SAVE10", artwork_ids: [20, 21], address_id: 4, payment_method: "paymongo", subtotal: 999999, discount_amount: 1 } });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, "voucher_invalid");
    assert.match(response.body.message, /at least ₱1,100\.00/);
  }
  assert.deepEqual(fixture.state, before);
  assert.equal(sessions.length, 0);
});

test("discounted online checkout persists net item/seller prices and sends exactly that amount to PayMongo", async () => {
  const { fixture, routes, sessions } = setup();
  const response = await invoke(routes, "post", "/checkout", { body: { voucher_code: "SAVE10", artwork_ids: [20, 21], address_id: 4, payment_method: "paymongo", discount_amount: 2999.99 } });
  assert.equal(response.status, 201);
  assert.equal(response.body.total, 2900);
  assert.equal(response.body.discount_amount, 100);
  assert.deepEqual(fixture.state.orders.map(row => [row.subtotal, row.original_subtotal, row.discount_amount, row.voucher_code, row.total_amount]), [[900, 1000, 100, "SAVE10", 900], [2000, 2000, 0, null, 2000]]);
  assert.deepEqual(fixture.state.orderItems.map(row => [row.unit_price, row.original_unit_price]), [[900, 1000], [2000, 2000]]);
  assert.deepEqual(fixture.state.paymentSplits.map(row => row.gross_amount), [900, 2000]);
  assert.deepEqual(sessions[0].lineItems.map(row => row.amount), [90000, 200000]);
  assert.equal(sessions[0].lineItems.reduce((sum, row) => sum + row.amount, 0), 290000);
  assert.equal(fixture.state.cartItems.length, 3, "pending online payment keeps cart items");
});

test("COD uses the discounted price and removes only purchased cart items", async () => {
  const { fixture, routes, sessions } = setup();
  const response = await invoke(routes, "post", "/checkout", { body: { voucher_code: "SAVE10", artwork_ids: [20], address_id: 4, payment_method: "cod" } });
  assert.equal(response.status, 201);
  assert.equal(response.body.orders[0].total, 900);
  assert.equal(response.body.orders[0].discount, 100);
  assert.equal(sessions.length, 0);
  assert.deepEqual(fixture.state.cartItems, [{ add_to_id: 1, artwork_id: 21 }, { add_to_id: 2, artwork_id: 20 }]);
  assert.equal(fixture.state.paymentSplits[0].net_amount, 900);
});

test("checkout rechecks an expired or changed voucher after a successful preview", async () => {
  const { fixture, routes, sessions } = setup();
  const request = { body: { voucher_code: "SAVE10", artwork_ids: [20], address_id: 4, payment_method: "paymongo" } };
  assert.equal((await invoke(routes, "post", "/vouchers/validate", request)).status, 200);
  fixture.state.vouchers[0].is_active = 0;
  const response = await invoke(routes, "post", "/checkout", request);
  assert.equal(response.status, 400);
  assert.equal(response.body.code, "voucher_invalid");
  assert.equal(fixture.state.orders.length, 0);
  assert.equal(sessions.length, 0);
});

test("changed preview totals stop checkout before provider calls or order creation", async () => {
  const { fixture, routes, sessions } = setup();
  const before = structuredClone(fixture.state);
  const response = await invoke(routes, "post", "/checkout", { body: {
    voucher_code: "SAVE10", artwork_ids: [20, 21], address_id: 4,
    payment_method: "paymongo", expected_total_centavos: 280000,
  } });
  assert.equal(response.status, 409);
  assert.equal(response.body.code, "voucher_invalid");
  assert.match(response.body.message, /total changed/);
  assert.equal(sessions.length, 0);
  assert.deepEqual(fixture.state, before);
});

test("matching preview totals proceed and malformed snapshot amounts cannot place orders", async () => {
  const { routes, sessions } = setup();
  for (const expected_total_centavos of [0, -1, 1.5, "290000", null, Number.MAX_SAFE_INTEGER + 1]) {
    const response = await invoke(routes, "post", "/checkout", { body: {
      voucher_code: "SAVE10", artwork_ids: [20, 21], address_id: 4,
      payment_method: "paymongo", expected_total_centavos,
    } });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, "voucher_invalid");
  }
  assert.equal(sessions.length, 0);
  const response = await invoke(routes, "post", "/checkout", { body: {
    voucher_code: "SAVE10", artwork_ids: [20, 21], address_id: 4,
    payment_method: "paymongo", expected_total_centavos: 290000,
  } });
  assert.equal(response.status, 201);
  assert.equal(sessions.length, 1);
});

test("malformed bodies, invalid selections, and non-buyer claims fail before placing an order", async () => {
  const { routes, sessions } = setup();
  for (const body of [undefined, {}, { voucher_code: "SAVE10", artwork_ids: [] }, { voucher_code: "SAVE10", artwork_ids: ["20"] }, { voucher_code: {}, artwork_ids: [20] }]) {
    assert.equal((await invoke(routes, "post", "/vouchers/validate", { body })).status, 400);
  }
  assert.equal((await invoke(routes, "post", "/vouchers/validate", { user: { customer_id: 1, student_id: 5 }, body: { voucher_code: "SAVE10", artwork_ids: [20] } })).status, 403);
  assert.equal((await invoke(routes, "post", "/checkout", { body: undefined })).status, 400);
  assert.equal(sessions.length, 0);
});
