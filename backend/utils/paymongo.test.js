import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createHmac } from "node:crypto";
import { createPayMongoCheckoutSession, pesosToCentavos } from "./paymongo.js";
import * as paymongo from "./paymongo.js";

const originalKey = process.env.PAYMONGO_SECRET_KEY;
process.env.PAYMONGO_SECRET_KEY = "sk_test_isolated_fixture";
after(() => {
  if (originalKey === undefined) delete process.env.PAYMONGO_SECRET_KEY;
  else process.env.PAYMONGO_SECRET_KEY = originalKey;
});

const validCheckout = overrides => ({
  lineItems: [{ name: "Test artwork", amount: 100050, quantity: 1, currency: "PHP" }],
  paymentMethodTypes: ["card", "gcash", "paymaya", "qrph"],
  successUrl: "http://localhost:5173/buyer/profile/orders?payment=success",
  cancelUrl: "http://localhost:5173/buyer/checkout?payment=cancelled",
  referenceNumber: "AM-test-reference",
  metadata: { customer_id: "1" },
  ...overrides,
});

const successfulResponse = () => ({
  ok: true, status: 200, async json() { return {
    data: { id: "cs_test_isolated", attributes: {
      checkout_url: "https://checkout.paymongo.com/test-isolated",
      reference_number: "AM-test-reference",
    } },
  }; },
});

test("converts valid peso prices to exact integer centavos", () => {
  for (const [pesos, centavos] of [[1, 100], [150, 15000], [0.01, 1], [0.29, 29], [19.99, 1999], ["1000.50", 100050], ["2000.00", 200000]]) {
    assert.equal(pesosToCentavos(pesos), centavos);
  }
});

test("rejects nonpositive, nonnumeric and unsafe monetary values", () => {
  for (const invalid of [0, -1, NaN, Infinity, -Infinity, undefined, null, "", "abc", true, {}, 0.001, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => pesosToCentavos(invalid), undefined, `Accepted invalid money ${String(invalid)}`);
  }
});

test("uses Hosted Checkout v2 with backend Basic auth and retains one reference", async t => {
  let captured;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    captured = { url, options };
    return successfulResponse();
  });
  const result = await createPayMongoCheckoutSession(validCheckout());
  assert.equal(captured.url, "https://api.paymongo.com/v2/checkout_sessions");
  assert.equal(captured.options.method, "POST");
  assert.equal(captured.options.headers.Authorization, `Basic ${Buffer.from("sk_test_isolated_fixture:").toString("base64")}`);
  const payload = JSON.parse(captured.options.body).data.attributes;
  assert.equal(payload.reference_number, "AM-test-reference");
  assert.equal(payload.pass_on_fees, false, "buyers must not be charged unexpected provider fees");
  assert.deepEqual(payload.line_items, validCheckout().lineItems);
  assert.deepEqual(payload.payment_method_types, ["card", "gcash", "paymaya", "qrph"]);
  assert.equal(result.checkoutSessionId, "cs_test_isolated");
  assert.equal(result.checkoutUrl, "https://checkout.paymongo.com/test-isolated");
  assert.equal(result.referenceNumber, "AM-test-reference");
  assert.ok(!captured.options.body.includes("sk_test_"), "credentials must only be sent in the API Authorization header");
});

test("invalid Checkout line items fail locally before any network request", async t => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return successfulResponse(); });
  const invalidLineItems = [
    [], [{ name: "Art", amount: 0, quantity: 1, currency: "PHP" }],
    [{ name: "Art", amount: -100, quantity: 1, currency: "PHP" }],
    [{ name: "Art", amount: 100.5, quantity: 1, currency: "PHP" }],
    [{ name: "Art", amount: 100, quantity: 0, currency: "PHP" }],
    [{ name: "Art", amount: 100, quantity: 1.5, currency: "PHP" }],
    [{ name: "Art", amount: 100, quantity: 1, currency: "USD" }],
    [{ name: "", amount: 100, quantity: 1, currency: "PHP" }],
  ];
  for (const lineItems of invalidLineItems) {
    await assert.rejects(() => createPayMongoCheckoutSession(validCheckout({ lineItems })));
  }
  assert.equal(requests, 0);
});

test("unknown payment method identifiers are rejected before calling PayMongo", async t => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return successfulResponse(); });
  for (const paymentMethodTypes of [[], ["maya"], ["bank"], ["cash"], ["card", "invented_method"]]) {
    await assert.rejects(() => createPayMongoCheckoutSession(validCheckout({ paymentMethodTypes })));
  }
  assert.equal(requests, 0);
});

test("missing return URLs or reference are rejected before calling PayMongo", async t => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return successfulResponse(); });
  for (const overrides of [{ successUrl: "" }, { cancelUrl: "" }, { referenceNumber: "" }]) {
    await assert.rejects(() => createPayMongoCheckoutSession(validCheckout(overrides)));
  }
  assert.equal(requests, 0);
});

test("PayMongo maintenance is reported as temporary unavailability without exposing provider details", async t => {
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false, status: 404,
    async json() { return { errors: [{ code: "maintenance", detail: "Internal provider details" }] }; },
  }));
  await assert.rejects(() => createPayMongoCheckoutSession(validCheckout()), error => {
    assert.equal(error.status, 503);
    assert.equal(error.providerStatus, 404);
    assert.equal(error.providerCode, "maintenance");
    assert.match(error.message, /maintenance.*try again later/i);
    assert.doesNotMatch(error.message, /Internal provider details/);
    return true;
  });
});

test("PayMongo non-2xx and invalid successful responses are not accepted as Checkout Sessions", async t => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 422, async json() { return { errors: [{ detail: "Payment method unavailable" }] }; } }));
  await assert.rejects(() => createPayMongoCheckoutSession(validCheckout()), /unavailable|PayMongo/i);
  globalThis.fetch.mock.mockImplementation(async () => ({ ok: true, status: 200, async json() { return { data: {} }; } }));
  await assert.rejects(() => createPayMongoCheckoutSession(validCheckout()), /valid|session/i);
});

test("empty backend secret fails locally without a network request", async t => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return successfulResponse(); });
  const saved = process.env.PAYMONGO_SECRET_KEY;
  try {
    delete process.env.PAYMONGO_SECRET_KEY;
    await assert.rejects(() => createPayMongoCheckoutSession(validCheckout()), /key|configured/i);
    assert.equal(requests, 0);
  } finally {
    process.env.PAYMONGO_SECRET_KEY = saved;
  }
});

test("signature helper selects exactly the signature for the event mode", () => {
  const rawBody = Buffer.from('{"data":{"test":"raw body"}}');
  const timestamp = 1792872000;
  const secret = "isolated-helper-secret";
  const digest = createHmac("sha256", secret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  const verify = (signatureHeader, livemode) => paymongo.verifyPayMongoSignature({ rawBody, signatureHeader, livemode, secret, now: timestamp * 1000 });
  assert.equal(verify(`t=${timestamp},te=${digest},li=`, false), true);
  assert.equal(verify(`t=${timestamp},te=,li=${digest}`, true), true);
  assert.equal(verify(`t=${timestamp},te=${digest},li=`, true), false);
  assert.equal(verify(`t=${timestamp},te=,li=${digest}`, false), false);
  assert.equal(verify(`t=${timestamp},te=${digest}x,li=`, false), false);
  assert.equal(verify(`t=${timestamp},te=${digest.slice(0, -2)},li=`, false), false);
  assert.equal(verify("", false), false);
});

test("signature helper rejects stale or future timestamps and changed raw bytes", () => {
  const timestamp = 1792872000;
  const rawBody = Buffer.from('{"data": "original"}');
  const secret = "isolated-helper-secret";
  const digest = createHmac("sha256", secret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
  const options = { rawBody, signatureHeader: `t=${timestamp},te=${digest},li=`, livemode: false, secret };
  assert.equal(paymongo.verifyPayMongoSignature({ ...options, now: (timestamp + 3600) * 1000 }), false);
  assert.equal(paymongo.verifyPayMongoSignature({ ...options, now: (timestamp - 3600) * 1000 }), false);
  assert.equal(paymongo.verifyPayMongoSignature({ ...options, now: timestamp * 1000, rawBody: Buffer.concat([rawBody, Buffer.from(" ")]) }), false);
});

test("method configuration is deduplicated and restricted to enabled account capabilities", async t => {
  const saved = process.env.PAYMONGO_PAYMENT_METHOD_TYPES;
  process.env.PAYMONGO_SECRET_KEY = "sk_live_isolated_fixture";
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, async json() { return { data: { attributes: { payment_methods: ["card", "gcash"] } } }; } };
  });
  try {
    process.env.PAYMONGO_PAYMENT_METHOD_TYPES = "card,bank,gcash,card,paymaya";
    assert.deepEqual(await paymongo.getPayMongoPaymentMethodTypes(), ["card", "gcash"]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.paymongo.com/v1/merchants/capabilities/payment_methods");
    assert.equal(calls[0].options.method, "GET");
  } finally {
    process.env.PAYMONGO_SECRET_KEY = "sk_test_isolated_fixture";
    if (saved === undefined) delete process.env.PAYMONGO_PAYMENT_METHOD_TYPES;
    else process.env.PAYMONGO_PAYMENT_METHOD_TYPES = saved;
  }
});

test("an account with no configured enabled methods fails safely", async t => {
  process.env.PAYMONGO_SECRET_KEY = "sk_live_isolated_fixture";
  t.after(() => { process.env.PAYMONGO_SECRET_KEY = "sk_test_isolated_fixture"; });
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, status: 200, async json() { return { data: { attributes: { payment_methods: [] } } }; } }));
  await assert.rejects(() => paymongo.getPayMongoPaymentMethodTypes(), /enabled|available/i);
});

test("TEST checkout exposes all configured simulators without applying LIVE activation limits", async t => {
  const saved = process.env.PAYMONGO_PAYMENT_METHOD_TYPES;
  delete process.env.PAYMONGO_PAYMENT_METHOD_TYPES;
  t.after(() => {
    if (saved === undefined) delete process.env.PAYMONGO_PAYMENT_METHOD_TYPES;
    else process.env.PAYMONGO_PAYMENT_METHOD_TYPES = saved;
  });
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; throw new Error("TEST must not use merchant activation limits"); });
  assert.deepEqual(await paymongo.getPayMongoPaymentMethodTypes(), ["card", "gcash", "paymaya", "qrph"]);
  process.env.PAYMONGO_PAYMENT_METHOD_TYPES = "gcash,bank,card,gcash,paymaya";
  assert.deepEqual(await paymongo.getPayMongoPaymentMethodTypes(), ["gcash", "card", "paymaya"]);
  process.env.PAYMONGO_PAYMENT_METHOD_TYPES = "bank";
  await assert.rejects(() => paymongo.getPayMongoPaymentMethodTypes(), /configured/i);
  assert.equal(requests, 0);
});

test("retrieve and expire use official session endpoints and require provider-confirmed expiry", async t => {
  const calls = [];
  let providerStatus = "active";
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, method: options.method });
    return { ok: true, status: 200, async json() { return { data: { id: "cs_test_fixture", attributes: { status: providerStatus } } }; } };
  });
  assert.equal((await paymongo.retrievePayMongoCheckoutSession("cs_test_fixture")).attributes.status, "active");
  await assert.rejects(() => paymongo.expirePayMongoCheckoutSession("cs_test_fixture"), /expiry|expired/i);
  providerStatus = "expired";
  assert.equal((await paymongo.expirePayMongoCheckoutSession("cs_test_fixture")).attributes.status, "expired");
  assert.deepEqual(calls, [
    { url: "https://api.paymongo.com/v1/checkout_sessions/cs_test_fixture", method: "GET" },
    { url: "https://api.paymongo.com/v1/checkout_sessions/cs_test_fixture/expire", method: "POST" },
    { url: "https://api.paymongo.com/v1/checkout_sessions/cs_test_fixture/expire", method: "POST" },
  ]);
});

test("unsafe session identifiers are rejected before retrieve or expiration requests", async t => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => { requests++; return successfulResponse(); });
  for (const id of ["", "../../secrets", "cs_test/expire", null]) {
    await assert.rejects(() => paymongo.retrievePayMongoCheckoutSession(id));
    await assert.rejects(() => paymongo.expirePayMongoCheckoutSession(id));
  }
  assert.equal(requests, 0);
});

