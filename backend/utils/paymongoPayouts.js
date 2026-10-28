// Outbound Wallet transfers are deliberately separate from buyer Checkout.
// Official contracts: https://docs.paymongo.com/reference/create-batch-transfer
// https://docs.paymongo.com/reference/wallet-resource
// https://docs.paymongo.com/docs/money-movement-best-practices
const API = "https://api.paymongo.com";
const RAILS = ["instapay", "pesonet"];
const BIC = /^[A-Z0-9]{8}(?:[A-Z0-9]{3})?$/;
const REFERENCE = /^[A-Za-z0-9-]{1,100}$/;
const ACCOUNT_NUMBER = /^\d{6,34}$/;
const ACCOUNT_NAME = /^[\p{L}\p{M}\p{N} .,'’&()\-]{2,180}$/u;
const TRANSFER_STATUSES = new Set(["pending", "succeeded", "failed"]);
const REFUND_STATUSES = new Set(["pending", "processing", "succeeded", "failed"]);

export class PayoutProviderError extends Error {
  constructor(message, { status = 502, ambiguous = false, code = "provider_error" } = {}) {
    super(message);
    this.name = "PayoutProviderError";
    this.status = status;
    this.ambiguous = ambiguous;
    this.code = code;
  }
}
const fail = (message, options) => { throw new PayoutProviderError(message, options); };
const validInteger = value => Number.isSafeInteger(value) && value >= 0;
const config = () => {
  const key = String(process.env.PAYMONGO_SECRET_KEY || "").trim();
  const mode = /^sk_test_\S+$/.test(key) ? "test" : /^sk_live_\S+$/.test(key) ? "live" : "unconfigured";
  const walletId = String(process.env.PAYMONGO_PAYOUT_WALLET_ID || "").trim();
  const feeText = String(process.env.PAYMONGO_PAYOUT_FEE_RESERVE_CENTAVOS || "").trim();
  const feeReserveCentavos = /^\d+$/.test(feeText) && validInteger(Number(feeText)) ? Number(feeText) : null;
  let message = null;
  if (mode === "unconfigured") message = "The backend PayMongo secret key is not configured.";
  else if (process.env.PAYMONGO_PAYOUTS_ENABLED !== "true") message = "PayMongo Wallet payouts are disabled. Account enablement must be confirmed first.";
  else if (!/^wallet_[A-Za-z0-9_-]+$/.test(walletId)) message = "The platform PayMongo payout Wallet is not configured.";
  else if (feeReserveCentavos === null) message = "Configure the platform transfer fee reserve in centavos before enabling payouts.";
  else if (mode === "live" && (process.env.PAYMONGO_LIVE_PAYOUTS_ENABLED !== "true" || process.env.PAYMONGO_MARKETPLACE_PAYOUTS_APPROVED !== "true")) {
    message = "BLOCKED FOR LIVE PAYOUT: PayMongo approval for marketplace payouts and explicit live enablement are required.";
  }
  return { key, mode, walletId, feeReserveCentavos, message };
};
const requireKey = () => {
  const value = config();
  if (value.mode === "unconfigured") fail(value.message, { status: 503, code: "not_configured" });
  return value;
};
const requireEnabled = () => {
  const value = requireKey();
  if (value.message) fail(value.message, { status: 503, code: "payouts_disabled" });
  return value;
};

// Never log provider bodies: validation errors can contain full account numbers.
// There are intentionally no retries here. An uncertain write must be reconciled
// by its persisted reference, rather than submitting a second payout.
const request = async (path, { method = "GET", body, idempotencyKey } = {}) => {
  const { key } = requireKey();
  const writes = method !== "GET";
  let response;
  try {
    response = await fetch(API + path, {
      method,
      headers: {
        Authorization: "Basic " + Buffer.from(key + ":").toString("base64"),
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    fail(writes ? "Transfer confirmation is unknown. Reconcile this payout before retrying." : "PayMongo Wallet could not be reached. Please try again later.", {
      ambiguous: writes, code: writes ? "transfer_unknown" : "provider_unavailable",
    });
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const rawCode = String(payload?.errors?.[0]?.code || "");
    const code = /^[a-z_]{1,80}$/i.test(rawCode) ? rawCode.toLowerCase() : "provider_error";
    const ambiguous = writes && (response.status >= 500 || [408, 409, 425].includes(response.status) || !payload?.errors?.length);
    const messages = {
      insufficient_wallet_balance: "The PayMongo Wallet has insufficient available funds, including transfer fees.",
      insufficient_balance: "The PayMongo Wallet has insufficient available funds, including transfer fees.",
      maintenance: "PayMongo Wallet transfers are temporarily under maintenance.",
      idempotency_in_progress: "This transfer is already being processed. Reconcile before retrying.",
    };
    fail(messages[code] || (ambiguous ? "Transfer confirmation is unknown. Reconcile this payout before retrying." : "PayMongo rejected the payout request. Review Wallet enablement, recipient registration and account details."), {
      status: response.status === 401 || response.status === 403 ? 503 : 502, ambiguous, code,
    });
  }
  if (!payload || typeof payload !== "object") fail("PayMongo returned an invalid Wallet response. Reconciliation is required.", { ambiguous: writes, code: "invalid_response" });
  return payload;
};

export const getPayoutWallet = async () => {
  const { walletId, mode } = requireEnabled();
  const payload = await request(`/v2/wallets/${encodeURIComponent(walletId)}?fields=balance&fields=account&fields=limits`);
  const wallet = payload.data;
  if (wallet?.id !== walletId || wallet.livemode !== (mode === "live") || wallet.status !== "activated" ||
      wallet.type === "closed_loop" || wallet.account?.currency !== "PHP" ||
      !validInteger(wallet.balance?.available) || !validInteger(wallet.balance?.pending) ||
      !ACCOUNT_NUMBER.test(wallet.account?.account_number || "") || !ACCOUNT_NAME.test(wallet.account?.account_name || "")) {
    fail("The configured PayMongo Wallet is unavailable, inactive or does not match this environment.", { status: 503, code: "wallet_unavailable" });
  }
  return {
    id: wallet.id, livemode: wallet.livemode, status: wallet.status, currency: "PHP",
    availableBalanceCentavos: wallet.balance.available, pendingBalanceCentavos: wallet.balance.pending,
    sourceAccount: { accountNumber: wallet.account.account_number, accountName: wallet.account.account_name, institutionCode: "PAEYPHM2XXX" },
  };
};

export const getPayoutCapability = async () => {
  const { mode, message, walletId, feeReserveCentavos } = config();
  const summary = { mode, enabled: false, message, walletConfigured: /^wallet_[A-Za-z0-9_-]+$/.test(walletId), feeReserveCentavos };
  if (message) return summary;
  try {
    const wallet = await getPayoutWallet();
    return { ...summary, enabled: true, message: mode === "test" ? "TEST payouts only. No real funds are transferred." : "Wallet enabled. Send only after administrator review.", availableBalanceCentavos: wallet.availableBalanceCentavos };
  } catch (error) {
    return { ...summary, message: error instanceof PayoutProviderError ? error.message : "Wallet capability could not be verified." };
  }
};

export const listPayoutInstitutions = async () => {
  const lists = await Promise.all(RAILS.map(async provider => {
    const payload = await request(`/v1/wallets/receiving_institutions?provider=${provider}`);
    if (!Array.isArray(payload.data) || payload.has_more === true) fail("PayMongo did not return a complete supported institution list.", { code: "invalid_institutions" });
    return payload.data.map(row => {
      const institution = row?.attributes;
      if (!institution || institution.provider !== provider || !BIC.test(institution.provider_code || "") ||
          typeof institution.name !== "string" || !institution.name.trim() || institution.name.length > 180) {
        fail("PayMongo returned an invalid payout institution.", { code: "invalid_institutions" });
      }
      return {
        code: institution.provider_code, name: institution.name, provider,
        destinationType: /GXCHPHM2XXX|PAPHPHM1XXX/.test(institution.provider_code) ? "ewallet" : "bank",
      };
    });
  }));
  return [...new Map(lists.flat().map(value => [value.provider + ":" + value.code, value])).values()];
};

const normalizeTransfer = (resource, { ambiguous = false } = {}) => {
  const transfer = resource?.attributes ? { ...resource.attributes, id: resource.id } : resource;
  if (!/^tr_[A-Za-z0-9_-]+$/.test(transfer?.id || "") || !TRANSFER_STATUSES.has(transfer.status) ||
      typeof transfer.livemode !== "boolean" || !Number.isSafeInteger(transfer.amount) || transfer.amount <= 0 ||
      transfer.currency !== "PHP" || !REFERENCE.test(transfer.reference_number || "") || !RAILS.includes(transfer.provider) ||
      !ACCOUNT_NUMBER.test(transfer.destination_account?.number || "") || !ACCOUNT_NAME.test(transfer.destination_account?.name || "") ||
      !BIC.test(transfer.destination_account?.bic || "") || (transfer.fee !== undefined && !validInteger(transfer.fee))) {
    fail("PayMongo returned an invalid transfer. Reconciliation is required.", { ambiguous, code: "invalid_transfer" });
  }
  return {
    id: transfer.id, batchId: transfer.batch_transfer_id || null, status: transfer.status,
    amountCentavos: transfer.amount, currency: transfer.currency, livemode: transfer.livemode,
    reference: transfer.reference_number, providerReference: transfer.provider_reference_number || null,
    provider: transfer.provider, feeCentavos: transfer.fee ?? null,
    destination: { accountNumber: transfer.destination_account.number, accountName: transfer.destination_account.name, institutionCode: transfer.destination_account.bic },
    failureCode: /^[A-Za-z0-9_]{1,80}$/.test(transfer.provider_error_code || "") ? transfer.provider_error_code : null,
  };
};
const validCallback = value => {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.hash; }
  catch { return false; }
};
export const createPayoutTransfer = async ({ amountCentavos, reference, destination, callbackUrl } = {}) => {
  const configuration = requireEnabled();
  if (!Number.isSafeInteger(amountCentavos) || amountCentavos <= 0 || !REFERENCE.test(reference || "") ||
      !destination || !RAILS.includes(destination.provider) || !ACCOUNT_NUMBER.test(destination.accountNumber || "") ||
      !ACCOUNT_NAME.test(destination.accountName || "") || !BIC.test(destination.institutionCode || "")) {
    fail("A valid payout amount, reference and destination are required.", { status: 400, code: "invalid_transfer_input" });
  }
  if (configuration.mode === "test" && !/^99999999000[1-6]$/.test(destination.accountNumber)) {
    fail("Use an official PayMongo simulated destination account for TEST payouts.", { status: 400, code: "test_destination_required" });
  }
  const maximum = destination.provider === "instapay" ? 5000000 : 1000000000;
  if (amountCentavos > maximum || !Number.isSafeInteger(amountCentavos + configuration.feeReserveCentavos)) {
    fail("The payout exceeds the transfer rail limit.", { status: 400, code: "transfer_limit_exceeded" });
  }
  if (callbackUrl !== undefined && !validCallback(callbackUrl)) fail("A secure HTTPS transfer callback is required.", { status: 400, code: "invalid_callback" });
  const institutions = await listPayoutInstitutions();
  if (!institutions.some(value => value.code === destination.institutionCode && value.provider === destination.provider)) {
    fail("Choose a currently supported payout institution.", { status: 400, code: "invalid_destination" });
  }
  const wallet = await getPayoutWallet();
  if (wallet.availableBalanceCentavos < amountCentavos + configuration.feeReserveCentavos) {
    fail("The PayMongo Wallet has insufficient available funds, including the configured transfer fee reserve.", { status: 409, code: "insufficient_wallet_balance" });
  }
  const transfer = {
    provider: destination.provider, amount: amountCentavos, currency: "PHP", purpose: "Disbursement",
    description: "ArtMatch seller earnings payout", reference_number: reference,
    source_account: { number: wallet.sourceAccount.accountNumber, name: wallet.sourceAccount.accountName, bic: wallet.sourceAccount.institutionCode },
    destination_account: { number: destination.accountNumber, name: destination.accountName, bic: destination.institutionCode },
    ...(callbackUrl ? { callback_url: callbackUrl } : {}),
  };
  const payload = await request("/v2/batch_transfers", { method: "POST", body: { transfers: [transfer] }, idempotencyKey: reference });
  if (!Array.isArray(payload.data?.transfers) || payload.data.transfers.length !== 1) {
    fail("PayMongo did not confirm one transfer. Reconciliation is required.", { ambiguous: true, code: "invalid_transfer" });
  }
  const result = normalizeTransfer(payload.data.transfers[0], { ambiguous: true });
  if (result.reference !== reference || result.amountCentavos !== amountCentavos || result.livemode !== (configuration.mode === "live") ||
      result.provider !== destination.provider || result.destination.accountNumber !== destination.accountNumber ||
      result.destination.accountName !== destination.accountName || result.destination.institutionCode !== destination.institutionCode) {
    fail("PayMongo returned a different transfer. Reconciliation is required.", { ambiguous: true, code: "transfer_mismatch" });
  }
  return { ...result, batchId: payload.data.id || result.batchId };
};

export const retrievePayoutTransfer = async id => {
  if (!/^tr_[A-Za-z0-9_-]+$/.test(id || "")) fail("A valid provider transfer identifier is required.", { status: 400, code: "invalid_transfer_id" });
  const payload = await request(`/v2/transfers/${encodeURIComponent(id)}`);
  const result = normalizeTransfer(payload.data);
  if (result.id !== id) fail("The provider transfer identifier did not match.", { code: "transfer_mismatch" });
  return result;
};
export const findPayoutTransferByReference = async reference => {
  if (!REFERENCE.test(reference || "")) fail("A valid payout reference is required.", { status: 400, code: "invalid_reference" });
  const payload = await request(`/v2/transfers?reference_number=${encodeURIComponent(reference)}`);
  if (!Array.isArray(payload.data) || payload.has_more === true) fail("Transfer lookup is incomplete. Manual reconciliation is required.", { code: "reconciliation_required" });
  const matches = payload.data.map(value => normalizeTransfer(value)).filter(value => value.reference === reference);
  if (matches.length > 1) fail("Multiple transfers have this reference. Manual reconciliation is required.", { code: "duplicate_transfer_reference" });
  return matches[0] || null;
};

const normalizeRefund = resource => {
  const refund = resource?.attributes;
  if (!/^ref_[A-Za-z0-9_-]+$/.test(resource?.id || "") || !refund || !REFUND_STATUSES.has(refund.status) ||
      !Number.isSafeInteger(refund.amount) || refund.amount <= 0 || refund.currency !== "PHP" ||
      typeof refund.livemode !== "boolean" || !/^pay_[A-Za-z0-9_-]+$/.test(refund.payment_id || "")) {
    fail("PayMongo refund data could not be verified. Payout remains held.", { code: "invalid_refund" });
  }
  return { id: resource.id, paymentId: refund.payment_id, amountCentavos: refund.amount,
    currency: refund.currency, livemode: refund.livemode, status: refund.status };
};
export const retrievePayoutRefund = async id => {
  if (!/^ref_[A-Za-z0-9_-]+$/.test(id || "")) fail("A valid PayMongo refund identifier is required.", { status: 400, code: "invalid_refund_id" });
  const payload = await request(`/v1/refunds/${encodeURIComponent(id)}`);
  const result = normalizeRefund(payload.data);
  if (result.id !== id || result.livemode !== (requireKey().mode === "live")) fail("The PayMongo refund does not match this environment.", { code: "refund_mismatch" });
  return result;
};
export const inspectPaymentRefunds = async paymentId => {
  if (!/^pay_[A-Za-z0-9_-]+$/.test(paymentId || "")) fail("A valid buyer payment identifier is required.", { status: 400, code: "invalid_payment_id" });
  const payload = await request(`/v1/payments/${encodeURIComponent(paymentId)}`);
  const payment = payload.data;
  const attributes = payment?.attributes;
  if (payment?.id !== paymentId || !attributes || !Number.isSafeInteger(attributes.amount) || attributes.amount <= 0 ||
      attributes.currency !== "PHP" || attributes.livemode !== (requireKey().mode === "live") ||
      !["pending", "failed", "paid"].includes(attributes.status) || !Array.isArray(attributes.refunds)) {
    fail("The buyer payment and its refunds could not be verified. Payout remains held.", { code: "invalid_payment" });
  }
  const refunds = await Promise.all(attributes.refunds.map(async refund => {
    // A payment may embed refund IDs or resource objects; retrieve each resource
    // so its payment link, mode and final status are verified independently.
    const refundId = typeof refund === "string" ? refund : refund?.id;
    const result = await retrievePayoutRefund(refundId);
    if (result.paymentId !== paymentId) fail("A refund belongs to a different buyer payment. Payout remains held.", { code: "refund_mismatch" });
    return result;
  }));
  if (new Set(refunds.map(value => value.id)).size !== refunds.length ||
      refunds.filter(value => value.status === "succeeded").reduce((sum, value) => sum + value.amountCentavos, 0) > attributes.amount) {
    fail("The buyer payment refund totals could not be verified. Payout remains held.", { code: "invalid_refund_total" });
  }
  return { paymentId, amountCentavos: attributes.amount, status: attributes.status, currency: attributes.currency, livemode: attributes.livemode, refunds };
};
