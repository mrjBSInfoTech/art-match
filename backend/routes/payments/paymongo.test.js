import assert from "node:assert/strict";
import { after, test } from "node:test";
import { databaseFixture, invoke, loadPaymentRoute, signedEvent } from "../../test/paymentHarness.js";

const originalEnvironment = {
  PAYMONGO_SECRET_KEY: process.env.PAYMONGO_SECRET_KEY,
  PAYMONGO_WEBHOOK_SECRET: process.env.PAYMONGO_WEBHOOK_SECRET,
};
process.env.PAYMONGO_SECRET_KEY = "sk_test_isolated_fixture";
process.env.PAYMONGO_WEBHOOK_SECRET = "isolated-webhook-fixture";
after(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

const setup = overrides => {
  const fixture = databaseFixture(overrides);
  const routes = loadPaymentRoute("../routes/payments/paymongo.js", fixture);
  return { fixture, post: event => invoke(routes, "post", "/webhook", event) };
};

test("signed paid checkout atomically pays every seller and removes only its buyer's paid items", async () => {
  const { fixture, post } = setup();
  const result = await post(signedEvent());
  assert.equal(result.status, 200);
  assert.equal(result.body.payment_status, "Paid");
  assert.equal(fixture.state.orders.length, 2);
  for (const order of fixture.state.orders) {
    assert.equal(order.payment_status, "Paid");
    assert.equal(order.status, "Pending", "fulfillment status must remain separate");
    assert.equal(order.paymongo_payment_id, "pay_test_paid");
    assert.equal(order.paymongo_payment_method, "card");
    assert.equal(new Date(order.paid_at).getTime(), 1792872000000);
  }
  assert.deepEqual(fixture.state.cartItems, [{ add_to_id: 1, artwork_id: 30 }, { add_to_id: 2, artwork_id: 20 }]);
  assert.equal(fixture.state.carts[0].total_price, 500);
  assert.equal(fixture.state.carts[1].total_price, 1000);
  assert.deepEqual(fixture.state.interactions.map(item => item.artworkId).sort(), [20, 21]);
  assert.ok(fixture.state.interactions.every(item => item.eventType === "purchase"));
  assert.ok(fixture.calls.some(call => /FOR UPDATE/i.test(call.sql || "")), "payment group must be locked");
  const groupSelect = fixture.calls.find(call => /^SELECT order_id/i.test(call.sql || ""));
  assert.match(groupSelect.sql, /WHERE payment_reference = \?/i);
  assert.doesNotMatch(groupSelect.sql, /AND (?:payment_method|paymongo_checkout_session_id)\s*=/i,
    "lock and validate the whole group rather than silently dropping a mismatched seller order");
  assert.equal(fixture.calls.filter(call => call.type === "commit").length, 1);
});

test("duplicate paid webhook returns success without repeating purchases or deleting re-added cart items", async () => {
  const { fixture, post } = setup();
  assert.equal((await post(signedEvent())).status, 200);
  fixture.state.cartItems.push({ add_to_id: 1, artwork_id: 20 });
  const mutationsBefore = fixture.calls.filter(call => /^(UPDATE|DELETE)/i.test(call.sql || "")).length;
  const result = await post(signedEvent());
  assert.equal(result.status, 200);
  assert.equal(result.body.already_processed, true);
  assert.equal(fixture.state.interactions.length, 2);
  assert.ok(fixture.state.cartItems.some(item => item.add_to_id === 1 && item.artwork_id === 20));
  assert.equal(fixture.calls.filter(call => /^(UPDATE|DELETE)/i.test(call.sql || "")).length, mutationsBefore);
});

test("paid e-wallet and QR channels use the same trusted state transition and retain the actual channel", async () => {
  for (const channel of ["gcash", "paymaya", "qrph"]) {
    const { fixture, post } = setup();
    const result = await post(signedEvent({ mutate: session => { session.attributes.payments[0].attributes.source.type = channel; } }));
    assert.equal(result.status, 200);
    assert.ok(fixture.state.orders.every(order => order.payment_status === "Paid" && order.paymongo_payment_method === channel));
    assert.deepEqual(fixture.state.cartItems, [{ add_to_id: 1, artwork_id: 30 }, { add_to_id: 2, artwork_id: 20 }]);
  }
});

test("failure while updating cart rolls all sellers and recommendation interactions back", async () => {
  const { fixture, post } = setup();
  const before = structuredClone(fixture.state);
  fixture.setFail(sql => /^UPDATE add_cart/i.test(sql));
  const result = await post(signedEvent());
  assert.equal(result.status, 500);
  assert.deepEqual(fixture.state, before);
  assert.ok(fixture.calls.some(call => call.type === "rollback"));
  assert.ok(!fixture.calls.some(call => call.type === "commit"));
});

for (const [name, mutate] of [
  ["wrong currency", session => { session.attributes.payments[0].attributes.currency = "USD"; }],
  ["underpayment", session => { session.attributes.payments[0].attributes.amount = 329999; }],
  ["overpayment", session => { session.attributes.payments[0].attributes.amount = 330001; }],
  ["fractional centavos", session => { session.attributes.payments[0].attributes.amount = 330000.5; }],
  ["wrong checkout session", session => { session.id = "cs_wrong_session"; }],
  ["wrong reference", session => { session.attributes.reference_number = "AM-wrong-reference"; }],
  ["no paid payment", session => { session.attributes.payments[0].attributes.status = "failed"; }],
  ["missing payment ID", session => { delete session.attributes.payments[0].id; }],
  ["two paid payments in one session", session => { session.attributes.payments.push({ ...structuredClone(session.attributes.payments[0]), id: "pay_unexpected_second" }); }],
]) {
  test(`rejects ${name} without changing any order, cart or purchase interaction`, async () => {
    const { fixture, post } = setup();
    const before = structuredClone(fixture.state);
    const result = await post(signedEvent({ mutate }));
    assert.ok(result.status >= 400 && result.status < 500, `Expected explicit rejection, got ${result.status}`);
    assert.deepEqual(fixture.state, before);
  });
}

for (const secondCustomerId of [1, 2]) {
  test(`a second paid checkout for the last artwork cannot oversell it (${secondCustomerId === 1 ? "legacy same-buyer retry" : "different buyers"})`, async () => {
    const original = databaseFixture().state;
    const firstOrder = original.orders[0];
    const competingOrder = { ...firstOrder, order_id: 201, customer_id: secondCustomerId,
      payment_reference: "AM-competing-checkout", paymongo_checkout_session_id: "cs_competing_checkout" };
    const { fixture, post } = setup({ orders: [firstOrder, competingOrder], orderItems: [
      { order_id: 101, artwork_id: 20, quantity: 1 }, { order_id: 201, artwork_id: 20, quantity: 1 },
    ] });
    const firstEvent = signedEvent({ mutate: session => { session.attributes.payments[0].attributes.amount = 115000; } });
    assert.equal((await post(firstEvent)).status, 200);
    assert.equal(fixture.state.orders[0].payment_status, "Paid");
    assert.equal(fixture.state.orders[0].status, "Pending");
    if (secondCustomerId === 1) fixture.state.cartItems.push({ add_to_id: 1, artwork_id: 20 });
    const cartBeforeSecond = structuredClone(fixture.state.cartItems);
    const secondEvent = signedEvent({ mutate: session => {
      session.id = "cs_competing_checkout";
      session.attributes.reference_number = "AM-competing-checkout";
      session.attributes.payments[0].id = "pay_competing_payment";
      session.attributes.payments[0].attributes.amount = 115000;
    } });
    const result = await post(secondEvent);
    assert.equal(result.status, 200);
    assert.equal(result.body.requires_refund_review, true);
    assert.equal(fixture.state.orders[1].payment_status, "Paid", "record real receipt of funds");
    assert.equal(fixture.state.orders[1].status, "Cancelled", "block fulfillment and stock deduction");
    assert.equal(fixture.state.orders[1].paymongo_payment_id, "pay_competing_payment");
    assert.equal(fixture.state.orders.filter(order => order.payment_status === "Paid" && order.status !== "Cancelled").length, 1);
    assert.deepEqual(fixture.state.cartItems, cartBeforeSecond);
    assert.equal(fixture.state.interactions.length, 1);
    const duplicate = await post(secondEvent);
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.already_processed, true);
    assert.deepEqual(fixture.state.cartItems, cartBeforeSecond);
    assert.equal(fixture.state.interactions.length, 1);
  });
}

test("stock-tracked payment accepts exactly remaining quantity and cancels an oversubscribed checkout", async () => {
  for (const stock of [2, 3]) {
    const original = databaseFixture().state;
    const activeOrder = { ...original.orders[0], total_amount: "2150.00" };
    const previousOrder = { ...original.orders[0], order_id: 201, customer_id: 2,
      payment_method: "cod", payment_reference: null, paymongo_checkout_session_id: null };
    const { fixture, post } = setup({ orders: [activeOrder, previousOrder], orderItems: [
      { order_id: 101, artwork_id: 20, quantity: 2 }, { order_id: 201, artwork_id: 20, quantity: 1 },
    ] });
    fixture.state.artworks[0].stock_available = stock;
    const beforeCart = structuredClone(fixture.state.cartItems);
    const result = await post(signedEvent({ mutate: session => { session.attributes.payments[0].attributes.amount = 215000; } }));
    assert.equal(result.status, 200);
    assert.equal(fixture.state.orders[0].payment_status, "Paid");
    if (stock === 2) {
      assert.equal(result.body.requires_refund_review, true);
      assert.equal(fixture.state.orders[0].status, "Cancelled");
      assert.deepEqual(fixture.state.cartItems, beforeCart);
      assert.equal(fixture.state.interactions.length, 0);
    } else {
      assert.equal(result.body.requires_refund_review, false);
      assert.equal(fixture.state.orders[0].status, "Pending");
      assert.ok(!fixture.state.cartItems.some(item => item.add_to_id === 1 && item.artwork_id === 20));
      assert.equal(fixture.state.interactions.length, 1);
    }
  }
});

test("an untracked original artwork cannot fulfill a paid quantity greater than one", async () => {
  const { fixture, post } = setup();
  fixture.state.orderItems[0].quantity = 2;
  const cartBefore = structuredClone(fixture.state.cartItems);
  const result = await post(signedEvent());
  assert.equal(result.status, 200);
  assert.equal(result.body.requires_refund_review, true);
  assert.ok(fixture.state.orders.every(order => order.status === "Cancelled" && order.payment_status === "Paid"));
  assert.deepEqual(fixture.state.cartItems, cartBefore);
  assert.equal(fixture.state.interactions.length, 0);
});

test("a stock conflict cancels the complete multi-seller checkout and preserves all its cart items", async () => {
  const { fixture, post } = setup();
  fixture.state.artworks[0].is_sold = 1;
  const cartBefore = structuredClone(fixture.state.cartItems);
  const result = await post(signedEvent());
  assert.equal(result.status, 200);
  assert.equal(result.body.requires_refund_review, true);
  assert.ok(fixture.state.orders.every(order => order.status === "Cancelled" && order.payment_status === "Paid"));
  assert.deepEqual(fixture.state.cartItems, cartBefore);
  assert.equal(fixture.state.interactions.length, 0);
});

test("missing purchased artwork is recorded for refund review rather than becoming fulfillable", async () => {
  const { fixture, post } = setup();
  fixture.state.artworks = fixture.state.artworks.filter(art => art.artwork_id !== 20);
  const result = await post(signedEvent());
  assert.equal(result.status, 200);
  assert.equal(result.body.requires_refund_review, true);
  assert.ok(fixture.state.orders.every(order => order.status === "Cancelled" && order.payment_status === "Paid"));
  assert.equal(fixture.state.interactions.length, 0);
});

test("withdrawn availability or upload approval after checkout blocks fulfillment and requests refund review", async () => {
  for (const withdrawn of [{ status: "Unavailable" }, { is_verified: 0 }]) {
    const { fixture, post } = setup();
    Object.assign(fixture.state.artworks[0], withdrawn);
    const cartBefore = structuredClone(fixture.state.cartItems);
    const result = await post(signedEvent());
    assert.equal(result.status, 200);
    assert.equal(result.body.requires_refund_review, true);
    assert.ok(fixture.state.orders.every(order => order.status === "Cancelled" && order.payment_status === "Paid"));
    assert.deepEqual(fixture.state.cartItems, cartBefore);
    assert.equal(fixture.state.interactions.length, 0);
  }
});

test("missing or invalid signature is rejected before a database connection is acquired", async () => {
  for (const request of [signedEvent({}, { invalid: true }), { ...signedEvent(), get: () => null }]) {
    const { fixture, post } = setup();
    assert.equal((await post(request)).status, 401);
    assert.equal(fixture.calls.length, 0);
  }
});

test("a live event signed with only the test digest is rejected", async () => {
  const { fixture, post } = setup();
  const event = signedEvent({}, { live: true });
  const originalGet = event.get;
  event.get = () => originalGet().replace("te=,li=", "te=").concat(",li=");
  assert.equal((await post(event)).status, 401);
  assert.equal(fixture.calls.length, 0);
});

test("stale signed webhook is rejected before any mutation", async () => {
  const { fixture, post } = setup();
  const result = await post(signedEvent({}, { timestamp: Math.floor(Date.now() / 1000) - 3600 }));
  assert.equal(result.status, 401);
  assert.equal(fixture.calls.length, 0);
});

test("changing any signed raw request byte invalidates the signature", async () => {
  const { fixture, post } = setup();
  const event = signedEvent();
  event.rawBody = Buffer.concat([event.rawBody, Buffer.from(" ")]);
  assert.equal((await post(event)).status, 401);
  assert.equal(fixture.calls.length, 0);
});

test("a test event cannot substitute its live-signature field for the required test signature", async () => {
  const { fixture, post } = setup();
  const event = signedEvent();
  const header = event.get();
  event.get = () => header.replace(/te=([^,]+),li=/, "te=,li=$1");
  assert.equal((await post(event)).status, 401);
  assert.equal(fixture.calls.length, 0);
});

test("a paid attempt is selected even when the session includes previous failed payment attempts", async () => {
  const { fixture, post } = setup();
  const result = await post(signedEvent({ mutate: session => {
    session.attributes.payments.unshift({ id: "pay_previous_failure", attributes: { status: "failed", amount: 330000, currency: "PHP", source: { type: "gcash" } } });
  } }));
  assert.equal(result.status, 200);
  assert.ok(fixture.state.orders.every(order => order.paymongo_payment_id === "pay_test_paid" && order.paymongo_payment_method === "card"));
});

test("signed unrelated event is acknowledged without processing a payment", async () => {
  const { fixture, post } = setup();
  const result = await post(signedEvent({ eventType: "payment.failed" }));
  assert.equal(result.status, 200);
  assert.equal(result.body.ignored, true);
  assert.equal(fixture.calls.length, 0);
});

test("late valid payment for cancelled attempt records the payment without reviving fulfillment or deleting cart", async () => {
  const { fixture, post } = setup();
  fixture.state.orders.forEach(order => { order.status = "Cancelled"; });
  const cartBefore = structuredClone(fixture.state.cartItems);
  const result = await post(signedEvent());
  assert.equal(result.status, 200);
  assert.ok(fixture.state.orders.every(order => order.payment_status === "Paid" && order.status === "Cancelled"));
  assert.equal(fixture.state.interactions.length, 0);
  assert.deepEqual(fixture.state.cartItems, cartBefore);
});

for (const [name, mutate] of [
  ["different seller session inside the group", fixture => { fixture.state.orders[1].paymongo_checkout_session_id = "cs_other_session"; }],
  ["different buyer inside the group", fixture => { fixture.state.orders[1].customer_id = 2; }],
  ["COD order inside the group", fixture => { fixture.state.orders[1].payment_method = "cod"; }],
  ["already recorded different payment ID", fixture => { fixture.state.orders[1].paymongo_payment_id = "pay_other_payment"; }],
  ["refunded order", fixture => { fixture.state.orders[1].payment_status = "Refunded"; }],
]) {
  test(`rejects ${name} without partial payment effects`, async () => {
    const { fixture, post } = setup();
    mutate(fixture);
    const before = structuredClone(fixture.state);
    const result = await post(signedEvent());
    assert.ok([400, 409].includes(result.status));
    assert.deepEqual(fixture.state, before);
    assert.ok(!fixture.calls.some(call => call.type === "commit"));
  });
}
