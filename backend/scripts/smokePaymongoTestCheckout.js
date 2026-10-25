// Real provider TEST API smoke: creates/retrieves/expires one unpaid session.
// Does not create orders, collect card information, generate/scan a QR, or pay.
import dotenv from "dotenv";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createPayMongoCheckoutSession, getPayMongoPaymentMethodTypes,
  retrievePayMongoCheckoutSession, expirePayMongoCheckoutSession } from "../utils/paymongo.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
if (!String(process.env.PAYMONGO_SECRET_KEY).startsWith("sk_test_")) throw new Error("Only TEST keys are permitted.");
const reference = "AM-SMOKE-" + randomUUID();
const capabilities = await getPayMongoPaymentMethodTypes();
const methods = process.argv.includes("--all-methods") ? ["card", "gcash", "paymaya", "qrph"] : capabilities;
const frontend = String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
let created;
try {
  created = await createPayMongoCheckoutSession({
    lineItems: [
      { name: "Integration test: seller A artwork", amount: 100000, currency: "PHP", quantity: 1 },
      { name: "Integration test: seller B artwork", amount: 200000, currency: "PHP", quantity: 1 },
      { name: "Shipping: two sellers", amount: 30000, currency: "PHP", quantity: 1 },
    ],
    paymentMethodTypes: methods, successUrl: frontend + "/buyer/profile/orders?payment=success",
    cancelUrl: frontend + "/buyer/profile/orders?payment=cancelled", referenceNumber: reference,
    metadata: { integration_test: "unpaid-session-smoke" },
  });
  const retrieved = await retrievePayMongoCheckoutSession(created.checkoutSessionId);
  assert.equal(retrieved.attributes.livemode, false);
  assert.equal(retrieved.attributes.reference_number, reference);
  assert.equal(retrieved.attributes.status, "active");
  assert.equal(retrieved.attributes.line_items.reduce((sum, item) => sum + item.amount * item.quantity, 0), 330000);
  assert.ok(!(retrieved.attributes.payments || []).some(payment => payment.attributes?.status === "paid"));
  const hosted = await fetch(created.checkoutUrl, { signal: AbortSignal.timeout(10000) });
  assert.ok(hosted.ok, "Hosted Checkout URL must return a successful page");
  const html = await hosted.text();
  console.log(JSON.stringify({ checkoutCreated: true, checkoutSessionId: created.checkoutSessionId,
    reference, capabilities, methods, returnedMethods: retrieved.attributes.payment_method_types,
    hostedMethodButtons: [...html.matchAll(/<button[^>]*name="(card|gcash|paymaya|qrph)"/g)].map(match => match[1]),
    amountCentavos: 330000, retrieved: true, hostedPageStatus: hosted.status,
    paid: false, note: "No payment was attempted; QR Ph was not scanned." }));
} finally {
  if (created) {
    const expired = await expirePayMongoCheckoutSession(created.checkoutSessionId);
    assert.equal(expired.attributes.status, "expired");
    console.log(JSON.stringify({ checkoutExpired: true, checkoutSessionId: created.checkoutSessionId }));
  }
}
