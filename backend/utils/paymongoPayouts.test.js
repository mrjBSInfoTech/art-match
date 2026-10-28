import test from "node:test";
import assert from "node:assert/strict";
import {
  PayoutProviderError, getPayoutCapability, getPayoutWallet, listPayoutInstitutions,
  createPayoutTransfer, retrievePayoutTransfer, findPayoutTransferByReference,
  retrievePayoutRefund, inspectPaymentRefunds,
} from "./paymongoPayouts.js";

const ENV = ["PAYMONGO_SECRET_KEY", "PAYMONGO_PAYOUTS_ENABLED", "PAYMONGO_PAYOUT_WALLET_ID",
  "PAYMONGO_PAYOUT_FEE_RESERVE_CENTAVOS", "PAYMONGO_LIVE_PAYOUTS_ENABLED", "PAYMONGO_MARKETPLACE_PAYOUTS_APPROVED"];
const configure = (t, overrides = {}) => {
  const before = Object.fromEntries(ENV.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    PAYMONGO_SECRET_KEY: "sk_test_fixture", PAYMONGO_PAYOUTS_ENABLED: "true",
    PAYMONGO_PAYOUT_WALLET_ID: "wallet_fixture", PAYMONGO_PAYOUT_FEE_RESERVE_CENTAVOS: "1000",
    PAYMONGO_LIVE_PAYOUTS_ENABLED: "false", PAYMONGO_MARKETPLACE_PAYOUTS_APPROVED: "false", ...overrides,
  });
  t.after(() => { for (const key of ENV) before[key] === undefined ? delete process.env[key] : process.env[key] = before[key]; });
};
const wallet = (overrides = {}) => ({ data: {
  id: "wallet_fixture", livemode: false, type: "default", status: "activated",
  balance: { available: 100000, pending: 0 },
  account: { account_number: "123456789012", account_name: "ArtMatch Institution", currency: "PHP" }, ...overrides,
} });
const institutions = provider => ({ has_more: false, data: [{ id: "1", type: "receiving_institution",
  attributes: { name: "G-Xchange / GCash", provider, provider_code: "GXCHPHM2XXX", type: ["receiver"] } }] });
const destination = { accountNumber: "999999990001", accountName: "Test Recipient", institutionCode: "GXCHPHM2XXX", provider: "instapay" };
const input = (overrides = {}) => ({ amountCentavos: 10000, reference: "AM-PAYOUT-1-A1", destination, ...overrides });
const transfer = (overrides = {}) => ({ id: "tr_fixture", livemode: false, status: "pending", currency: "PHP", amount: 10000,
  provider: "instapay", reference_number: "AM-PAYOUT-1-A1", provider_reference_number: null, fee: 1000,
  destination_account: { number: destination.accountNumber, name: destination.accountName, bic: destination.institutionCode }, ...overrides });
const created = value => ({ data: { id: "batch_tr_fixture", transfers: [value || transfer()] } });
const refund = (overrides = {}) => ({ id: "ref_fixture", type: "refund", attributes: {
  payment_id: "pay_fixture", amount: 1000, currency: "PHP", livemode: false, status: "succeeded", ...overrides,
} });
const queuedFetch = (t, replies) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    assert.ok(replies.length, "No unexpected provider requests");
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    return { ok: (reply.status ?? 200) < 400, status: reply.status ?? 200,
      json: async () => { if (reply.invalidJson) throw new Error("invalid JSON"); return reply.body ?? reply; } };
  });
  return calls;
};
const preflight = () => [institutions("instapay"), institutions("pesonet"), wallet()];

test("outbound payouts stay disabled by default without contacting the provider", async t => {
  configure(t, { PAYMONGO_PAYOUTS_ENABLED: "false" });
  const calls = queuedFetch(t, []);
  const result = await getPayoutCapability();
  assert.equal(result.enabled, false); assert.equal(result.mode, "test"); assert.match(result.message, /disabled/);
  assert.equal(calls.length, 0); assert.equal(JSON.stringify(result).includes("sk_test"), false);
});
test("missing Wallet and fee reserve each block outbound capability", async t => {
  configure(t, { PAYMONGO_PAYOUT_WALLET_ID: "" }); queuedFetch(t, []);
  assert.match((await getPayoutCapability()).message, /Wallet.*not configured/);
  process.env.PAYMONGO_PAYOUT_WALLET_ID = "wallet_fixture";
  process.env.PAYMONGO_PAYOUT_FEE_RESERVE_CENTAVOS = "";
  assert.match((await getPayoutCapability()).message, /fee reserve/);
});
test("LIVE transfers require separate live enablement and marketplace approval", async t => {
  configure(t, { PAYMONGO_SECRET_KEY: "sk_live_fixture" }); queuedFetch(t, []);
  assert.match((await getPayoutCapability()).message, /BLOCKED FOR LIVE PAYOUT/);
  process.env.PAYMONGO_LIVE_PAYOUTS_ENABLED = "true";
  assert.equal((await getPayoutCapability()).enabled, false);
});
test("enabled capability reports TEST mode and only sanitized available balance", async t => {
  configure(t); queuedFetch(t, [wallet()]);
  const result = await getPayoutCapability();
  assert.equal(result.enabled, true); assert.equal(result.mode, "test"); assert.equal(result.availableBalanceCentavos, 100000);
  assert.equal(JSON.stringify(result).includes("123456789012"), false);
});
test("Wallet contract separates available and pending funds and uses backend source account", async t => {
  configure(t); const calls = queuedFetch(t, [wallet({ balance: { available: 12345, pending: 99999 } })]);
  const result = await getPayoutWallet();
  assert.equal(result.availableBalanceCentavos, 12345); assert.equal(result.pendingBalanceCentavos, 99999);
  assert.equal(result.sourceAccount.institutionCode, "PAEYPHM2XXX");
  assert.match(calls[0].url, /\/v2\/wallets\/wallet_fixture\?fields=balance&fields=account&fields=limits$/);
});
for (const [label, change] of [["inactive", { status: "deactivated" }], ["closed-loop", { type: "closed_loop" }],
  ["wrong mode", { livemode: true }], ["missing available balance", { balance: { pending: 1000 } }]]) {
  test(`${label} Wallet is blocked`, async t => {
    configure(t); queuedFetch(t, [wallet(change)]);
    await assert.rejects(getPayoutWallet(), error => error instanceof PayoutProviderError && error.code === "wallet_unavailable");
  });
}
test("receiving institutions use the official canonical provider codes on both rails", async t => {
  configure(t); const calls = queuedFetch(t, [institutions("instapay"), institutions("pesonet")]);
  const result = await listPayoutInstitutions();
  assert.equal(result.length, 2); assert.equal(result[0].code, "GXCHPHM2XXX"); assert.equal(result[0].destinationType, "ewallet");
  assert.equal(calls.every(value => value.url.includes("/v1/wallets/receiving_institutions?provider=")), true);
});
test("incomplete institution response fails closed", async t => {
  configure(t); queuedFetch(t, [{ ...institutions("instapay"), has_more: true }, institutions("pesonet")]);
  await assert.rejects(listPayoutInstitutions(), /complete supported institution list/);
});
test("one payout uses plain batch transfer root and stable Idempotency-Key", async t => {
  configure(t); const calls = queuedFetch(t, [...preflight(), { status: 201, body: created() }]);
  const result = await createPayoutTransfer(input());
  const call = calls.at(-1); const body = JSON.parse(call.options.body);
  assert.equal(call.url, "https://api.paymongo.com/v2/batch_transfers"); assert.equal(call.options.method, "POST");
  assert.equal(call.options.headers["Idempotency-Key"], input().reference); assert.equal(Object.hasOwn(body, "data"), false);
  assert.equal(body.transfers.length, 1); assert.equal(body.transfers[0].amount, 10000);
  assert.equal(body.transfers[0].source_account.number, "123456789012");
  assert.equal(body.transfers[0].destination_account.number, destination.accountNumber);
  assert.equal(body.transfers[0].reference_number, input().reference);
  assert.equal(result.id, "tr_fixture"); assert.equal(result.batchId, "batch_tr_fixture"); assert.equal(result.status, "pending");
  assert.equal(result.amountCentavos, 10000); assert.equal(result.feeCentavos, 1000);
});
test("insufficient available balance including explicit fee reserve does not create transfer", async t => {
  configure(t); const calls = queuedFetch(t, [institutions("instapay"), institutions("pesonet"), wallet({ balance: { available: 10500, pending: 999999 } })]);
  await assert.rejects(createPayoutTransfer(input()), error => error.code === "insufficient_wallet_balance" && error.ambiguous === false);
  assert.equal(calls.some(value => value.options.method === "POST"), false);
});
test("TEST transfers refuse real-looking seller account numbers", async t => {
  configure(t); const calls = queuedFetch(t, []);
  await assert.rejects(createPayoutTransfer(input({ destination: { ...destination, accountNumber: "09123456789" } })), error => error.code === "test_destination_required");
  assert.equal(calls.length, 0);
});
for (const [label, change] of [["fractional amount", { amountCentavos: 100.5 }], ["zero amount", { amountCentavos: 0 }],
  ["invalid reference", { reference: "bad reference" }], ["rail limit", { amountCentavos: 5000001 }],
  ["unsafe callback", { callbackUrl: "http://example.com/callback" }]]) {
  test(`${label} cannot send money`, async t => {
    configure(t); const calls = queuedFetch(t, []);
    await assert.rejects(createPayoutTransfer(input(change)), error => error instanceof PayoutProviderError && !error.ambiguous);
    assert.equal(calls.length, 0);
  });
}
test("unrecognized canonical institution cannot receive payout", async t => {
  configure(t); const calls = queuedFetch(t, [institutions("instapay"), institutions("pesonet")]);
  await assert.rejects(createPayoutTransfer(input({ destination: { ...destination, institutionCode: "BNORPHMMXXX" } })), error => error.code === "invalid_destination");
  assert.equal(calls.length, 2);
});
for (const [label, reply] of [["network timeout", new Error("network")], ["server failure", { status: 500, body: { errors: [{ code: "internal_server_error" }] } }],
  ["provider request timeout", { status: 408, body: { errors: [{ code: "request_timeout" }] } }],
  ["provider early response", { status: 425, body: { errors: [{ code: "too_early" }] } }],
  ["conflicting idempotency", { status: 409, body: { errors: [{ code: "idempotency_in_progress" }] } }],
  ["invalid success JSON", { invalidJson: true }], ["invalid success resource", { body: { data: {} } }],
  ["different transfer reference", { body: created(transfer({ reference_number: "DIFFERENT" })) }]]) {
  test(`${label} leaves result uncertain and never retries`, async t => {
    configure(t); const calls = queuedFetch(t, [...preflight(), reply]);
    await assert.rejects(createPayoutTransfer(input()), error => error instanceof PayoutProviderError && error.ambiguous === true);
    assert.equal(calls.filter(value => value.options.method === "POST").length, 1);
  });
}
test("definitive provider rejection is safe and cannot leak full account numbers", async t => {
  configure(t); queuedFetch(t, [...preflight(), { status: 422, body: { errors: [{ code: "parameter_invalid", detail: "Invalid account 999999990001" }] } }]);
  await assert.rejects(createPayoutTransfer(input()), error => error.ambiguous === false && !error.message.includes(destination.accountNumber));
});
test("transfer retrieval validates provider ID and retains recipient identity for reconciliation", async t => {
  configure(t); const calls = queuedFetch(t, [{ data: transfer({ status: "succeeded", provider_reference_number: "RAIL-123" }) }]);
  const result = await retrievePayoutTransfer("tr_fixture");
  assert.equal(result.status, "succeeded"); assert.equal(result.providerReference, "RAIL-123");
  assert.equal(result.destination.accountNumber, destination.accountNumber); assert.match(calls[0].url, /\/v2\/transfers\/tr_fixture$/);
});
test("reference lookup reconciles only an exact unique match", async t => {
  configure(t); const calls = queuedFetch(t, [{ data: [transfer()] }]);
  assert.equal((await findPayoutTransferByReference(input().reference)).id, "tr_fixture");
  assert.match(calls[0].url, /\/v2\/transfers\?reference_number=AM-PAYOUT-1-A1$/);
});
test("missing transfer lookup never assumes successful payout", async t => {
  configure(t); queuedFetch(t, [{ data: [] }]); assert.equal(await findPayoutTransferByReference(input().reference), null);
});
test("duplicate provider reference cannot be reconciled automatically", async t => {
  configure(t); queuedFetch(t, [{ data: [transfer(), transfer({ id: "tr_second" })] }]);
  await assert.rejects(findPayoutTransferByReference(input().reference), error => error.code === "duplicate_transfer_reference");
});
test("refund retrieval verifies current provider amount, payment, mode and status", async t => {
  configure(t); const calls = queuedFetch(t, [{ data: refund() }]);
  const result = await retrievePayoutRefund("ref_fixture");
  assert.deepEqual(result, { id: "ref_fixture", paymentId: "pay_fixture", amountCentavos: 1000, currency: "PHP", livemode: false, status: "succeeded" });
  assert.match(calls[0].url, /\/v1\/refunds\/ref_fixture$/);
});
test("provider payment check with explicit empty refunds permits zero-refund assessment", async t => {
  configure(t); queuedFetch(t, [{ data: { id: "pay_fixture", attributes: { amount: 10000, currency: "PHP", livemode: false, status: "paid", refunds: [] } } }]);
  const result = await inspectPaymentRefunds("pay_fixture"); assert.equal(result.refunds.length, 0); assert.equal(result.amountCentavos, 10000);
});
test("missing provider refund collection holds payout rather than assuming no refunds", async t => {
  configure(t); queuedFetch(t, [{ data: { id: "pay_fixture", attributes: { amount: 10000, currency: "PHP", livemode: false, status: "paid" } } }]);
  await assert.rejects(inspectPaymentRefunds("pay_fixture"), error => error.code === "invalid_payment");
});
test("each embedded payment refund is independently re-read before payout", async t => {
  configure(t); const calls = queuedFetch(t, [{ data: { id: "pay_fixture", attributes: { amount: 10000, currency: "PHP", livemode: false, status: "paid", refunds: [{ id: "ref_fixture" }] } } }, { data: refund({ status: "processing" }) }]);
  const result = await inspectPaymentRefunds("pay_fixture");
  assert.equal(result.refunds[0].status, "processing"); assert.equal(calls.length, 2);
});
test("a refund linked to a different payment prevents payout", async t => {
  configure(t); queuedFetch(t, [{ data: { id: "pay_fixture", attributes: { amount: 10000, currency: "PHP", livemode: false, status: "paid", refunds: ["ref_fixture"] } } }, { data: refund({ payment_id: "pay_other" }) }]);
  await assert.rejects(inspectPaymentRefunds("pay_fixture"), error => error.code === "refund_mismatch");
});
test("a refund from LIVE cannot be used to reduce TEST seller earnings", async t => {
  configure(t); queuedFetch(t, [{ data: refund({ livemode: true }) }]);
  await assert.rejects(retrievePayoutRefund("ref_fixture"), error => error.code === "refund_mismatch");
});
