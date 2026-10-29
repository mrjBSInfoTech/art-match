import assert from "node:assert/strict";
import test from "node:test";
import * as provider from "./payoutProvider.js";

const names = ["NODE_ENV", "PAYOUT_PROVIDER", "PAYMONGO_SECRET_KEY", "PAYMONGO_PAYOUTS_ENABLED",
  "PAYMONGO_PAYOUT_WALLET_ID", "PAYMONGO_PAYOUT_FEE_RESERVE_CENTAVOS"];
const setup = (t, env = {}) => {
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  Object.assign(process.env, { NODE_ENV: "development", PAYOUT_PROVIDER: "demo" }, env);
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (...args) => { calls.push(args); throw new Error("No network permitted in provider test"); };
  t.after(() => {
    globalThis.fetch = previousFetch;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    assert.equal(calls.length, 0, "demo/blocked provider paths must never call PayMongo or any other external URL");
  });
  return calls;
};
const input = () => ({
  amountCentavos: 10000, reference: provider.createPayoutReference(123),
  destination: { accountNumber: "999999990001", accountName: "Test Seller", institutionCode: "GXCHPHM2XXX", provider: "instapay" },
});
const localEvidence = () => ({
  order: { paymongo_payment_id: "pay_existing_test", payment_status: "Paid", total_amount: "200.00" },
  refunds: [{ provider_refund_id: "ref_existing_test", provider_payment_id: "pay_existing_test", amount: "50.00", status: "Succeeded" }],
});

test("explicit demo is enabled without a PayMongo key or Wallet and calls no external API", async t => {
  setup(t);
  assert.equal(provider.assertPayoutProviderConfiguration(), "demo");
  const capability = await provider.getPayoutCapability();
  assert.equal(capability.enabled, true);
  assert.equal(capability.provider, "demo");
  assert.equal(capability.mode, "demo");
  assert.equal(capability.simulated, true);
  assert.equal(capability.walletConfigured, false);
  const wallet = await provider.getPayoutWallet();
  assert.equal(wallet.simulated, true);
  assert.equal(wallet.id, undefined);
  assert.equal(wallet.sourceAccount, undefined);
  assert.doesNotMatch(JSON.stringify(wallet), /wallet_|sk_live_|sk_test_/);
  const institutions = await provider.listPayoutInstitutions();
  assert.deepEqual(institutions.map(value => value.code), ["GXCHPHM2XXX", "PAPHPHM1XXX"]);
  assert.ok(institutions.every(value => /Demo/.test(value.name)));
});

test("demo creates an unmistakable simulated result for GCash and Maya", async t => {
  setup(t);
  for (const institutionCode of ["GXCHPHM2XXX", "PAPHPHM1XXX"]) {
    const request = input();
    request.destination.institutionCode = institutionCode;
    const result = await provider.createPayoutTransfer(request);
    assert.match(result.id, /^DEMO-PAYOUT-\d{8}-123-/);
    assert.equal(result.payoutProvider, "demo");
    assert.equal(result.status, "succeeded");
    assert.equal(result.simulated, true);
    assert.equal(result.livemode, false);
    assert.equal(result.feeCentavos, 0);
    assert.equal(result.amountCentavos, 10000);
    assert.equal(result.reference, request.reference);
    assert.equal(result.providerReference, request.reference);
    assert.equal(result.destination.institutionCode, institutionCode);
  }
});

test("demo reconciliation reconstructs the same result from a persisted attempt after module restart", async t => {
  setup(t);
  const snapshot = input();
  const original = await provider.createPayoutTransfer(snapshot);
  const restarted = await import(`./payoutProvider.js?restart=${Date.now()}`);
  assert.deepEqual(await restarted.retrievePayoutTransfer(original.id, structuredClone(snapshot)), original);
  assert.deepEqual(await restarted.findPayoutTransferByReference(original.reference, structuredClone(snapshot)), original);
  await assert.rejects(() => restarted.retrievePayoutTransfer("DEMO-PAYOUT-different", snapshot), /persisted reference/);
  await assert.rejects(() => restarted.findPayoutTransferByReference(original.reference), /persisted reference/);
});

test("demo validates amount and frozen destination instead of accepting arbitrary transfer data", async t => {
  setup(t);
  for (const patch of [
    { amountCentavos: 0 }, { amountCentavos: 10.5 }, { amountCentavos: Number.MAX_SAFE_INTEGER + 1 },
    { reference: "AM-PO-real-looking-reference" }, { destination: null },
  ]) await assert.rejects(() => provider.createPayoutTransfer({ ...input(), ...patch }), /valid persisted demo payout/);
  const request = input(); request.destination.institutionCode = "UNSUPPORTED";
  await assert.rejects(() => provider.createPayoutTransfer(request), /valid persisted demo payout/);
});

test("demo refund preflight uses validated local evidence and does not invent a provider confirmation", async t => {
  setup(t);
  const result = await provider.inspectPaymentRefunds("pay_existing_test", localEvidence());
  assert.equal(result.evidenceSource, "local_database");
  assert.equal(result.simulated, true);
  assert.equal(result.amountCentavos, 20000);
  assert.equal(result.refunds[0].amountCentavos, 5000);
  assert.equal(result.refunds[0].status, "succeeded");
  await assert.rejects(() => provider.inspectPaymentRefunds("pay_existing_test"), /local refund evidence/);
  await assert.rejects(() => provider.retrievePayoutRefund("ref_test"), /does not verify or issue PayMongo refunds/);
});

test("demo refuses missing payment evidence, other payments, duplicate refunds and invalid amounts", async t => {
  setup(t);
  for (const modify of [
    value => { value.order.payment_status = "Pending"; },
    value => { value.order.paymongo_payment_id = "pay_other"; },
    value => { value.refunds[0].provider_payment_id = "pay_other"; },
    value => { value.refunds[0].amount = "not-an-amount"; },
    value => { value.refunds.push({ ...value.refunds[0] }); },
    value => { value.refunds[0].status = "unverified"; },
  ]) {
    const evidence = localEvidence(); modify(evidence);
    await assert.rejects(() => provider.inspectPaymentRefunds("pay_existing_test", evidence), error => error.status === 409);
  }
});

test("demo ignores any configured PayMongo keys or Wallet and never falls through to them", async t => {
  setup(t, { PAYMONGO_SECRET_KEY: "sk_live_unused_fixture", PAYMONGO_PAYOUT_WALLET_ID: "wallet_unused_fixture", PAYMONGO_PAYOUTS_ENABLED: "true" });
  await provider.getPayoutCapability(); await provider.getPayoutWallet(); await provider.listPayoutInstitutions();
  await provider.createPayoutTransfer(input()); await provider.inspectPaymentRefunds("pay_existing_test", localEvidence());
  assert.throws(() => provider.forPayoutProvider("paymongo"), /Switch explicitly to the PayMongo provider/);
});

test("production refuses demo both at startup and if configuration changes after startup", async t => {
  setup(t);
  const adapter = provider.forPayoutProvider("demo");
  process.env.NODE_ENV = "production";
  assert.throws(() => provider.assertPayoutProviderConfiguration(), /forbidden in production/);
  assert.equal((await provider.getPayoutCapability()).enabled, false);
  await assert.rejects(() => adapter.getPayoutWallet(), /forbidden in production/);
  await assert.rejects(() => adapter.listPayoutInstitutions(), /forbidden in production/);
  await assert.rejects(() => adapter.createPayoutTransfer({}), /forbidden in production/);
});

test("unknown provider fails closed without choosing demo or contacting PayMongo", async t => {
  setup(t, { PAYOUT_PROVIDER: "typo" });
  assert.throws(() => provider.assertPayoutProviderConfiguration(), /Unknown payout provider/);
  assert.throws(() => provider.forPayoutProvider(), /Unknown payout provider/);
  const capability = await provider.getPayoutCapability();
  assert.equal(capability.enabled, false);
  assert.match(capability.message, /Unknown payout provider/);
});

test("missing provider flag defaults to PayMongo; missing credentials do not enable demo", async t => {
  setup(t); delete process.env.PAYOUT_PROVIDER;
  assert.equal(provider.getPayoutProviderName(), "paymongo");
  const capability = await provider.getPayoutCapability();
  assert.equal(capability.provider, "paymongo");
  assert.equal(capability.enabled, false);
  assert.equal(capability.simulated, false);
  await assert.rejects(() => provider.createPayoutTransfer({}), /not configured/);
});

test("explicit PayMongo with a TEST key but missing Wallet stays disabled without a demo fallback", async t => {
  setup(t, { PAYOUT_PROVIDER: "paymongo", PAYMONGO_SECRET_KEY: "sk_test_fixture", PAYMONGO_PAYOUTS_ENABLED: "true" });
  const capability = await provider.getPayoutCapability();
  assert.equal(capability.provider, "paymongo"); assert.equal(capability.enabled, false);
  assert.match(capability.message, /Wallet is not configured/);
  await assert.rejects(() => provider.createPayoutTransfer({}), /Wallet is not configured/);
});

test("a persisted demo result remains demo when active provider changes to PayMongo", async t => {
  setup(t);
  const snapshot = input();
  process.env.PAYOUT_PROVIDER = "paymongo";
  const adapter = provider.forPayoutProvider("demo");
  const result = await adapter.findPayoutTransferByReference(snapshot.reference, snapshot);
  assert.equal(result.payoutProvider, "demo"); assert.equal(result.simulated, true);
  assert.equal((await provider.getPayoutCapability()).enabled, false, "unconfigured active PayMongo remains disabled");
});

test("demo references are distinct without imitating a PayMongo transfer or Wallet ID", t => {
  setup(t);
  const first = provider.createPayoutReference(123);
  assert.notEqual(first, provider.createPayoutReference(123));
  assert.doesNotMatch(first, /^(wallet_|tr_)/);
  assert.throws(() => provider.createPayoutReference(-1), /valid payout identifier/);
});
