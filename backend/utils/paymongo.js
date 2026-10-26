import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.paymongo.com";
const DEFAULT_METHODS = ["card", "gcash", "paymaya", "qrph"];
const SUPPORTED_METHODS = new Set(DEFAULT_METHODS);

export class PayMongoError extends Error {
  constructor(message, status = 502, providerStatus = null, providerCode = null) {
    super(message);
    this.name = "PayMongoError";
    this.status = status;
    this.providerStatus = providerStatus;
    this.providerCode = providerCode;
  }
}

const secretKey = () => {
  const key = String(process.env.PAYMONGO_SECRET_KEY || "").trim();
  if (!/^sk_(test|live)_\S+$/.test(key)) throw new PayMongoError("Online payment key is not configured. Please contact support.", 503);
  return key;
};
export const getPayMongoMode = () => secretKey().startsWith("sk_live_");

// Use integer cents throughout checkout, rejecting fractions of a cent.
export const pesosToCentavos = value => {
  if (!["string", "number"].includes(typeof value) || String(value).trim() === "") throw new PayMongoError("Invalid payment amount", 400);
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(cents) || cents <= 0 || Math.abs(amount * 100 - cents) > 0.000001) {
    throw new PayMongoError("Payment amount must be positive with at most two decimal places", 400);
  }
  return cents;
};

const request = async (path, { method = "GET", attributes } = {}) => {
  const key = secretKey();
  let response;
  try {
    response = await fetch(API + path, {
      method,
      headers: { Authorization: "Basic " + Buffer.from(key + ":").toString("base64"), "Content-Type": "application/json" },
      ...(attributes ? { body: JSON.stringify({ data: { attributes } }) } : {}),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new PayMongoError("PayMongo is temporarily unavailable. Please try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = String(body?.errors?.[0]?.code || "");
    if (code.toLowerCase() === "maintenance") {
      throw new PayMongoError(
        "PayMongo is temporarily under maintenance. Please try again later or choose Cash on Delivery.",
        503, response.status, "maintenance",
      );
    }
    const message = /payment_method|capabilit/i.test(code)
      ? "A selected payment method is unavailable on this PayMongo account."
      : response.status === 400
        ? "PayMongo cannot complete this request. The payment may already be paid or processing."
        : "PayMongo could not complete the request. Please try again or contact support.";
    throw new PayMongoError(message, 502, response.status);
  }
  if (!body) throw new PayMongoError("PayMongo returned an invalid response.");
  return body;
};

// TEST Hosted Checkout supports the configured simulators. LIVE methods must
// also be activated for this merchant before real payments can be accepted.
export const getPayMongoPaymentMethodTypes = async () => {
  const configured = [...new Set(String(process.env.PAYMONGO_PAYMENT_METHOD_TYPES || DEFAULT_METHODS.join(","))
    .split(",").map(value => value.trim().toLowerCase()).filter(value => SUPPORTED_METHODS.has(value)))];
  if (!configured.length) throw new PayMongoError("No supported online payment methods are configured. Please contact support.", 503);
  if (!getPayMongoMode()) return configured;
  const body = await request("/v1/merchants/capabilities/payment_methods");
  const available = Array.isArray(body) ? body : body.data?.attributes?.payment_methods || body.data?.payment_methods || body.payment_methods || body.data;
  if (!Array.isArray(available) || !available.every(value => typeof value === "string")) throw new PayMongoError("Unable to verify available payment methods.");
  const methods = configured.filter(value => available.includes(value));
  if (!methods.length) throw new PayMongoError("No configured online payment methods are enabled. Please contact support.", 503);
  return methods;
};

const validUrl = value => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
};

export const createPayMongoCheckoutSession = async ({
  lineItems, paymentMethodTypes, successUrl, cancelUrl, referenceNumber, metadata = null,
}) => {
  if (!Array.isArray(lineItems) || !lineItems.length) throw new PayMongoError("PayMongo checkout requires line items", 400);
  let total = 0;
  for (const item of lineItems) {
    if (!item || typeof item.name !== "string" || !item.name.trim() || item.name.length > 255 ||
        !Number.isSafeInteger(item.amount) || item.amount <= 0 || !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0 || item.currency !== "PHP") throw new PayMongoError("Invalid PayMongo checkout line item", 400);
    total += item.amount * item.quantity;
  }
  if (!Number.isSafeInteger(total)) throw new PayMongoError("Checkout total is too large", 400);
  if (!Array.isArray(paymentMethodTypes) || !paymentMethodTypes.length || paymentMethodTypes.some(value => !SUPPORTED_METHODS.has(value))) {
    throw new PayMongoError("Invalid PayMongo payment method", 400);
  }
  if (!validUrl(successUrl) || !validUrl(cancelUrl) || typeof referenceNumber !== "string" || !referenceNumber.trim() || referenceNumber.length > 100) {
    throw new PayMongoError("PayMongo checkout requires valid return URLs and a reference number", 400);
  }
  if (metadata && (typeof metadata !== "object" || Array.isArray(metadata) || Object.values(metadata).some(value => typeof value !== "string"))) {
    throw new PayMongoError("Invalid checkout metadata", 400);
  }
  const body = await request("/v2/checkout_sessions", { method: "POST", attributes: {
    line_items: lineItems, payment_method_types: [...new Set(paymentMethodTypes)],
    success_url: successUrl, cancel_url: cancelUrl, reference_number: referenceNumber,
    send_email_receipt: true, pass_on_fees: false, ...(metadata ? { metadata } : {}),
  } });
  const session = body.data;
  if (!session?.id || !validUrl(session.attributes?.checkout_url) ||
      (session.attributes?.reference_number && session.attributes.reference_number !== referenceNumber)) {
    throw new PayMongoError("PayMongo did not return a valid Checkout Session");
  }
  return { checkoutSessionId: session.id, checkoutUrl: session.attributes.checkout_url, referenceNumber };
};

const sessionPath = id => {
  if (typeof id !== "string" || !/^cs_[a-zA-Z0-9_-]+$/.test(id)) throw new PayMongoError("Invalid Checkout Session ID", 400);
  return "/v1/checkout_sessions/" + encodeURIComponent(id);
};
export const retrievePayMongoCheckoutSession = async id => {
  const body = await request(sessionPath(id));
  if (body.data?.id !== id || !body.data?.attributes) throw new PayMongoError("PayMongo returned an invalid Checkout Session");
  return body.data;
};
export const expirePayMongoCheckoutSession = async id => {
  const body = await request(sessionPath(id) + "/expire", { method: "POST" });
  if (body.data?.id !== id || body.data?.attributes?.status !== "expired") throw new PayMongoError("PayMongo did not confirm checkout expiry. Please refresh your orders.");
  return body.data;
};

export const verifyPayMongoSignature = ({
  rawBody, signatureHeader, livemode, secret = process.env.PAYMONGO_WEBHOOK_SECRET, now = Date.now(), toleranceSeconds = 300,
}) => {
  if (!secret) throw new PayMongoError("Webhook verification is not configured", 503);
  if (!Buffer.isBuffer(rawBody) || typeof signatureHeader !== "string" || typeof livemode !== "boolean") return false;
  const parts = {};
  for (const part of signatureHeader.split(",")) {
    const index = part.indexOf("=");
    if (index < 0) return false;
    const key = part.slice(0, index).trim();
    if (Object.hasOwn(parts, key)) return false;
    parts[key] = part.slice(index + 1).trim();
  }
  const digest = parts[livemode ? "li" : "te"];
  if (!/^\d+$/.test(parts.t || "") || !/^[a-f0-9]{64}$/i.test(digest || "") ||
      Math.abs(now / 1000 - Number(parts.t)) > toleranceSeconds) return false;
  const expected = createHmac("sha256", String(secret).trim()).update(parts.t + ".").update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(digest, "hex"));
};
