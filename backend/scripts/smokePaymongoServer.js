// Local HTTP smoke checks only. Never creates a checkout or submits a payment.
import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { getArtworkSoldOutSql } from "../utils/artworkAvailability.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
const baseUrl = new URL(process.argv[2] || "http://127.0.0.1:5001");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(baseUrl.hostname), "Smoke tests require a local backend");
assert.equal(baseUrl.protocol, "http:", "Use the local HTTP backend");
assert.ok(String(process.env.PAYMONGO_SECRET_KEY || "").trim().startsWith("sk_test_"), "Only PayMongo TEST configuration is allowed");
const signingSecret = String(process.env.PAYMONGO_WEBHOOK_SECRET || "").trim();
assert.ok(signingSecret, "The test webhook signing secret must be configured");

const checks = [];
const check = async (name, run) => {
  try { await run(); checks.push({ name, result: "PASS" }); }
  catch (error) { checks.push({ name, result: "FAIL", message: error.message }); }
};
const signature = (body) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac("sha256", signingSecret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},te=${digest},li=${"0".repeat(64)}`;
};
const request = async (path, { method = "GET", body, signed = false, signatureHeader } = {}) => {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(signed || signatureHeader ? { "Paymongo-Signature": signatureHeader || signature(body) } : {}) },
    ...(body !== undefined ? { body } : {}),
    signal: AbortSignal.timeout(10000),
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: response.status, json, text };
};
const snapshot = async (connection) => {
  const hash = createHash("sha256");
  for (const sql of [
    "SELECT order_id, payment_method, payment_status, payment_reference, paymongo_checkout_session_id, paymongo_payment_id, paymongo_payment_method, paid_at, status, total_amount FROM marketplace_order ORDER BY order_id",
    "SELECT cart_item_id, add_to_id, artwork_id FROM cart_item ORDER BY cart_item_id",
    "SELECT add_to_id, customer_id, total_price FROM add_cart ORDER BY add_to_id",
    "SELECT interaction_id, customer_id, artwork_id, event_type FROM recommendation_interaction WHERE event_type = 'purchase' ORDER BY interaction_id",
  ]) {
    const [rows] = await connection.query(sql);
    hash.update(JSON.stringify(rows));
  }
  return hash.digest("hex");
};

let connection;
let availableArtworkCount;
try {
  connection = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, port: process.env.DB_PORT, connectTimeout: 5000,
  });
  const before = await snapshot(connection);
  const reference = `AM-SMOKE-${randomUUID()}`;
  const [matches] = await connection.query("SELECT order_id FROM marketplace_order WHERE payment_reference = ?", [reference]);
  assert.equal(matches.length, 0, "Synthetic webhook must not match an existing order");

  await check("backend starts and serves its health route", async () => {
    const response = await request("/");
    assert.equal(response.status, 200);
    assert.match(response.text, /Art Match API is running/);
  });
  for (const role of ["buyer", "seller"]) {
    await check(`${role} order endpoint rejects unauthenticated reads`, async () => {
      assert.equal((await request(`/api/${role}/orders`)).status, 401);
    });
  }
  const ignoredBody = JSON.stringify({ data: { id: `evt_smoke_${randomUUID()}`,
    type: "smoke.unrelated", livemode: false, data: { type: "checkout_session", attributes: { livemode: false } } } }, null, 2);
  const webhook = "/api/payments/paymongo/webhook";
  await check("missing webhook signature is rejected before payment processing", async () => {
    assert.equal((await request(webhook, { method: "POST", body: ignoredBody })).status, 401);
  });
  await check("invalid webhook signature is rejected", async () => {
    const header = `t=${Math.floor(Date.now() / 1000)},te=${"0".repeat(64)}`;
    assert.equal((await request(webhook, { method: "POST", body: ignoredBody, signatureHeader: header })).status, 401);
  });
  await check("signed pretty JSON preserves exact raw bytes and acknowledges unrelated events", async () => {
    const response = await request(webhook, { method: "POST", body: ignoredBody, signed: true });
    assert.equal(response.status, 200);
    assert.equal(response.json?.ignored, true);
  });
  await check("changing signed raw request bytes invalidates the signature", async () => {
    assert.equal((await request(webhook, { method: "POST", body: ignoredBody + " ",
      signatureHeader: signature(ignoredBody) })).status, 401);
  });
  await check("signed paid event for a verified nonexistent reference cannot change orders", async () => {
    const body = JSON.stringify({ data: { id: `evt_smoke_${randomUUID()}`,
      type: "checkout_session.payment.paid", livemode: false,
      data: { id: `cs_smoke_${randomUUID()}`, type: "checkout_session", attributes: {
        livemode: false, reference_number: reference,
        payments: [{ id: `pay_smoke_${randomUUID()}`, type: "payment", attributes: {
          status: "paid", amount: 100, currency: "PHP", source: { type: "card" },
          paid_at: Math.floor(Date.now() / 1000), livemode: false,
        } }],
      } },
    } });
    const response = await request(webhook, { method: "POST", body, signed: true });
    assert.equal(response.status, 400);
    assert.match(response.json?.message || "", /does not match/);
  });
  await check("malformed JSON returns a safe client error", async () => {
    const response = await request(webhook, { method: "POST", body: '{"data":' });
    assert.equal(response.status, 400);
    assert.ok(response.json?.message);
    assert.ok(!response.json.stack);
  });
  await check("database startup adds checkout recovery URL and retains shipping handling columns", async () => {
    const [columns] = await connection.query("SHOW COLUMNS FROM marketplace_order");
    assert.ok(columns.some(({ Field, Type, Null }) => Field === "paymongo_checkout_url" && Type === "varchar(2048)" && Null === "YES"));
    assert.ok(columns.some(({ Field }) => Field === "handling_instructions"));
  });
  await check("real Available artwork and verified upload predicate executes with payment-aware stock", async () => {
    const [rows] = await connection.query(`SELECT COUNT(*) AS eligible_count FROM artwork a
      WHERE LOWER(COALESCE(a.status, 'Available')) = 'available'
        AND EXISTS (SELECT 1 FROM artupload au WHERE au.artwork_id = a.artwork_id AND LOWER(au.request_status) = 'verified')
        AND ${getArtworkSoldOutSql()} = 0`);
    availableArtworkCount = Number(rows[0].eligible_count);
    assert.ok(Number.isSafeInteger(availableArtworkCount) && availableArtworkCount >= 0);
  });
  await check("HTTP smoke leaves all order/payment/cart/purchase-interaction data unchanged", async () => {
    assert.ok(before === await snapshot(connection), "Payment/cart/purchase state changed during smoke tests");
  });
} catch (error) {
  checks.push({ name: "smoke setup", result: "FAIL", message: error.message });
} finally {
  await connection?.end();
}
console.log(JSON.stringify({ backend: baseUrl.origin, availableVerifiedArtworks: availableArtworkCount, checks }, null, 2));
if (checks.some(({ result }) => result === "FAIL")) process.exitCode = 1;
