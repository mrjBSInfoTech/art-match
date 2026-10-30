import assert from "node:assert/strict";
import test from "node:test";
import { PayMongoError, verifyPayMongoSignature } from "../../utils/paymongo.js";
import { databaseFixture, invoke, loadPaymentRoute, signedEvent } from "../../test/paymentHarness.js";

function setup({ onlineFailure = false, enabledChannels = ["card", "gcash", "paymaya", "qrph"], ...overrides } = {}) {
  const fixture = databaseFixture({
    orders: [], orderItems: [],
    cartItems: [{ add_to_id: 1, artwork_id: 20 }, { add_to_id: 1, artwork_id: 21 }, { add_to_id: 2, artwork_id: 20 }],
    ...overrides,
  });
  const sessions = [];
  const expiredSessions = [];
  const retrievedSessions = [];
  const provider = { status: "active", paymentIntentStatus: "awaiting_payment_method", payments: [] };
  const providerSession = id => ({ id, type: "checkout_session", attributes: {
    reference_number: fixture.state.orders[0]?.payment_reference || "AM-fixture-group",
    checkout_url: "https://checkout.paymongo.com/test-fixture",
    status: provider.status, livemode: false, payments: provider.payments,
    payment_intent: { id: "pi_test_fixture", attributes: { status: provider.paymentIntentStatus } },
  } });
  const routes = loadPaymentRoute("../routes/buyer/orders.js", {
    ...fixture,
    getPayMongoMode: () => false,
    getPayMongoPaymentMethodTypes: async () => enabledChannels,
    async createPayMongoCheckoutSession(options) {
      sessions.push(structuredClone(options));
      if (onlineFailure) throw new Error("Payment provider temporarily unavailable");
      return {
        checkoutSessionId: "cs_test_checkout",
        checkoutUrl: "https://checkout.paymongo.com/test-fixture",
        referenceNumber: options.referenceNumber,
      };
    },
    async retrievePayMongoCheckoutSession(id) { retrievedSessions.push(id); return providerSession(id); },
    async expirePayMongoCheckoutSession(id) {
      expiredSessions.push(id);
      if (provider.expireRace) {
        provider.status = provider.expireRace;
        if (provider.status === "paid") provider.payments = [{ id: "pay_racing_confirmation", attributes: { status: "paid" } }];
        throw new PayMongoError("Provider state changed during expiry", 502, 400);
      }
      if (provider.expireFailure) throw new PayMongoError("Provider unavailable", 502);
      if (provider.status === "paid" || provider.paymentIntentStatus === "processing") throw new PayMongoError("Checkout payment is processing or already paid", 502, 400);
      provider.status = "expired";
      return providerSession(id);
    },
  });
  return { fixture, sessions, expiredSessions, retrievedSessions, provider, routes, checkout: body => invoke(routes, "post", "/checkout", { body }) };
}

test("online checkout trusts MySQL prices and creates two seller orders with one pending payment session", async () => {
  const { fixture, sessions, checkout } = setup();
  const result = await checkout({ address_id: 4, payment_method: "paymongo", price: 1, total: 2, shipping_fee: 0, items: [{ artwork_id: 20, price: 0.01 }] });
  assert.equal(result.status, 201);
  assert.equal(result.body.payment_status, "Pending");
  assert.equal(sessions.length, 1);
  assert.equal(fixture.state.orders.length, 2);
  assert.deepEqual(fixture.state.orders.map(order => Number(order.total_amount)), [1000, 2000]);
  assert.deepEqual(fixture.state.orders.map(order => order.seller_id), [5, 7]);
  const references = new Set(fixture.state.orders.map(order => order.payment_reference));
  assert.equal(references.size, 1);
  assert.ok([...references][0].startsWith("AM-"));
  assert.ok(fixture.state.orders.every(order => order.payment_method === "paymongo" && order.payment_status === "Pending" && order.paymongo_checkout_session_id === "cs_test_checkout"));
  assert.equal(fixture.state.paymentSplits.length, 2);
  assert.deepEqual(fixture.state.paymentSplits.map(split => split.order_id), fixture.state.orders.map(order => order.order_id));
  assert.deepEqual(fixture.state.paymentSplits.map(split => split.gross_amount), [1000, 2000]);
  assert.ok(fixture.state.paymentSplits.every(split => split.payout_status === "Held" && split.commission_amount === 0 && split.net_amount === split.gross_amount));
  assert.equal(sessions[0].referenceNumber, [...references][0]);
  assert.equal(sessions[0].lineItems.reduce((total, item) => total + item.amount * item.quantity, 0), 300000);
  assert.deepEqual(sessions[0].lineItems.map(item => item.amount), [100000, 200000]);
  assert.ok(sessions[0].lineItems.every(item => item.currency === "PHP"));
  assert.equal(fixture.state.interactions.length, 0, "pending online checkout must not record purchases");
  assert.equal(fixture.state.cartItems.length, 3, "pending payment must retain buyer and other buyer carts");
  assert.ok(fixture.state.orders.every(order => order.shipping_street === "1 Test St" && order.shipping_city === "Test City"));
  assert.ok(!fixture.calls.some(call => /^UPDATE artwork/i.test(call.sql || "")), "checkout must not set artwork.is_sold");
  assert.equal(result.body.orders, undefined, "unfinished payments must not be presented as placed purchases");
  assert.match(sessions[0].successUrl, /\/buyer\/checkout\?payment=success&reference=AM-/);
  assert.match(sessions[0].cancelUrl, /\/buyer\/checkout\?payment=cancelled&reference=AM-/);
  assert.match(sessions[0].successUrl, /artwork_ids=20,21$/);
});

test("only paid/refunded online purchases and COD appear in buyer Orders", async () => {
  const base = databaseFixture().state.orders[0];
  const trackingUrl = "https://share.lalamove.com/order?id=buyer-owned";
  const orders = [
    ...["Pending", "Failed", "Expired"].map((payment_status, index) => ({ ...base, order_id: index + 1, payment_status, status: index === 2 ? "Cancelled" : "Pending" })),
    { ...base, order_id: 4, payment_status: "Paid", status: "Shipped", tracking_url: trackingUrl },
    { ...base, order_id: 5, payment_status: "Paid", status: "Cancelled" },
    { ...base, order_id: 6, payment_status: "Refunded", status: "Cancelled" },
    { ...base, order_id: 7, payment_method: "cod", payment_status: "Pending" },
    { ...base, order_id: 8, customer_id: 2, payment_status: "Paid" },
  ];
  const { routes, fixture } = setup({ orders, orderItems: [] });
  const response = await invoke(routes, "get", "/");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.map(order => order.orderId), [4, 5, 6, 7]);
  assert.equal(response.body[0].trackingUrl, trackingUrl);
  const buyerOrdersQuery = fixture.calls.find(call =>
    call.type === "query" && /FROM marketplace_order o/i.test(call.sql || ""));
  assert.match(buyerOrdersQuery.sql, /o\.tracking_url/);
  const otherBuyerOrders = (await invoke(routes, "get", "/", { user: { customer_id: 2 } })).body;
  assert.ok(!otherBuyerOrders.some(order => order.orderId === 4));
});

test("checkout status is owner-scoped and unpaid attempts are available only through checkout", async () => {
  const { routes } = setup({ orders: databaseFixture().state.orders, orderItems: databaseFixture().state.orderItems });
  const params = { reference: "AM-fixture-group" };
  const status = await invoke(routes, "get", "/payments/:reference", { params });
  assert.equal(status.status, 200);
  assert.equal(status.body.payment_status, "Pending");
  assert.equal(status.body.orders.length, 2);
  assert.deepEqual(status.body.artwork_ids, [20, 21]);
  assert.equal((await invoke(routes, "get", "/")).body.length, 0);
  assert.equal((await invoke(routes, "get", "/payments/:reference", { params, user: { customer_id: 2 } })).status, 404);
  assert.equal((await invoke(routes, "get", "/payments/:reference", { params: { reference: "not a reference" } })).status, 400);
});

test("buyer shipment metadata is owner-scoped and legacy tracking-only orders remain readable", async () => {
  const base = databaseFixture().state.orders[0];
  const shipments = [
    { order_id: 11, courier: "lalamove", tracking_number: null, tracking_url: "https://share.lalamove.com/order?id=1" },
    { order_id: 12, courier: "lbc", tracking_number: "LBC-123", tracking_url: "https://www.lbcexpress.com/track/" },
    { order_id: 13, courier: "jnt", tracking_number: "JT-123", tracking_url: "https://www.jtexpress.ph/trajectoryQuery?flag=1" },
    { order_id: 14, courier: "ninjavan", tracking_number: "NV-123", tracking_url: "https://www.ninjavan.co/en-ph/tracking/" },
    { order_id: 15, tracking_url: "https://legacy.example/parcel/123" },
  ];
  const { routes, fixture } = setup({ orders: [
    ...shipments.map((shipment) => ({ ...base, payment_status: "Paid", status: "Shipped", ...shipment })),
    { ...base, order_id: 16, customer_id: 2, payment_status: "Paid", status: "Shipped", courier: "lbc", tracking_number: "PRIVATE-OTHER-BUYER", tracking_url: "https://www.lbcexpress.com/track/" },
  ], orderItems: [] });
  const response = await invoke(routes, "get", "/");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.map(({ orderId, courier, trackingNumber, trackingUrl }) => ({ orderId, courier, trackingNumber, trackingUrl })),
    shipments.map((shipment) => ({ orderId: shipment.order_id, courier: shipment.courier || null, trackingNumber: shipment.tracking_number || null, trackingUrl: shipment.tracking_url })));
  const sql = fixture.calls.find((call) => call.type === "query" && /FROM marketplace_order o/i.test(call.sql || "")).sql;
  assert.match(sql, /o\.courier/);
  assert.match(sql, /o\.tracking_number/);
  assert.match(sql, /WHERE o\.customer_id = \?/);
  const otherBuyer = await invoke(routes, "get", "/", { user: { customer_id: 2 } });
  assert.equal(otherBuyer.body.length, 1);
  assert.equal(otherBuyer.body[0].trackingNumber, "PRIVATE-OTHER-BUYER");
});

test("a confirmed webhook makes checkout purchases visible and reports Paid without trusting a return URL", async () => {
  const { fixture, routes } = setup({ orders: databaseFixture().state.orders, orderItems: databaseFixture().state.orderItems });
  const params = { reference: "AM-fixture-group" };
  assert.equal((await invoke(routes, "get", "/payments/:reference", { params })).body.payment_status, "Pending");
  const webhook = loadPaymentRoute("../routes/payments/paymongo.js", {
    ...fixture, getPayMongoMode: () => false,
    verifyPayMongoSignature: options => verifyPayMongoSignature({ ...options, secret: "isolated-webhook-fixture" }),
  });
  assert.equal((await invoke(webhook, "post", "/webhook", signedEvent())).status, 200);
  assert.ok(fixture.state.paymentSplits.every(split => split.payout_status === "Held" && split.eligible_at == null));
  assert.equal((await invoke(routes, "get", "/payments/:reference", { params })).body.payment_status, "Paid");
  assert.equal((await invoke(routes, "get", "/")).body.length, 2);
});

test("secure online checkout sends all enabled channels and ignores a legacy client channel", async () => {
  const { checkout, sessions, routes } = setup();
  const methods = await invoke(routes, "get", "/payments/methods");
  assert.equal(methods.status, 200);
  assert.deepEqual(methods.body.payment_method_types, ["card", "gcash", "paymaya", "qrph"]);
  assert.equal((await checkout({ address_id: 4, payment_method: "paymongo", payment_channel: "gcash" })).status, 201);
  assert.deepEqual(sessions[0].paymentMethodTypes, ["card", "gcash", "paymaya", "qrph"]);
  const restricted = setup({ enabledChannels: ["qrph"] });
  assert.deepEqual((await invoke(restricted.routes, "get", "/payments/methods")).body.payment_method_types, ["qrph"]);
  assert.equal((await restricted.checkout({ address_id: 4, payment_method: "paymongo", payment_channel: "gcash" })).status, 201);
  assert.deepEqual(restricted.sessions[0].paymentMethodTypes, ["qrph"]);
});

test("selected COD checkout orders only checked artwork and retains unchecked items", async () => {
  const { fixture, sessions, checkout } = setup();
  const result = await checkout({ address_id: 4, payment_method: "cod", artwork_ids: [21] });
  assert.equal(result.status, 201);
  assert.equal(sessions.length, 0);
  assert.deepEqual(fixture.state.orderItems.map(item => item.artwork_id), [21]);
  assert.deepEqual(fixture.state.orders.map(order => Number(order.total_amount)), [2000]);
  assert.deepEqual(fixture.state.cartItems, [{ add_to_id: 1, artwork_id: 20 }, { add_to_id: 2, artwork_id: 20 }]);
  assert.equal(fixture.state.carts[0].total_price, 1000);
});

test("selected online checkout charges only checked artwork and keeps all cart items pending payment", async () => {
  const { fixture, sessions, checkout } = setup();
  fixture.state.artworks[0].is_sold = 1; // An unchecked sold item must not block this selection.
  const before = structuredClone(fixture.state.cartItems);
  const result = await checkout({ address_id: 4, payment_method: "paymongo", artwork_ids: [21, 21] });
  assert.equal(result.status, 201);
  assert.deepEqual(fixture.state.orderItems.map(item => item.artwork_id), [21]);
  assert.deepEqual(fixture.state.orders.map(order => Number(order.total_amount)), [2000]);
  assert.equal(sessions[0].lineItems.reduce((total, item) => total + item.amount * item.quantity, 0), 200000);
  assert.deepEqual(fixture.state.cartItems, before);
});

test("empty, malformed and non-cart artwork selections cannot create orders or charge the whole cart", async () => {
  for (const ids of [[], null, "21", [0], [-1], [1.5], ["21"], [999], [20, 999], [30]]) {
    const { fixture, sessions, checkout } = setup();
    const before = structuredClone(fixture.state);
    const result = await checkout({ address_id: 4, payment_method: "paymongo", artwork_ids: ids });
    assert.equal(result.status, 400, JSON.stringify(ids));
    assert.equal(sessions.length, 0);
    assert.deepEqual(fixture.state, before);
  }
});

test("COD never calls PayMongo, records placed purchases, and removes only its purchased artwork", async () => {
  const { fixture, sessions, checkout } = setup();
  const result = await checkout({ address_id: 4, payment_method: "cod" });
  assert.equal(result.status, 201);
  assert.equal(result.body.payment_method, "cod");
  assert.equal(sessions.length, 0);
  assert.ok(fixture.state.orders.every(order => order.payment_method === "cod" && order.payment_status === "Pending"));
  assert.equal(fixture.state.paymentSplits.length, 2);
  assert.ok(fixture.state.paymentSplits.every(split => split.payout_status === "Eligible" && split.commission_amount === 0 && split.net_amount === split.gross_amount));
  assert.deepEqual(fixture.state.interactions.map(item => item.artworkId), [20, 21]);
  assert.deepEqual(fixture.state.cartItems, [{ add_to_id: 2, artwork_id: 20 }]);
  assert.equal(fixture.state.carts[0].total_price, 0);
  assert.equal(fixture.state.carts[1].total_price, 1000);
});

test("failed checkout session creation rolls all seller orders back and retains cart", async () => {
  const { fixture, checkout } = setup({ onlineFailure: true });
  const before = structuredClone(fixture.state);
  const result = await checkout({ address_id: 4, payment_method: "paymongo" });
  assert.equal(result.status, 500);
  assert.deepEqual(fixture.state, before);
  assert.ok(fixture.calls.some(call => call.type === "rollback"));
  assert.ok(!fixture.calls.some(call => call.type === "commit"));
});

test("invalid channel aliases and forged shipping addresses fail before any order or session creation", async () => {
  for (const paymentMethod of ["gcash", "maya", "card", "bank", "", "not-a-method"]) {
    const { fixture, sessions, checkout } = setup();
    const result = await checkout({ address_id: 4, payment_method: paymentMethod });
    assert.equal(result.status, 400, paymentMethod);
    assert.equal(fixture.state.orders.length, 0);
    assert.equal(sessions.length, 0);
  }
  const { fixture, sessions, checkout } = setup();
  assert.equal((await checkout({ address_id: 999, payment_method: "paymongo" })).status, 400);
  assert.equal(fixture.state.orders.length, 0);
  assert.equal(sessions.length, 0);
});

test("sold artwork is removed from cart and never included in a checkout session", async () => {
  const { fixture, sessions, checkout } = setup();
  fixture.state.artworks[0].is_sold = 1;
  const result = await checkout({ address_id: 4, payment_method: "paymongo" });
  assert.equal(result.status, 409);
  assert.equal(sessions.length, 0);
  assert.equal(fixture.state.orders.length, 0);
  assert.deepEqual(fixture.state.cartItems, [{ add_to_id: 1, artwork_id: 21 }, { add_to_id: 2, artwork_id: 20 }]);
  assert.equal(fixture.state.carts[0].total_price, 2000);
});

test("invalid trusted prices reject online and COD checkout with all writes rolled back", async () => {
  for (const paymentMethod of ["paymongo", "cod"]) {
    for (const price of [0, -1, "invalid-price"]) {
      const { fixture, sessions, checkout } = setup();
      fixture.state.artworks[0].price = price;
      const before = structuredClone(fixture.state);
      const result = await checkout({ address_id: 4, payment_method: paymentMethod });
      assert.ok(result.status >= 400, `${paymentMethod} accepted an invalid database price`);
      assert.deepEqual(fixture.state, before);
      assert.equal(sessions.length, 0);
    }
  }
});

test("a repeat checkout cannot create another payable pending group for the same cart", async () => {
  const { fixture, sessions, checkout } = setup();
  assert.equal((await checkout({ address_id: 4, payment_method: "paymongo" })).status, 201);
  const result = await checkout({ address_id: 4, payment_method: "paymongo" });
  const active = fixture.state.orders.filter(order => order.status !== "Cancelled" && order.payment_status === "Pending");
  assert.ok(new Set(active.map(order => order.payment_reference)).size <= 1, "retry created multiple active payment groups");
  assert.ok(result.status < 500);
  if (result.status === 409) {
    assert.equal(result.body.can_resume, true);
    assert.equal(result.body.payment_reference, active[0].payment_reference);
  }
  assert.ok(sessions.length <= 2);
});

test("another buyer's unpaid PayMongo attempt does not count as a sold artwork", async () => {
  const initial = databaseFixture().state;
  const { fixture, checkout } = setup({ orders: initial.orders.map(order => ({ ...order, customer_id: 2 })), orderItems: initial.orderItems });
  const result = await checkout({ address_id: 4, payment_method: "paymongo" });
  assert.equal(result.status, 201);
  assert.equal(fixture.state.orders.filter(order => order.customer_id === 1).length, 2);
  assert.equal(fixture.state.cartItems.length, 3);
});

test("previous paid sales reduce tracked stock but do not create an unpaid checkout conflict", async () => {
  const initial = databaseFixture().state;
  const { fixture, checkout } = setup({ orders: [{ ...initial.orders[0], payment_status: "Paid" }], orderItems: [initial.orderItems[0]] });
  fixture.state.artworks[0].stock_available = 2;
  const result = await checkout({ address_id: 4, payment_method: "paymongo" });
  assert.equal(result.status, 201);
  assert.equal(fixture.state.orders.length, 3);
});

test("Paid PayMongo order cannot be cancelled without a refund flow", async () => {
  const { fixture, routes } = setup({ orders: [{ order_id: 101, customer_id: 1, status: "Pending", payment_method: "paymongo", payment_status: "Paid", payment_reference: "AM-paid-group", paymongo_checkout_session_id: "cs_paid" }] });
  const before = structuredClone(fixture.state);
  const result = await invoke(routes, "put", "/:id/cancel", { params: { id: "101" } });
  assert.equal(result.status, 409);
  assert.deepEqual(fixture.state, before);
});

test("cancelling COD keeps its existing buyer-owned pending fulfillment policy", async () => {
  const { fixture, routes } = setup({ orders: [{ order_id: 101, customer_id: 1, status: "Pending", payment_method: "cod", payment_status: "Pending" }] });
  const result = await invoke(routes, "put", "/:id/cancel", { params: { id: "101" } });
  assert.equal(result.status, 200);
  assert.equal(fixture.state.orders[0].status, "Cancelled");
});

test("explicit online cancellation expires the provider session and cancels its entire seller group without clearing cart", async () => {
  const { fixture, routes, expiredSessions } = setup({ orders: databaseFixture().state.orders });
  const cartBefore = structuredClone(fixture.state.cartItems);
  const result = await invoke(routes, "put", "/payments/:reference/cancel", { params: { reference: "AM-fixture-group" } });
  assert.equal(result.status, 200);
  assert.deepEqual(expiredSessions, ["cs_test_checkout"]);
  assert.ok(fixture.state.orders.every(order => order.payment_status === "Expired" && order.status === "Cancelled"));
  assert.deepEqual(fixture.state.cartItems, cartBefore);
  assert.equal(fixture.state.interactions.length, 0);
});

test("online cancellation by order ID also cancels all seller orders sharing that checkout", async () => {
  const { fixture, routes, expiredSessions } = setup({ orders: databaseFixture().state.orders });
  const result = await invoke(routes, "put", "/:id/cancel", { params: { id: "101" } });
  assert.equal(result.status, 200);
  assert.deepEqual(expiredSessions, ["cs_test_checkout"]);
  assert.ok(fixture.state.orders.every(order => order.payment_status === "Expired" && order.status === "Cancelled"));
});

test("cancellation cannot override a paid or processing provider session while webhook is delayed", async () => {
  for (const providerState of ["paid", "processing"]) {
    const { fixture, routes, provider, expiredSessions } = setup({ orders: databaseFixture().state.orders });
    if (providerState === "paid") {
      provider.status = "paid";
      provider.payments = [{ id: "pay_delayed_webhook", attributes: { status: "paid", amount: 330000, currency: "PHP" } }];
    } else {
      provider.paymentIntentStatus = "processing";
      provider.payments = [{ id: "pay_still_processing", attributes: { status: "processing" } }];
    }
    const before = structuredClone(fixture.state);
    const result = await invoke(routes, "put", "/payments/:reference/cancel", { params: { reference: "AM-fixture-group" } });
    assert.equal(result.status, 409);
    assert.deepEqual(fixture.state, before);
    assert.equal(expiredSessions.length, 0);
  }
});

test("an already expired provider session can be reconciled locally without a second expiration call", async () => {
  const { fixture, routes, provider, expiredSessions } = setup({ orders: databaseFixture().state.orders });
  provider.status = "expired";
  const result = await invoke(routes, "put", "/payments/:reference/cancel", { params: { reference: "AM-fixture-group" } });
  assert.equal(result.status, 200);
  assert.equal(expiredSessions.length, 0);
  assert.ok(fixture.state.orders.every(order => order.payment_status === "Expired" && order.status === "Cancelled"));
});

test("a buyer cannot cancel another buyer's payment group", async () => {
  const { fixture, routes, retrievedSessions, expiredSessions } = setup({ orders: databaseFixture().state.orders.map(order => ({ ...order, customer_id: 2 })) });
  const before = structuredClone(fixture.state);
  const result = await invoke(routes, "put", "/payments/:reference/cancel", { params: { reference: "AM-fixture-group" } });
  assert.ok([403, 404].includes(result.status));
  assert.deepEqual(fixture.state, before);
  assert.equal(retrievedSessions.length, 0);
  assert.equal(expiredSessions.length, 0);
});

test("retry resumes the existing provider checkout without creating new seller orders or purchases", async () => {
  const initial = databaseFixture().state;
  const { fixture, routes, sessions, retrievedSessions } = setup({ orders: initial.orders, orderItems: initial.orderItems });
  const cartBefore = structuredClone(fixture.state.cartItems);
  const result = await invoke(routes, "post", "/payments/:reference/retry", { params: { reference: "AM-fixture-group" } });
  assert.equal(result.status, 200);
  assert.equal(result.body.payment_reference, "AM-fixture-group");
  assert.equal(result.body.checkout_url, "https://checkout.paymongo.com/test-fixture");
  assert.deepEqual(retrievedSessions, ["cs_test_checkout"]);
  assert.equal(sessions.length, 0);
  assert.equal(fixture.state.orders.length, 2);
  assert.deepEqual(fixture.state.cartItems, cartBefore);
  assert.equal(fixture.state.interactions.length, 0);
});

test("retry reconciles an authenticated provider-paid checkout when its webhook is delayed", async () => {
  const initial = databaseFixture().state;
  const { fixture, routes, provider, retrievedSessions } = setup({
    orders: initial.orders,
    orderItems: initial.orderItems,
  });
  provider.status = "completed";
  provider.payments = [{
    id: "pay_delayed_webhook",
    attributes: {
      status: "paid",
      amount: 330000,
      currency: "PHP",
      livemode: false,
      source: { type: "card" },
      paid_at: 1792872000,
    },
  }];

  const result = await invoke(routes, "post", "/payments/:reference/retry", {
    params: { reference: "AM-fixture-group" },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.payment_status, "Paid");
  assert.equal(result.body.payment_reference, "AM-fixture-group");
  assert.equal(result.body.message, "Payment confirmed.");
  assert.deepEqual(retrievedSessions, ["cs_test_checkout"]);
  assert.ok(fixture.state.orders.every(order =>
    order.payment_status === "Paid" && order.paymongo_payment_id === "pay_delayed_webhook"));
  assert.ok(fixture.state.paymentSplits.every(split => split.payout_status === "Held" && split.eligible_at == null));
  assert.deepEqual(fixture.state.cartItems, [{ add_to_id: 2, artwork_id: 20 }]);
  assert.equal(fixture.state.interactions.length, 2);
  assert.ok(fixture.calls.some(call => call.type === "commit"));
});

test("retry will not reconcile a provider-paid session with an amount mismatch", async () => {
  const initial = databaseFixture().state;
  const { fixture, routes, provider } = setup({
    orders: initial.orders,
    orderItems: initial.orderItems,
  });
  provider.payments = [{
    id: "pay_wrong_amount",
    attributes: {
      status: "paid",
      amount: 100,
      currency: "PHP",
      livemode: false,
      source: { type: "card" },
    },
  }];
  const before = structuredClone(fixture.state);

  const result = await invoke(routes, "post", "/payments/:reference/retry", {
    params: { reference: "AM-fixture-group" },
  });

  assert.equal(result.status, 400);
  assert.deepEqual(fixture.state, before);
});

test("retry rejects paid local orders and expired provider sessions", async () => {
  for (const condition of ["paid", "expired"]) {
    const initial = databaseFixture().state;
    const { fixture, routes, provider, sessions } = setup({ orders: initial.orders, orderItems: initial.orderItems });
    if (condition === "paid") fixture.state.orders.forEach(order => { order.payment_status = "Paid"; });
    else provider.status = "expired";
    const cartBefore = structuredClone(fixture.state.cartItems);
    const result = await invoke(routes, "post", "/payments/:reference/retry", { params: { reference: "AM-fixture-group" } });
    assert.equal(result.status, 409);
    assert.equal(sessions.length, 0);
    assert.deepEqual(fixture.state.cartItems, cartBefore);
    assert.equal(fixture.state.interactions.length, 0);
  }
});

test("retry is scoped to the authenticated buyer before contacting PayMongo", async () => {
  const initial = databaseFixture().state;
  const { fixture, routes, retrievedSessions } = setup({ orders: initial.orders.map(order => ({ ...order, customer_id: 2 })), orderItems: initial.orderItems });
  const result = await invoke(routes, "post", "/payments/:reference/retry", { params: { reference: "AM-fixture-group" } });
  assert.ok([403, 404].includes(result.status));
  assert.equal(retrievedSessions.length, 0);
  assert.ok(fixture.state.orders.every(order => order.payment_status === "Pending"));
});

test("provider refusing expiry while processing is rechecked and leaves the local group untouched", async () => {
  const { fixture, routes, provider, expiredSessions, retrievedSessions } = setup({ orders: databaseFixture().state.orders });
  provider.paymentIntentStatus = "processing";
  const before = structuredClone(fixture.state);
  const result = await invoke(routes, "put", "/payments/:reference/cancel", { params: { reference: "AM-fixture-group" } });
  assert.equal(result.status, 409);
  assert.deepEqual(fixture.state, before);
  assert.equal(expiredSessions.length, 1);
  assert.equal(retrievedSessions.length, 2);
});

test("an expiry race is accepted only when re-reading the provider confirms expiry", async () => {
  for (const status of ["expired", "paid"]) {
    const { fixture, routes, provider, expiredSessions, retrievedSessions } = setup({ orders: databaseFixture().state.orders });
    provider.expireRace = status;
    const before = structuredClone(fixture.state);
    const result = await invoke(routes, "put", "/payments/:reference/cancel", { params: { reference: "AM-fixture-group" } });
    assert.equal(expiredSessions.length, 1);
    assert.equal(retrievedSessions.length, 2);
    if (status === "expired") {
      assert.equal(result.status, 200);
      assert.ok(fixture.state.orders.every(order => order.status === "Cancelled" && order.payment_status === "Expired"));
      assert.deepEqual(fixture.state.cartItems, before.cartItems);
    } else {
      assert.equal(result.status, 409);
      assert.deepEqual(fixture.state, before);
    }
  }
});

test("provider expiry failure never locally cancels orders or deletes cart items", async () => {
  const { fixture, routes, provider } = setup({ orders: databaseFixture().state.orders });
  provider.expireFailure = true;
  const before = structuredClone(fixture.state);
  const result = await invoke(routes, "put", "/payments/:reference/cancel", { params: { reference: "AM-fixture-group" } });
  assert.equal(result.status, 502);
  assert.deepEqual(fixture.state, before);
});

test("a database failure after provider expiry rolls back and a later cancellation safely reconciles", async () => {
  const { fixture, routes, provider, expiredSessions } = setup({ orders: databaseFixture().state.orders });
  const before = structuredClone(fixture.state);
  fixture.setFail(sql => /^UPDATE marketplace_order/i.test(sql));
  const request = { params: { reference: "AM-fixture-group" } };
  assert.equal((await invoke(routes, "put", "/payments/:reference/cancel", request)).status, 500);
  assert.equal(provider.status, "expired");
  assert.deepEqual(fixture.state, before);
  fixture.setFail(undefined);
  assert.equal((await invoke(routes, "put", "/payments/:reference/cancel", request)).status, 200);
  assert.equal(expiredSessions.length, 1);
  assert.ok(fixture.state.orders.every(order => order.status === "Cancelled" && order.payment_status === "Expired"));
  assert.deepEqual(fixture.state.cartItems, before.cartItems);
});

test("retry checks current availability, upload approval, manual sold flag and stock before returning a payable URL", async () => {
  for (const unavailable of [{ status: "Unavailable" }, { is_verified: 0 }, { is_sold: 1 }, { stock_available: 0 }]) {
    const initial = databaseFixture().state;
    const { fixture, routes, retrievedSessions } = setup({ orders: initial.orders, orderItems: initial.orderItems });
    Object.assign(fixture.state.artworks[0], unavailable);
    const before = structuredClone(fixture.state);
    const result = await invoke(routes, "post", "/payments/:reference/retry", { params: { reference: "AM-fixture-group" } });
    assert.equal(result.status, 409);
    assert.equal(retrievedSessions.length, 1);
    assert.deepEqual(fixture.state, before);
  }
});

test("checkout rejects unavailable or unapproved artworks despite valid prices and remaining stock", async () => {
  for (const unavailable of [{ status: "Unavailable" }, { is_verified: 0 }]) {
    const { fixture, checkout, sessions } = setup();
    Object.assign(fixture.state.artworks[0], unavailable);
    const result = await checkout({ address_id: 4, payment_method: "paymongo" });
    assert.equal(result.status, 409);
    assert.equal(sessions.length, 0);
    assert.equal(fixture.state.orders.length, 0);
    assert.deepEqual(fixture.state.cartItems, [{ add_to_id: 1, artwork_id: 21 }, { add_to_id: 2, artwork_id: 20 }]);
  }
});

test("pickup checkout succeeds without requiring a customer delivery address and saves pickup location", async () => {
  const { fixture, checkout, routes } = setup();
  fixture.state.artworks[0].seller_address = "CAFA Fine Arts Studio 2B";
  const result = await checkout({
    delivery_method: "pickup",
    payment_method: "cod",
    artwork_ids: [20],
  });
  assert.equal(result.status, 201);
  assert.equal(fixture.state.orders.length, 1);
  assert.equal(fixture.state.orders[0].delivery_method, "pickup");
  assert.equal(Number(fixture.state.orders[0].shipping_fee), 0);
  assert.equal(fixture.state.orders[0].shipping_street, "Pickup: CAFA Fine Arts Studio 2B");

  const listResponse = await invoke(routes, "get", "/");
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.length, 1);
  assert.equal(listResponse.body[0].deliveryMethod, "pickup");
  assert.equal(listResponse.body[0].address, "Pickup: CAFA Fine Arts Studio 2B");
});

test("door_to_door checkout requires a valid shipping address and rejects unsupported delivery methods", async () => {
  const { fixture, checkout, sessions } = setup();
  const missingAddress = await checkout({
    delivery_method: "door_to_door",
    payment_method: "cod",
  });
  assert.equal(missingAddress.status, 400);
  assert.equal(fixture.state.orders.length, 0);

  const invalidDelivery = await checkout({
    address_id: 4,
    delivery_method: "drone_delivery",
    payment_method: "paymongo",
  });
  assert.equal(invalidDelivery.status, 400);
  assert.equal(fixture.state.orders.length, 0);
  assert.equal(sessions.length, 0);
});

test("multi-quantity product checkout recalculates subtotal, total, and enforces stock limits", async () => {
  const { fixture, checkout, sessions } = setup();
  fixture.state.artworks[0].stock_available = 5;
  fixture.state.artworks[0].price = "150.00";

  // Exceeding stock (requesting 6 when 5 are available) rejects and updates cart
  const overStock = await checkout({
    address_id: 4,
    delivery_method: "door_to_door",
    payment_method: "paymongo",
    artwork_ids: [20],
    quantities: { 20: 6 },
  });
  assert.equal(overStock.status, 409);
  assert.equal(sessions.length, 0);
  assert.equal(fixture.state.orders.length, 0);

  // Valid multi-quantity (3 units x 150.00 = 450.00)
  const valid = setup();
  valid.fixture.state.artworks[0].stock_available = 5;
  valid.fixture.state.artworks[0].price = "150.00";
  const okResult = await valid.checkout({
    address_id: 4,
    delivery_method: "door_to_door",
    payment_method: "cod",
    artwork_ids: [20],
    quantities: { 20: 3 },
  });
  assert.equal(okResult.status, 201);
  assert.equal(valid.fixture.state.orders.length, 1);
  assert.equal(Number(valid.fixture.state.orders[0].subtotal), 450);
  assert.equal(Number(valid.fixture.state.orders[0].total_amount), 450);
  assert.equal(valid.fixture.state.orderItems[0].quantity, 3);
  assert.equal(Number(valid.fixture.state.orderItems[0].unit_price), 150);
});
