// Real TEST-mode lifecycle checks with dedicated, labelled fixtures only.
// No secret key, webhook secret, JWT, or password is ever printed.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import { deleteParcelPhoto } from "../utils/parcelPhotoStorage.js";
import { expirePayMongoCheckoutSession, retrievePayMongoCheckoutSession } from "../utils/paymongo.js";
import { getArtworkSoldQuantitySql } from "../utils/artworkAvailability.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
const cacheDirectory = fileURLToPath(new URL("../.cache/", import.meta.url));
const stateFile = fileURLToPath(new URL("../.cache/paymongo-flow-test.json", import.meta.url));
const baseUrl = "http://localhost:5000";
const mode = process.argv.includes("--prepare") ? "prepare"
  : process.argv.includes("--inspect-paid") ? "inspect-paid"
  : process.argv.includes("--verify-paid") ? "verify-paid"
    : process.argv.includes("--cleanup") ? "cleanup" : "complete";
const results = [];
let database;
let state;
let keepPreparedFixture = false;

function pass(name) {
  results.push({ result: "PASS", test: name });
  console.log(`PASS ${name}`);
}
async function rows(sql, params = []) {
  const [value] = await database.query(sql, params);
  return value;
}
async function api(path, { method = "GET", token = state.buyerToken, body } = {}) {
  const response = await fetch(baseUrl + path, {
    method, headers: { Authorization: `Bearer ${token}`, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) },
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}
async function saveState() {
  await fs.mkdir(cacheDirectory, { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
}
async function readState() {
  const saved = JSON.parse(await fs.readFile(stateFile, "utf8"));
  if (saved.version !== 1 || !/^pmtest_[a-f0-9]{16}$/.test(saved.marker) ||
      !Number.isSafeInteger(saved.customerId) || saved.customerId <= 0 ||
      !Array.isArray(saved.sellerIds) || saved.sellerIds.length !== 2 ||
      !Array.isArray(saved.artworkIds) || saved.artworkIds.length !== 3 ||
      ![...saved.sellerIds, ...saved.artworkIds].every(id => Number.isSafeInteger(id) && id > 0)) {
    throw new Error("Invalid dedicated test fixture state; cleanup refused");
  }
  return saved;
}
async function assertOwnership() {
  const customers = await rows("SELECT customer_id FROM customer WHERE customer_id = ? AND username = ?", [state.customerId, state.marker]);
  assert.equal(customers.length, 1, "Cleanup requires the exact labelled fixture customer");
  const sellers = await rows("SELECT student_id FROM student WHERE student_id IN (?) AND student_number IN (?)", [state.sellerIds, state.sellerIds.map((_, i) => `${state.marker}_${i}`)]);
  assert.equal(sellers.length, 2, "Cleanup requires both labelled fixture sellers");
  const artworks = await rows("SELECT artwork_id FROM artwork WHERE artwork_id IN (?) AND title LIKE ? AND student_id IN (?)", [state.artworkIds, `${state.marker} %`, state.sellerIds]);
  assert.equal(artworks.length, 3, "Cleanup requires all labelled fixture artworks");
}
async function createFixtures() {
  try {
    await fs.access(stateFile);
    state = await readState();
    await assertOwnership();
    pass("Existing dedicated fixture safely resumed without creating accounts or payment sessions");
    return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  // Inspect the real schema before creating any fixture records.
  for (const [table, required] of Object.entries({
    customer: ["customer_id", "username", "password"],
    student: ["student_id", "student_number", "password"],
    artwork: ["artwork_id", "student_id", "product", "status", "artwork_details"],
    artupload: ["artwork_id", "request_status"],
    marketplace_order: ["payment_status", "payment_reference", "paymongo_checkout_session_id"],
  })) {
    const columns = await rows(`SHOW COLUMNS FROM ${table}`);
    assert.ok(required.every(name => columns.some(column => column.Field === name)), `Missing required ${table} column`);
  }
  const marker = `pmtest_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const password = await bcrypt.hash(randomUUID(), 10);
  const fixture = { version: 1, marker, createdAt: new Date().toISOString(), sellerIds: [], artworkIds: [] };
  await database.beginTransaction();
  try {
    const buyer = await rows("INSERT INTO customer (username, first_name, last_name, email, phone_number, password) VALUES (?, ?, ?, ?, ?, ?)",
      [marker, "PayMongo", "Test Buyer", `${marker}@artmatch.invalid`, "09000000000", password]);
    fixture.customerId = buyer.insertId;
    for (let index = 0; index < 2; index++) {
      const seller = await rows("INSERT INTO student (first_name, last_name, email, student_number, password) VALUES (?, ?, ?, ?, ?)",
        ["PayMongo", `Test Seller ${index + 1}`, `${marker}_seller${index}@artmatch.invalid`, `${marker}_${index}`, password]);
      fixture.sellerIds.push(seller.insertId);
    }
    const address = await rows("INSERT INTO address (customer_id, region, province, city, barangay, postal_code, street_name, is_current) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
      [fixture.customerId, "Test Region", "Test Province", "Test City", "Test Barangay", "1000", `${marker} Test Street`]);
    fixture.addressId = address.insertId;
    for (let index = 0; index < 3; index++) {
      const artwork = await rows("INSERT INTO artwork (student_id, title, price, description, image, genre, art_size, art_type, product, status, is_sold, artwork_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', 0, ?)",
        [fixture.sellerIds[index === 1 ? 1 : 0], `${marker} artwork ${index + 1}`, [1000, 2000, 500][index],
          "Dedicated payment integration test fixture; no real product.", "", "Abstract", "10x10", "Painting", "Painting", JSON.stringify({})]);
      fixture.artworkIds.push(artwork.insertId);
      await rows("INSERT INTO artupload (artwork_id, request_status, approved_date) VALUES (?, 'Verified', NOW())", [artwork.insertId]);
    }
    const cart = await rows("INSERT INTO add_cart (customer_id, total_price) VALUES (?, 3000)", [fixture.customerId]);
    fixture.cartId = cart.insertId;
    for (const id of fixture.artworkIds.slice(0, 2)) await rows("INSERT INTO cart_item (add_to_id, artwork_id) VALUES (?, ?)", [fixture.cartId, id]);
    await database.commit();
  } catch (error) {
    await database.rollback();
    throw error;
  }
  const signingKey = process.env.JWT_SECRET || "your_secret_key";
  fixture.buyerToken = jwt.sign({ customer_id: fixture.customerId, id: fixture.customerId }, signingKey, { expiresIn: "2h" });
  fixture.sellerTokens = fixture.sellerIds.map(student_id => jwt.sign({ student_id }, signingKey, { expiresIn: "2h" }));
  state = fixture;
  await saveState();
  pass("Dedicated buyer, two sellers, three approved artworks, address and cart created");
}
async function getOrders() {
  return rows("SELECT order_id, seller_id, payment_method, payment_status, payment_reference, paymongo_checkout_session_id, paymongo_payment_id, paymongo_payment_method, paid_at, status, total_amount FROM marketplace_order WHERE customer_id = ? ORDER BY order_id", [state.customerId]);
}
async function stock() {
  return rows(`SELECT a.artwork_id, ${getArtworkSoldQuantitySql("a")} AS sold_quantity FROM artwork a WHERE a.artwork_id IN (?) ORDER BY a.artwork_id`, [state.artworkIds]);
}
async function purchases() {
  return rows("SELECT artwork_id FROM recommendation_interaction WHERE customer_id = ? AND event_type = 'purchase' ORDER BY artwork_id", [state.customerId]);
}
async function cart() {
  return rows("SELECT ci.artwork_id, ac.total_price FROM add_cart ac LEFT JOIN cart_item ci ON ci.add_to_id = ac.add_to_id WHERE ac.add_to_id = ? ORDER BY ci.artwork_id", [state.cartId]);
}
async function prepareOnlineCheckout() {
  const response = state.checkoutSessionId ? { status: 201, body: {
    payment_reference: state.paymentReference, checkout_session_id: state.checkoutSessionId, checkout_url: state.checkoutUrl,
  } } : await api("/api/buyer/orders/checkout", { method: "POST", body: {
    address_id: state.addressId, payment_method: "paymongo", total: 1, price: 1, shipping_fee: 0,
  } });
  assert.equal(response.status, 201, `Online checkout failed with HTTP ${response.status}`);
  state.paymentReference = response.body.payment_reference;
  state.checkoutSessionId = response.body.checkout_session_id;
  state.checkoutUrl = response.body.checkout_url;
  await saveState();
  const orders = await getOrders();
  assert.equal(orders.length, 2);
  assert.deepEqual(orders.map(order => Number(order.total_amount)).sort((a, b) => a - b), [1150, 2150]);
  assert.ok(orders.every(order => order.payment_method === "paymongo" && order.payment_status === "Pending" && order.status === "Pending"));
  assert.ok(orders.every(order => order.payment_reference === state.paymentReference && order.paymongo_checkout_session_id === state.checkoutSessionId));
  assert.ok((await stock()).every(item => Number(item.sold_quantity) === 0));
  assert.equal((await purchases()).length, 0);
  assert.ok([2, 3].includes((await cart()).filter(item => item.artwork_id).length));
  pass("Real Hosted Checkout creates one PHP 3300 test session across two Pending seller orders");
  pass("Pending online payment retains cart, stock availability and zero purchase interactions");
  const buyerOrders = await api("/api/buyer/orders");
  assert.equal(buyerOrders.status, 200);
  assert.equal(buyerOrders.body.length, 0, "Unpaid attempts must not appear as placed buyer orders");
  const checkoutStatus = await api(`/api/buyer/orders/payments/${encodeURIComponent(state.paymentReference)}`);
  assert.equal(checkoutStatus.status, 200);
  assert.equal(checkoutStatus.body.payment_status, "Pending");
  assert.equal(checkoutStatus.body.orders.length, 2);
  for (const token of state.sellerTokens) {
    const list = await api("/api/seller/orders", { token });
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 0, "Unpaid attempts must not appear as placed seller orders");
  }
  pass("Unpaid attempts are visible only in checkout status, never buyer or seller Orders");
  const provider = await retrievePayMongoCheckoutSession(state.checkoutSessionId);
  assert.equal(provider.attributes.reference_number, state.paymentReference);
  assert.equal(provider.attributes.status, "active");
  assert.equal(provider.attributes.livemode, false);
  assert.match(provider.attributes.success_url, /\/buyer\/checkout\?payment=success&reference=/);
  assert.match(provider.attributes.cancel_url, /\/buyer\/checkout\?payment=cancelled&reference=/);
  const methods = await api("/api/buyer/orders/payments/methods");
  assert.equal(methods.status, 200);
  assert.deepEqual([...provider.attributes.payment_method_types].sort(), [...methods.body.payment_method_types].sort());
  const lineItems = provider.attributes.line_items;
  assert.ok(Array.isArray(lineItems));
  assert.equal(lineItems.reduce((total, item) => total + item.amount * item.quantity, 0), 330000);
  pass("PayMongo TEST API confirms session reference, line-item amount and active status");
  for (const order of orders) {
    const index = state.sellerIds.indexOf(order.seller_id);
    const blocked = await api(`/api/seller/orders/${order.order_id}/status`, { method: "PUT", token: state.sellerTokens[index], body: { status: "Confirmed" } });
    assert.equal(blocked.status, 409, "Seller must not fulfill an unpaid online order");
  }
  pass("Actual seller backend rejects both unpaid seller fulfillment attempts");
  const duplicate = await api("/api/buyer/orders/checkout", { method: "POST", body: { address_id: state.addressId, payment_method: "paymongo" } });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.can_resume, true);
  assert.equal((await getOrders()).length, 2);
  const retry = await api(`/api/buyer/orders/payments/${encodeURIComponent(state.paymentReference)}/retry`, { method: "POST" });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.payment_reference, state.paymentReference);
  assert.equal(retry.body.checkout_url, state.checkoutUrl);
  assert.equal((await getOrders()).length, 2);
  pass("Duplicate checkout is blocked and retry reuses the exact existing provider session");
  const existingCart = await cart();
  if (!existingCart.some(item => item.artwork_id === state.artworkIds[2])) {
    await rows("INSERT INTO cart_item (add_to_id, artwork_id) VALUES (?, ?)", [state.cartId, state.artworkIds[2]]);
  }
  await rows("UPDATE add_cart SET total_price = 3500 WHERE add_to_id = ?", [state.cartId]);
  await saveState();
  pass("Unrelated PHP 500 artwork added after online session creation for selective-cart verification");
}
async function cancelAndCod() {
  const cancelled = await api(`/api/buyer/orders/payments/${encodeURIComponent(state.paymentReference)}/cancel`, { method: "PUT" });
  assert.equal(cancelled.status, 200);
  const orders = await getOrders();
  assert.ok(orders.every(order => order.status === "Cancelled" && order.payment_status === "Expired"));
  assert.equal((await retrievePayMongoCheckoutSession(state.checkoutSessionId)).attributes.status, "expired");
  assert.equal((await cart()).filter(item => item.artwork_id).length, 3);
  assert.ok((await stock()).every(item => Number(item.sold_quantity) === 0));
  assert.equal((await purchases()).length, 0);
  pass("Actual provider expiry and group cancellation preserve all cart items and available stock");
  assert.equal((await api("/api/buyer/orders")).body.length, 0, "Cancelled unpaid attempts must remain out of Orders");
  const retry = await api(`/api/buyer/orders/payments/${encodeURIComponent(state.paymentReference)}/retry`, { method: "POST" });
  assert.equal(retry.status, 409);
  const cod = await api("/api/buyer/orders/checkout", { method: "POST", body: { address_id: state.addressId, payment_method: "cod" } });
  assert.equal(cod.status, 201);
  const codOrders = (await getOrders()).filter(order => order.payment_method === "cod");
  assert.equal(codOrders.length, 2);
  assert.equal(codOrders.reduce((sum, order) => sum + Number(order.total_amount), 0), 3800);
  assert.ok(codOrders.every(order => order.payment_status === "Pending"));
  assert.ok(codOrders.every(order => !order.paymongo_checkout_session_id));
  assert.equal((await cart()).filter(item => item.artwork_id).length, 0);
  assert.equal((await purchases()).length, 3);
  assert.ok((await stock()).every(item => Number(item.sold_quantity) === 1));
  const order = codOrders[0];
  const confirm = await api(`/api/seller/orders/${order.order_id}/status`, { method: "PUT", token: state.sellerTokens[state.sellerIds.indexOf(order.seller_id)], body: { status: "Confirmed" } });
  assert.equal(confirm.status, 200);
  const buyerList = await api("/api/buyer/orders");
  assert.equal(buyerList.body.length, 2, "Only the two COD purchases are placed orders");
  assert.ok(buyerList.body.every(order => order.payment === "cod"));
  pass("Real COD checkout groups sellers, clears purchased cart, records purchases and permits seller confirmation");
  const token = state.sellerTokens[state.sellerIds.indexOf(order.seller_id)];
  const photo = await sharp({ create: { width: 4, height: 4, channels: 3, background: "blue" } }).png().toBuffer();
  const packedBody = new FormData();
  packedBody.set("status", "Packed");
  packedBody.set("handling_instructions", JSON.stringify(["fragile", "keep_dry"]));
  packedBody.append("parcel_photos", new Blob([photo], { type: "image/png" }), "fixture-parcel.png");
  const packed = await api(`/api/seller/orders/${order.order_id}/status`, { method: "PUT", token, body: packedBody });
  assert.equal(packed.status, 200, "Packing must accept parcel evidence and handling instructions");
  const shipped = await api(`/api/seller/orders/${order.order_id}/status`, { method: "PUT", token,
    body: { status: "Shipped", tracking_url: "https://example.test/track/fixture" } });
  assert.equal(shipped.status, 200);
  const delivered = await api(`/api/seller/orders/${order.order_id}/status`, { method: "PUT", token, body: { status: "Delivered" } });
  assert.equal(delivered.status, 200);
  assert.equal(delivered.body.paymentStatus, "Paid");
  const completed = (await api("/api/buyer/orders")).body.find(item => item.orderId === order.order_id);
  assert.equal(completed.status, "Delivered");
  assert.equal(completed.paymentStatus, "Paid");
  pass("Actual seller progression Confirmed → Packed with B2 parcel photo → Shipped → Delivered appears in buyer Orders");
}
async function verifyPaid({ readonly = false } = {}) {
  await assertOwnership();
  const orders = (await getOrders()).filter(order => order.payment_reference === state.paymentReference);
  assert.equal(orders.length, 2);
  assert.ok(orders.every(order => order.payment_status === "Paid" && order.status !== "Cancelled"), "Real webhook has not completed a successful payment for both seller orders");
  assert.equal(new Set(orders.map(order => order.paymongo_payment_id)).size, 1);
  assert.ok(orders.every(order => order.paymongo_payment_id && order.paymongo_payment_method && order.paid_at));
  const provider = await retrievePayMongoCheckoutSession(state.checkoutSessionId);
  const paidPayment = provider.attributes.payments.find(payment => payment.id === orders[0].paymongo_payment_id && payment.attributes.status === "paid");
  assert.ok(paidPayment);
  assert.equal(paidPayment.attributes.currency, "PHP");
  assert.equal(paidPayment.attributes.amount, 330000);
  assert.ok(orders.every(order => order.paymongo_payment_method === paidPayment.attributes.source.type));
  if (Number(paidPayment.attributes.paid_at) > 0) {
    assert.ok(orders.every(order => Math.floor(new Date(order.paid_at).getTime() / 1000) === Number(paidPayment.attributes.paid_at)));
  }
  const remaining = (await cart()).filter(item => item.artwork_id);
  assert.deepEqual(remaining.map(item => item.artwork_id), [state.artworkIds[2]]);
  assert.equal(Number(remaining[0].total_price), 500);
  assert.deepEqual((await stock()).map(item => Number(item.sold_quantity)), [1, 1, 0]);
  assert.deepEqual((await purchases()).map(item => item.artwork_id), state.artworkIds.slice(0, 2));
  pass("Actual provider payment and webhook persisted Paid, one payment ID, channel and timestamp on both seller orders");
  pass("Paid cart cleanup removed only the two purchased artworks and retained the unrelated PHP 500 item");
  if (readonly) return;
  const blocked = await api(`/api/buyer/orders/${orders[0].order_id}/cancel`, { method: "PUT" });
  assert.equal(blocked.status, 409);
  const list = await api("/api/buyer/orders");
  assert.equal(list.status, 200);
  const displayedOrders = list.body.filter(order => order.paymentReference === state.paymentReference);
  assert.equal(displayedOrders.length, 2);
  assert.ok(displayedOrders.every(order => order.paymentStatus === "Paid"));
  for (const order of orders) {
    // Browser verification may already have exercised the same transition.
    if (order.status === "Pending") {
      const confirm = await api(`/api/seller/orders/${order.order_id}/status`, { method: "PUT", token: state.sellerTokens[state.sellerIds.indexOf(order.seller_id)], body: { status: "Confirmed" } });
      assert.equal(confirm.status, 200);
    } else assert.equal(order.status, "Confirmed", "Unexpected fixture fulfillment transition");
  }
  pass("Actual buyer API displays Paid, rejects direct cancellation, and both sellers can confirm paid orders");
}
async function cleanup() {
  if (!state) return;
  await assertOwnership();
  const orders = await getOrders();
  const sessions = [...new Set(orders.map(order => order.paymongo_checkout_session_id).filter(Boolean))];
  for (const id of sessions) {
    let session = await retrievePayMongoCheckoutSession(id);
    const paid = (session.attributes.payments || []).some(payment => payment.attributes.status === "paid");
    if (!paid && session.attributes.status !== "expired") {
      try { session = await expirePayMongoCheckoutSession(id); }
      catch (error) {
        if (error.providerStatus !== 400) throw error;
        session = await retrievePayMongoCheckoutSession(id);
      }
      if (session.attributes.status !== "expired" && !(session.attributes.payments || []).some(payment => payment.attributes.status === "paid")) {
        throw new Error("An unpaid test session is still active; fixtures retained for safe cleanup");
      }
    }
  }
  const parcelRows = await rows("SELECT order_id, parcel_photos FROM marketplace_order WHERE customer_id = ?", [state.customerId]);
  for (const order of parcelRows) {
    const photos = typeof order.parcel_photos === "string" ? JSON.parse(order.parcel_photos) : order.parcel_photos || [];
    for (const photo of photos) {
      assert.ok(photo.key?.startsWith(`app-uploads/orders/${order.order_id}/parcel/`) || photo.key?.startsWith(`orders/${order.order_id}/parcel/`));
      await deleteParcelPhoto(photo, order.order_id);
    }
  }
  await database.beginTransaction();
  try {
    await rows("DELETE FROM account_notifications WHERE role = 'buyer' AND account_id = ?", [state.customerId]);
    await rows("DELETE FROM recommendation_interaction WHERE customer_id = ? OR artwork_id IN (?)", [state.customerId, state.artworkIds]);
    await rows("DELETE FROM buyer_artwork_image_view WHERE customer_id = ? OR artwork_id IN (?)", [state.customerId, state.artworkIds]);
    await rows("DELETE FROM buyer_watermark_code WHERE customer_id = ?", [state.customerId]);
    await rows("DELETE FROM customer_favorite WHERE customer_id = ? OR artwork_id IN (?)", [state.customerId, state.artworkIds]);
    await rows("DELETE FROM artwork_reviews WHERE customer_id = ? OR artwork_id IN (?)", [state.customerId, state.artworkIds]);
    if (orders.length) {
      await rows("DELETE FROM marketplace_order_item WHERE order_id IN (?)", [orders.map(order => order.order_id)]);
      await rows("DELETE FROM marketplace_order WHERE customer_id = ?", [state.customerId]);
    }
    await rows("DELETE FROM cart_item WHERE add_to_id = ?", [state.cartId]);
    await rows("DELETE FROM add_cart WHERE add_to_id = ? AND customer_id = ?", [state.cartId, state.customerId]);
    await rows("DELETE FROM artupload WHERE artwork_id IN (?)", [state.artworkIds]);
    await rows("DELETE FROM feature WHERE artwork_id IN (?)", [state.artworkIds]);
    await rows("DELETE FROM artwork WHERE artwork_id IN (?) AND student_id IN (?)", [state.artworkIds, state.sellerIds]);
    await rows("DELETE FROM address WHERE customer_id = ?", [state.customerId]);
    await rows("DELETE FROM account_access WHERE (role = 'buyer' AND account_id = ?) OR (role = 'seller' AND account_id IN (?))", [state.customerId, state.sellerIds]);
    await rows("DELETE FROM customer WHERE customer_id = ? AND username = ?", [state.customerId, state.marker]);
    await rows("DELETE FROM student WHERE student_id IN (?) AND student_number IN (?)", [state.sellerIds, state.sellerIds.map((_, i) => `${state.marker}_${i}`)]);
    await database.commit();
  } catch (error) {
    await database.rollback();
    throw error;
  }
  await fs.rm(stateFile, { force: true });
  pass("All dedicated fixture rows and cached test tokens cleaned up; unrelated project data retained");
}

try {
  const flags = process.argv.slice(2);
  assert.ok(flags.length <= 1 && flags.every(flag => ["--prepare", "--inspect-paid", "--verify-paid", "--cleanup"].includes(flag)),
    "Use no flags for the cancel/COD test, or one of --prepare, --inspect-paid, --verify-paid, --cleanup");
  assert.ok(/^sk_test_/.test(String(process.env.PAYMONGO_SECRET_KEY || "")), "This script requires PayMongo TEST credentials");
  database = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, port: process.env.DB_PORT,
  });
  if (["cleanup", "verify-paid", "inspect-paid"].includes(mode)) state = await readState();
  if (mode === "inspect-paid") {
    keepPreparedFixture = true;
    await verifyPaid({ readonly: true });
  } else if (mode === "verify-paid") await verifyPaid();
  else if (mode !== "cleanup") {
    await createFixtures();
    await prepareOnlineCheckout();
    if (mode === "prepare") {
      keepPreparedFixture = true;
      console.log("PREPARED browser fixture in backend/.cache/paymongo-flow-test.json (tokens are not printed)");
    } else await cancelAndCod();
  }
} catch (error) {
  console.error(`FAIL ${error.code || error.name}: ${error.message}`);
  process.exitCode = 1;
} finally {
  // Retain safe evidence after test accounts/tokens are removed. This contains
  // only fixture order/payment IDs, statuses, amounts, and assertion outcomes.
  if (database && state) {
    try {
      await fs.mkdir(cacheDirectory, { recursive: true });
      await fs.writeFile(`${cacheDirectory}paymongo-flow-${mode}-results.json`, JSON.stringify({
        phase: mode, marker: state.marker, testMode: true, checks: results,
        orders: await getOrders(), cart: await cart(), stock: await stock(),
        purchaseInteractions: await purchases(),
      }, null, 2));
    } catch (error) {
      console.error(`Unable to save test evidence: ${error.code || error.name}`);
    }
  }
  if (database && state && !keepPreparedFixture) {
    try { await cleanup(); }
    catch (error) {
      console.error(`CLEANUP REQUIRED ${error.code || error.name}: ${error.message}`);
      process.exitCode = 1;
    }
  }
  await database?.end();
  console.log(JSON.stringify({ phase: mode, passed: results.length, fixtureRetainedForBrowser: keepPreparedFixture }));
}
