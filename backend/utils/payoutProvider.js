import { randomUUID } from "node:crypto";
import * as paymongo from "./paymongoPayouts.js";

// Provider selection is explicit. Missing Wallet credentials never select demo.
// The demo adapter has no network client, Wallet ID or API credential.
export const PayoutProviderError = paymongo.PayoutProviderError;
const fail = (message, code = "provider_not_configured", status = 503) => {
  throw new PayoutProviderError(message, { status, code });
};
const configuredName = (env = process.env) => String(env.PAYOUT_PROVIDER || "paymongo").trim().toLowerCase();
const isProduction = (env = process.env) => String(env.NODE_ENV || "").trim().toLowerCase() === "production";

export function assertPayoutProviderConfiguration(env = process.env) {
  const name = configuredName(env);
  if (!["demo", "paymongo"].includes(name)) fail("Unknown payout provider. Configure PAYOUT_PROVIDER as demo or paymongo.", "unknown_provider");
  if (name === "demo" && isProduction(env)) fail("Demo payout provider is forbidden in production.", "demo_forbidden");
  return name;
}

export const getPayoutProviderName = () => assertPayoutProviderConfiguration();
const demoAllowed = () => {
  assertPayoutProviderConfiguration();
  if (isProduction()) fail("Demo payout provider is forbidden in production.", "demo_forbidden");
};
const paymongoAllowed = () => {
  if (assertPayoutProviderConfiguration() !== "paymongo") {
    fail("This is a PayMongo payout attempt. Switch explicitly to the PayMongo provider before reconciling it.", "provider_mode_mismatch", 409);
  }
};

export function createPayoutReference(payoutId, name = getPayoutProviderName()) {
  if (!Number.isSafeInteger(Number(payoutId)) || Number(payoutId) <= 0) fail("A valid payout identifier is required.", "invalid_payout_id", 400);
  if (name === "demo") {
    demoAllowed();
    return `DEMO-PAYOUT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${payoutId}-${randomUUID()}`;
  }
  if (name !== "paymongo") fail("Unknown payout provider.", "unknown_provider");
  paymongoAllowed();
  return `AM-PO-${payoutId}-${randomUUID()}`;
}

const demoInstitutions = Object.freeze([
  Object.freeze({ code: "GXCHPHM2XXX", name: "G-Xchange, Inc. (GCash Demo)", provider: "instapay", destinationType: "ewallet" }),
  Object.freeze({ code: "PAPHPHM1XXX", name: "Maya Philippines, Inc. (Maya Demo)", provider: "instapay", destinationType: "ewallet" }),
]);
const demoReference = /^DEMO-PAYOUT-\d{8}-\d+-[0-9a-f-]{36}$/;
const accountName = /^[\p{L}\p{M}\p{N} .,'\u2019&()\-]{2,180}$/u;
const cents = value => {
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "") fail("Local payout accounting could not be verified.", "invalid_local_evidence", 409);
  const result = Number(value) * 100;
  if (!Number.isSafeInteger(Math.round(result)) || result < 0 || Math.abs(result - Math.round(result)) > 0.000001) {
    fail("Local payout accounting could not be verified.", "invalid_local_evidence", 409);
  }
  return Math.round(result);
};

// Reconstruct the same simulated result using the immutable attempt snapshot.
// The service reserves that snapshot in MySQL before calling this function.
// No process-local map is needed, so reconciliation survives a server restart.
const simulatedTransfer = ({ amountCentavos, reference, destination } = {}) => {
  demoAllowed();
  if (!Number.isSafeInteger(amountCentavos) || amountCentavos <= 0 || !demoReference.test(reference || "") ||
      !destination || !/^\d{6,34}$/.test(destination.accountNumber || "") || !accountName.test(destination.accountName || "") ||
      !demoInstitutions.some(value => value.code === destination.institutionCode && value.provider === destination.provider)) {
    fail("A valid persisted demo payout amount, reference and destination are required.", "invalid_demo_transfer", 400);
  }
  return {
    id: reference, batchId: null, status: "succeeded", amountCentavos, currency: "PHP", livemode: false,
    reference, providerReference: reference, provider: destination.provider, payoutProvider: "demo", simulated: true,
    feeCentavos: 0, destination: { ...destination }, failureCode: null,
  };
};

const demoAdapter = {
  name: "demo", payoutProvider: "demo", PayoutProviderError,
  async getPayoutCapability() {
    demoAllowed();
    return { provider: "demo", mode: "demo", simulated: true, enabled: true, walletConfigured: false,
      feeReserveCentavos: 0, message: "Demo payout provider. Simulated payouts only; no external money movement occurs." };
  },
  async getPayoutWallet() {
    demoAllowed();
    // This is readiness only, deliberately not a fabricated PayMongo Wallet.
    return { provider: "demo", simulated: true, currency: "PHP" };
  },
  async listPayoutInstitutions() {
    demoAllowed();
    return demoInstitutions.map(value => ({ ...value }));
  },
  async createPayoutTransfer(input) { return simulatedTransfer(input); },
  async retrievePayoutTransfer(identifier, snapshot) {
    demoAllowed();
    if (identifier !== snapshot?.reference) fail("The demo attempt does not match its persisted reference.", "demo_transfer_mismatch", 409);
    return simulatedTransfer(snapshot);
  },
  async findPayoutTransferByReference(reference, snapshot) {
    demoAllowed();
    if (reference !== snapshot?.reference) fail("The demo attempt does not match its persisted reference.", "demo_transfer_mismatch", 409);
    return simulatedTransfer(snapshot);
  },
  async inspectPaymentRefunds(paymentId, { order, refunds } = {}) {
    demoAllowed();
    // Demo consumes existing database evidence; it does not assert that a new
    // payment/refund happened at PayMongo. Economic eligibility is still checked
    // under the order lock by the provider-independent payout service.
    if (!order || order.paymongo_payment_id !== paymentId || order.payment_status !== "Paid" || !Array.isArray(refunds)) {
      fail("Paid buyer payment and local refund evidence are required for a demo payout.", "invalid_local_evidence", 409);
    }
    const normalized = refunds.map(row => {
      const statuses = { Pending: "pending", Succeeded: "succeeded", Failed: "failed" };
      if (!row.provider_refund_id || row.provider_payment_id !== paymentId || !statuses[row.status]) {
        fail("Local refund evidence could not be verified. Payout remains held.", "invalid_local_evidence", 409);
      }
      return { id: row.provider_refund_id, paymentId, amountCentavos: cents(row.amount), currency: "PHP",
        livemode: false, status: statuses[row.status], simulated: true };
    });
    if (new Set(normalized.map(row => row.id)).size !== normalized.length) fail("Duplicate local refund evidence requires review.", "invalid_local_evidence", 409);
    return { paymentId, amountCentavos: cents(order.total_amount), status: "paid", currency: "PHP", livemode: false,
      refunds: normalized, simulated: true, evidenceSource: "local_database" };
  },
  async retrievePayoutRefund() {
    demoAllowed();
    fail("Demo payout mode does not verify or issue PayMongo refunds. Existing local return and refund checks still apply.", "demo_refund_unavailable", 409);
  },
};

const paymongoAdapter = { name: "paymongo", payoutProvider: "paymongo", PayoutProviderError };
for (const method of ["getPayoutWallet", "listPayoutInstitutions", "createPayoutTransfer", "retrievePayoutTransfer", "findPayoutTransferByReference", "inspectPaymentRefunds", "retrievePayoutRefund"]) {
  paymongoAdapter[method] = async (...args) => {
    paymongoAllowed();
    const result = await paymongo[method](...args);
    return ["createPayoutTransfer", "retrievePayoutTransfer", "findPayoutTransferByReference"].includes(method) && result
      ? { ...result, payoutProvider: "paymongo", simulated: false } : result;
  };
}
paymongoAdapter.getPayoutCapability = async () => {
  paymongoAllowed();
  const result = await paymongo.getPayoutCapability();
  return { ...result, provider: "paymongo", simulated: false };
};

export function forPayoutProvider(name = getPayoutProviderName()) {
  assertPayoutProviderConfiguration();
  if (name === "demo") { demoAllowed(); return demoAdapter; }
  if (name === "paymongo") { paymongoAllowed(); return paymongoAdapter; }
  fail("Unknown persisted payout provider. Reconciliation requires review.", "unknown_provider");
}

export const getPayoutCapability = async () => {
  try { return await forPayoutProvider().getPayoutCapability(); }
  catch (error) {
    return { provider: configuredName(), mode: "unconfigured", enabled: false, walletConfigured: false,
      simulated: false, feeReserveCentavos: null, message: error instanceof PayoutProviderError ? error.message : "Payout provider is unavailable." };
  }
};
export const getPayoutWallet = (...args) => forPayoutProvider().getPayoutWallet(...args);
export const listPayoutInstitutions = (...args) => forPayoutProvider().listPayoutInstitutions(...args);
export const inspectPaymentRefunds = (...args) => forPayoutProvider().inspectPaymentRefunds(...args);
export const createPayoutTransfer = (...args) => forPayoutProvider().createPayoutTransfer(...args);
export const retrievePayoutTransfer = (...args) => forPayoutProvider().retrievePayoutTransfer(...args);
export const findPayoutTransferByReference = (...args) => forPayoutProvider().findPayoutTransferByReference(...args);
export const retrievePayoutRefund = (...args) => forPayoutProvider().retrievePayoutRefund(...args);
