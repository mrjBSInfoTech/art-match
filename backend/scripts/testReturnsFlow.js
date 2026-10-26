// Real HTTP/MySQL checks. Only clearly labelled fixtures created here are removed.
// No payment provider is contacted; credentials and JWTs are never printed.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { encryptChatMessage, decryptChatMessage } from "../../frontend/src/utils/chatEncryption.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
const evidencePath = new URL("../.cache/return-flow-results.json", import.meta.url);
const marker = `rtest_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const results = [];
const state = { marker, buyerIds: [], sellerIds: [], artworkIds: [], orderIds: [], cloudKeys: [] };
let db;
let database;
let server;
let baseUrl;
let committedFixtures = false;
let frozenTime;
let primary;
let deliveryBefore;

const rows = async (sql, params = []) => (await database.query(sql, params))[0];
function pass(name) {
  results.push({ result: "PASS", test: name });
  console.log(`PASS ${name}`);
}
function unavailable(name, reason) {
  results.push({ result: "NOT TESTABLE", test: name, reason });
  console.log(`NOT TESTABLE ${name}: ${reason}`);
}
async function api(path, { method = "GET", token = state.buyerTokens?.[0], body } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: { Authorization: `Bearer ${token || ""}`, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    signal: AbortSignal.timeout(25000),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}
const buyerPath = (id, action = "") => `/api/buyer/returns/${id}${action ? `/${action}` : ""}`;
const sellerPath = (id, action = "") => `/api/seller/returns/${id}${action ? `/${action}` : ""}`;
const payload = order => ({ order_id: order.id, order_item_ids: [order.items[0]], reason: "Shipping damage", details: "The frame arrived damaged during shipping." });
async function request(order, extra = {}) {
  return api("/api/buyer/returns", { method: "POST", body: { ...payload(order), ...extra } });
}
async function sellerAction(id, action, body = {}) {
  return api(sellerPath(id, action), { method: "PUT", token: state.sellerTokens[0], body });
}
async function buyerAction(id, action, body = {}) {
  return api(buyerPath(id, action), { method: "PUT", body });
}
function expectRejected(response, statuses = [400, 403, 404, 409]) {
  assert.ok(statuses.includes(response.status), `Expected rejection, received HTTP ${response.status}: ${response.body?.message || ""}`);
}
async function createOrder({ status = "Delivered", ageSeconds = 86400, sellerIndex = 0, payment = "cod", quantity = 2 } = {}) {
  const order = await rows(`INSERT INTO marketplace_order
    (order_number, customer_id, seller_id, buyer_name, buyer_email, payment_method, payment_status,
     payment_reference, paymongo_checkout_session_id, paymongo_payment_id, paid_at,
     shipping_street, shipping_barangay, shipping_city, shipping_province, shipping_region,
     shipping_postal_code, subtotal, shipping_fee, total_amount, status, delivered_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Paid', ?, ?, ?, CURRENT_TIMESTAMP,
      'Test street', 'Test barangay', 'Test city', 'Test province', 'Test region', '1000',
      300, 0, 300, ?, ${ageSeconds === null ? "NULL" : "TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP)"})`,
  [`${marker}_${state.orderIds.length}`, state.buyerIds[0], state.sellerIds[sellerIndex], marker,
    `${marker}@artmatch.invalid`, payment, `${marker}_reference`, payment === "paymongo" ? `${marker}_checkout` : null,
    payment === "paymongo" ? `${marker}_payment` : null, status, ...(ageSeconds === null ? [] : [-ageSeconds])]);
  state.orderIds.push(order.insertId);
  const items = [];
  for (let index = 0; index < 2; index++) {
    const item = await rows(`INSERT INTO marketplace_order_item
      (order_id, artwork_id, title, artist_name, image, unit_price, quantity)
      VALUES (?, ?, ?, ?, '', 100, ?)`,
    [order.insertId, state.artworkIds[sellerIndex * 2 + index], `${marker} item ${index}`, marker, index ? 1 : quantity]);
    items.push(item.insertId);
  }
  return { id: order.insertId, items };
}
async function createFixtures() {
  await database.beginTransaction();
  try {
    for (let index = 0; index < 2; index++) {
      const buyer = await rows("INSERT INTO customer (username, first_name, last_name, email, phone_number, password) VALUES (?, 'Return', 'Test Buyer', ?, '09000000000', ?)",
        [`${marker}_${index}`, `${marker}_buyer${index}@artmatch.invalid`, "integration-fixture-disabled-password"]);
      state.buyerIds.push(buyer.insertId);
      const seller = await rows("INSERT INTO student (first_name, last_name, email, student_number, password) VALUES ('Return', 'Test Seller', ?, ?, ?)",
        [`${marker}_seller${index}@artmatch.invalid`, `${marker}_${index}`, "integration-fixture-disabled-password"]);
      state.sellerIds.push(seller.insertId);
      for (let art = 0; art < 2; art++) {
        const result = await rows(`INSERT INTO artwork
          (student_id, title, price, description, image, genre, art_size, art_type, product, status, is_sold, artwork_details)
          VALUES (?, ?, 100, 'Dedicated return policy integration fixture', '', 'Abstract', '10x10', 'Painting', 'Painting', 'Available', 0, ?)`,
        [seller.insertId, `${marker} artwork ${index}_${art}`, JSON.stringify({ stock_available: 100 })]);
        state.artworkIds.push(result.insertId);
      }
    }
    await database.commit();
    committedFixtures = true;
  } catch (error) {
    await database.rollback();
    throw error;
  }
  const key = process.env.JWT_SECRET || "your_secret_key";
  // Match the actual login token shapes, including the legacy buyer id field.
  state.buyerTokens = state.buyerIds.map((id, index) => jwt.sign({ id, username: `${marker}_${index}` }, key, { expiresIn: "1h" }));
  state.sellerTokens = state.sellerIds.map((student_id, index) => jwt.sign({ id: student_id, student_id, student_number: `${marker}_${index}` }, key, { expiresIn: "1h" }));
  pass("Dedicated labelled buyer, seller and artwork fixtures created");
}
async function notification(role, accountId, type, orderId) {
  const found = await rows("SELECT notification_id FROM account_notifications WHERE role = ? AND account_id = ? AND notification_type = ? AND order_id = ?",
    [role, accountId, type, orderId]);
  assert.equal(found.length, 1, `Expected exactly one ${type} notification`);
}
async function snapshot() {
  return {
    orders: await rows(`SELECT order_id, status, delivered_at, payment_method, payment_status, payment_reference,
      paymongo_checkout_session_id, paymongo_payment_id, paid_at FROM marketplace_order WHERE order_id IN (?) ORDER BY order_id`, [state.orderIds]),
    artwork: await rows("SELECT artwork_id, status, is_sold, artwork_details FROM artwork WHERE artwork_id IN (?) ORDER BY artwork_id", [state.artworkIds]),
  };
}
async function returnCases() {
  primary = await createOrder({ payment: "paymongo" });
  const boundary = await createOrder({ ageSeconds: 7 * 86400 });
  const expired = await createOrder({ ageSeconds: 7 * 86400 + 1 });
  const missing = await createOrder({ ageSeconds: null });
  const otherSellerOrder = await createOrder({ sellerIndex: 1 });
  const before = await snapshot();
  expectRejected(await request(primary, { order_item_ids: [] }), [400]);
  expectRejected(await request(primary, { order_item_ids: [otherSellerOrder.items[0]] }), [400, 404, 409]);
  expectRejected(await request(primary, { reason: "Unchecked arbitrary reason" }), [400]);
  expectRejected(await request(primary, { details: "short" }), [400]);
  expectRejected(await request(primary, { details: "x".repeat(1001) }), [400]);
  pass("Selected items, controlled reasons and 10–1000 character details validated");
  const wrongBuyer = await api("/api/buyer/returns", { method: "POST", token: state.buyerTokens[1], body: payload(primary) });
  expectRejected(wrongBuyer, [403, 404]);
  expectRejected(await api("/api/buyer/returns", { method: "POST", token: state.sellerTokens[0], body: payload(primary) }), [403]);
  expectRejected(await api("/api/seller/returns", { method: "POST", token: state.sellerTokens[0], body: payload(primary) }), [404]);
  pass("Wrong buyer and actual seller JWT cannot create a buyer return");
  const key = process.env.JWT_SECRET || "your_secret_key";
  // Exercise matching numeric IDs explicitly: role markers must take precedence
  // over the buyer middleware's legacy JWT id fallback.
  const crossRoleTokens = [
    state.sellerTokens[0],
    jwt.sign({ id: state.buyerIds[0], student_id: state.buyerIds[0], student_number: `${marker}_collision` }, key, { expiresIn: "1h" }),
    jwt.sign({ id: state.buyerIds[0], admin_id: state.buyerIds[0], username: marker, role: "Admin" }, key, { expiresIn: "1h" }),
  ];
  for (const token of crossRoleTokens) {
    for (const path of ["/api/buyer/orders", "/api/buyer/returns", "/api/chat/buyer/notifications", "/api/chat/buyer/conversations"]) {
      expectRejected(await api(path, { token }), [403]);
    }
    const eventResponse = await fetch(`${baseUrl}/api/chat/buyer/events`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000),
    });
    await eventResponse.body?.cancel();
    assert.equal(eventResponse.status, 403, "Cross-role JWT must not subscribe to buyer return live events");
  }
  pass("Seller/admin JWTs, including colliding numeric account IDs, cannot read buyer orders, returns, notifications, conversations or SSE");
  const expiredResult = await request(expired);
  expectRejected(expiredResult, [400, 409]);
  assert.match(expiredResult.body.message, /7-day return period.*expired/i);
  expectRejected(await request(missing), [400, 409]);
  const boundaryResult = await request(boundary);
  assert.equal(boundaryResult.status, 201, `Exact database deadline rejected: ${boundaryResult.body?.message}`);
  pass("Database policy accepts the exact seven-day boundary, rejects one second later and missing delivered_at");
  for (const status of ["Pending", "Confirmed", "Packed", "Shipped"]) {
    const order = await createOrder({ status });
    expectRejected(await request(order), [400, 409]);
    const count = await rows("SELECT COUNT(*) AS total FROM marketplace_return_request WHERE order_id = ?", [order.id]);
    assert.equal(Number(count[0].total), 0);
  }
  pass("Pending, Confirmed, Packed and Shipped orders cannot be returned");
  const race = await Promise.all([request(primary), request(primary)]);
  assert.deepEqual(race.map(result => result.status).sort(), [201, 409]);
  const created = race.find(result => result.status === 201).body;
  assert.equal(created.order_id, primary.id);
  assert.equal(created.customer_id, state.buyerIds[0]);
  assert.equal(created.seller_id, state.sellerIds[0]);
  assert.equal(created.status, "Requested");
  assert.equal(created.items.length, 1);
  assert.equal(created.items[0].order_item_id, primary.items[0]);
  assert.equal(Number(created.items[0].quantity), 2);
  assert.ok(created.conversation_id);
  const participants = await rows("SELECT student_id, customer_id FROM conversation WHERE conversation_id = ?", [created.conversation_id]);
  assert.deepEqual(participants[0], { student_id: state.sellerIds[0], customer_id: state.buyerIds[0] });
  await notification("seller", state.sellerIds[0], "return_requested", primary.id);
  pass("Concurrent duplicate submits produce exactly one selected-item request, linked conversation and seller notification");
  state.conversationId = created.conversation_id;
  state.requestId = created.return_request_id;
  const id = created.return_request_id;
  expectRejected(await api(buyerPath(id), { token: state.buyerTokens[1] }), [403, 404]);
  expectRejected(await api(sellerPath(id), { token: state.sellerTokens[1] }), [403, 404]);
  expectRejected(await api(sellerPath(id, "approve"), { method: "PUT", token: state.sellerTokens[1], body: {} }), [403, 404]);
  expectRejected(await api(sellerPath(id, "reject"), { method: "PUT", token: state.sellerTokens[1], body: { seller_response: "No" } }), [403, 404]);
  expectRejected(await api(`/api/buyer/returns?conversation_id=${state.conversationId}`, { token: state.buyerTokens[1] }), [403, 404]);
  expectRejected(await api(sellerPath(id, "approve"), { method: "PUT", token: state.buyerTokens[0], body: {} }), [403]);
  expectRejected(await api(buyerPath(id, "approve"), { method: "PUT", body: {} }), [404]);
  expectRejected(await api(buyerPath(id, "shipped"), { method: "PUT", token: state.sellerTokens[0], body: {} }), [403]);
  expectRejected(await api(sellerPath(id, "receive"), { method: "PUT", token: state.buyerTokens[0], body: {} }), [403]);
  pass("Read, conversation filtering and mutation APIs enforce buyer/seller ownership and role boundaries");
  expectRejected(await buyerAction(id, "shipped"), [400, 409]);
  expectRejected(await sellerAction(id, "receive"), [400, 409]);
  assert.equal((await sellerAction(id, "approve", { seller_response: "Please return the damaged frame." })).status, 200);
  const approved = (await api(buyerPath(id))).body;
  assert.equal(approved.status, "Approved");
  assert.ok(approved.decision_at);
  await notification("buyer", state.buyerIds[0], "return_approved", primary.id);
  expectRejected(await buyerAction(id, "cancel"), [400, 409]);
  expectRejected(await sellerAction(id, "reject", { seller_response: "Changed my mind" }), [400, 409]);
  expectRejected(await buyerAction(id, "shipped", { return_tracking_url: "javascript:alert(1)" }), [400]);
  expectRejected(await buyerAction(id, "shipped", { return_tracking_url: "data:text/html,test" }), [400]);
  expectRejected(await api(sellerPath(id, "shipped"), { method: "PUT", token: state.sellerTokens[0], body: {} }), [404]);
  assert.equal((await buyerAction(id, "shipped", { return_tracking_url: "https://courier.example.invalid/track/return-fixture" })).status, 200);
  const shipped = (await api(buyerPath(id))).body;
  assert.equal(shipped.status, "Return Shipped");
  assert.ok(shipped.return_shipped_at);
  assert.match(shipped.return_tracking_url, /^https:/);
  await notification("seller", state.sellerIds[0], "return_shipped", primary.id);
  expectRejected(await buyerAction(id, "cancel"), [400, 409]);
  expectRejected(await api(buyerPath(id, "receive"), { method: "PUT", body: {} }), [404]);
  assert.equal((await sellerAction(id, "receive")).status, 200);
  const completed = (await api(buyerPath(id))).body;
  assert.equal(completed.status, "Completed");
  for (const field of ["requested_at", "decision_at", "return_shipped_at", "received_at", "completed_at"]) assert.ok(completed[field], `Missing ${field}`);
  assert.equal(completed.seller_response, "Please return the damaged frame.");
  await notification("buyer", state.buyerIds[0], "return_completed", primary.id);
  expectRejected(await request(primary), [409]);
  expectRejected(await sellerAction(id, "approve"), [400, 409]);
  pass("Approval, safe buyer shipment and atomic seller receipt/completion preserve audit timestamps and notifications");
  const rejectedOrder = await createOrder();
  const rejectedId = (await request(rejectedOrder)).body.return_request_id;
  expectRejected(await sellerAction(rejectedId, "reject", { seller_response: "   " }), [400]);
  expectRejected(await sellerAction(rejectedId, "reject", { seller_response: "x".repeat(1001) }), [400]);
  assert.equal((await sellerAction(rejectedId, "reject", { seller_response: "Please provide clearer packaging evidence." })).status, 200);
  const rejected = (await api(buyerPath(rejectedId))).body;
  assert.equal(rejected.status, "Rejected");
  assert.ok(rejected.decision_at);
  assert.match(rejected.seller_response, /packaging evidence/);
  expectRejected(await sellerAction(rejectedId, "approve"), [400, 409]);
  await notification("buyer", state.buyerIds[0], "return_rejected", rejectedOrder.id);
  assert.equal((await request(rejectedOrder)).status, 201);
  pass("Rejection requires a response, is terminal, and permits a fresh eligible request within the original window");
  const cancelledOrder = await createOrder();
  const cancelId = (await request(cancelledOrder)).body.return_request_id;
  assert.equal((await buyerAction(cancelId, "cancel")).status, 200);
  assert.equal((await api(buyerPath(cancelId))).body.status, "Cancelled");
  expectRejected(await sellerAction(cancelId, "approve"), [400, 409]);
  expectRejected(await sellerAction(cancelId, "reject", { seller_response: "No" }), [400, 409]);
  await notification("seller", state.sellerIds[0], "return_cancelled", cancelledOrder.id);
  assert.equal((await request(cancelledOrder)).status, 201);
  pass("Only Requested returns can be cancelled, with seller notification and an eligible retry");
  const after = await snapshot();
  assert.deepEqual(after.orders.filter(order => before.orders.some(old => old.order_id === order.order_id)), before.orders);
  assert.deepEqual(after.artwork, before.artwork);
  deliveryBefore = completed;
  pass("Return actions preserve original delivery/fulfillment/payment identifiers, payment status and artwork availability fields");
}
async function rollbackCase() {
  const order = await createOrder({ sellerIndex: 1 });
  const conversationBefore = await rows("SELECT conversation_id FROM conversation WHERE student_id = ? AND customer_id = ?", [state.sellerIds[1], state.buyerIds[0]]);
  async function failNotification(work) {
    const nativePromise = db.promise;
    let injected = false;
    db.promise = function () {
      const pool = nativePromise.call(this);
      const nativeAcquire = pool.getConnection.bind(pool);
      pool.getConnection = async () => {
        const connection = await nativeAcquire();
        const nativeQuery = connection.query.bind(connection);
        connection.query = async (sql, params) => {
          if (!injected && /INSERT INTO account_notifications/i.test(sql)) {
            injected = true;
            throw new Error("Dedicated fixture notification failure");
          }
          return nativeQuery(sql, params);
        };
        return connection;
      };
      return pool;
    };
    let response;
    try { response = await work(); }
    finally { db.promise = nativePromise; }
    assert.equal(injected, true, "Notification failure was not injected");
    assert.equal(response.status, 500);
  }
  await failNotification(() => request(order));
  const requests = await rows("SELECT COUNT(*) AS total FROM marketplace_return_request WHERE order_id = ?", [order.id]);
  const notices = await rows("SELECT COUNT(*) AS total FROM account_notifications WHERE order_id = ?", [order.id]);
  const items = await rows("SELECT COUNT(*) AS total FROM marketplace_return_item WHERE order_item_id IN (?)", [order.items]);
  assert.equal(Number(requests[0].total), 0);
  assert.equal(Number(notices[0].total), 0);
  assert.equal(Number(items[0].total), 0);
  const conversationAfter = await rows("SELECT conversation_id FROM conversation WHERE student_id = ? AND customer_id = ?", [state.sellerIds[1], state.buyerIds[0]]);
  assert.deepEqual(conversationAfter, conversationBefore);
  const retry = await request(order);
  assert.equal(retry.status, 201, "Rollback must release its locks and permit retry");
  pass("A notification failure rolls request/items/new conversation back atomically, releases locks, and permits a clean retry");
  const id = retry.body.return_request_id;
  const seller = action => api(sellerPath(id, action), { method: "PUT", token: state.sellerTokens[1], body: {} });
  assert.equal((await seller("approve")).status, 200);
  assert.equal((await buyerAction(id, "shipped")).status, 200);
  await failNotification(() => seller("receive"));
  const rolledBack = (await api(buyerPath(id))).body;
  assert.equal(rolledBack.status, "Return Shipped");
  assert.equal(rolledBack.received_at, null);
  assert.equal(rolledBack.completed_at, null);
  assert.equal((await seller("receive")).status, 200);
  await notification("buyer", state.buyerIds[0], "return_completed", order.id);
  pass("Receipt notification failure rolls both Received/Completed timestamps back; a retry completes exactly once");
}
async function chatCases() {
  const keyPair = async () => {
    const keys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
    return { privateKey: keys.privateKey, publicKeyJwk: JSON.stringify(await crypto.subtle.exportKey("jwk", keys.publicKey)) };
  };
  const buyer = await keyPair();
  const seller = await keyPair();
  const send = async (role, text) => {
    const sender = role === "buyer" ? buyer : seller;
    const recipient = role === "buyer" ? seller : buyer;
    const encrypted = await encryptChatMessage({ privateKey: sender.privateKey, recipientPublicKeyJwk: recipient.publicKeyJwk, text });
    return api(`/api/chat/${role}/conversations/${role === "buyer" ? state.sellerIds[0] : state.buyerIds[0]}/messages`, {
      method: "POST", token: role === "buyer" ? state.buyerTokens[0] : state.sellerTokens[0],
      body: { message: encrypted.encryptedText, sender_public_key: sender.publicKeyJwk, encryption_iv: encrypted.encryptionIv },
    });
  };
  const sent = await send("buyer", `${marker} encrypted buyer message`);
  assert.equal(sent.status, 201);
  const sellerList = await api("/api/chat/seller/conversations", { token: state.sellerTokens[0] });
  assert.equal(sellerList.status, 200);
  assert.ok(sellerList.body.some(item => item.conversation_id === state.conversationId && Number(item.unread_count) > 0));
  const received = await api(`/api/chat/seller/conversations/${state.conversationId}/messages`, { token: state.sellerTokens[0] });
  assert.equal(received.status, 200);
  const receivedMessage = received.body.find(message => message.message_id === sent.body.message_id);
  assert.notEqual(receivedMessage.message_data, `${marker} encrypted buyer message`);
  assert.equal((await decryptChatMessage({ privateKey: seller.privateKey, message: receivedMessage })).text, `${marker} encrypted buyer message`);
  const read = await api("/api/chat/seller/conversations", { token: state.sellerTokens[0] });
  assert.equal(Number(read.body.find(item => item.conversation_id === state.conversationId).unread_count), 0);
  const reply = await send("seller", `${marker} encrypted seller reply`);
  assert.equal(reply.status, 201);
  assert.equal((await decryptChatMessage({ privateKey: buyer.privateKey, message: reply.body })).text, `${marker} encrypted seller reply`);
  pass("Existing buyer/seller encrypted HTTP messages decrypt correctly; conversation list and unread/read counts work");
  assert.equal((await api(`/api/chat/buyer/conversations/${state.conversationId}/block`, { method: "POST", body: {} })).status, 204);
  expectRejected(await send("buyer", "Blocked message"), [403]);
  const order = await createOrder();
  const blockedReturn = await request(order);
  assert.equal(blockedReturn.status, 201);
  assert.equal(blockedReturn.body.conversation_id, state.conversationId);
  assert.equal((await sellerAction(blockedReturn.body.return_request_id, "approve")).status, 200);
  const visible = await api(`/api/buyer/returns?conversation_id=${state.conversationId}`);
  assert.equal(visible.status, 200);
  assert.ok(visible.body.some(item => item.return_request_id === blockedReturn.body.return_request_id));
  assert.equal((await api(`/api/chat/buyer/conversations/${state.conversationId}/block`, { method: "DELETE" })).status, 204);
  assert.equal((await send("buyer", "Message after unblocking")).status, 201);
  pass("Chat block/unblock retains normal messaging policy while request, approval and structured return visibility remain available");
  const hidden = await api(`/api/chat/buyer/conversations/${state.conversationId}`, { method: "DELETE" });
  assert.equal(hidden.status, 204);
  const another = await createOrder();
  const reopen = await request(another);
  assert.equal(reopen.status, 201);
  for (const role of ["buyer", "seller"]) {
    const list = await api(`/api/chat/${role}/conversations`, { token: role === "buyer" ? state.buyerTokens[0] : state.sellerTokens[0] });
    assert.equal(list.status, 200);
    assert.ok(list.body.some(item => item.conversation_id === state.conversationId));
  }
  assert.equal((await api(buyerPath(state.requestId))).body.status, "Completed");
  pass("Deleting/hiding a chat does not delete returns; new requests reopen the participants' conversation");
  if (process.argv.includes("--attachments")) {
    const { isB2Configured, getFromB2 } = await import("../utils/b2Storage.js");
    if (!isB2Configured()) unavailable("Cloud attachment round trip", "Backblaze credentials are not configured");
    else {
      const original = new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN3sAAAAASUVORK5CYII=", "base64")], `${marker}.png`, { type: "image/png" });
      const encrypted = await encryptChatMessage({ privateKey: buyer.privateKey, recipientPublicKeyJwk: seller.publicKeyJwk, text: "Return evidence photo", file: original });
      const form = new FormData();
      form.append("message", encrypted.encryptedText);
      form.append("sender_public_key", buyer.publicKeyJwk);
      form.append("encryption_iv", encrypted.encryptionIv);
      form.append("attachment_iv", encrypted.attachmentIv);
      form.append("media_type", encrypted.mediaType);
      form.append("image", encrypted.encryptedFile, `${marker}.bin`);
      const sentAttachment = await api(`/api/chat/buyer/conversations/${state.sellerIds[0]}/messages`, { method: "POST", body: form });
      assert.equal(sentAttachment.status, 201, `Encrypted chat attachment upload failed: ${sentAttachment.body?.message}`);
      const filename = new URL(sentAttachment.body.image).pathname.split("/").at(-1);
      assert.ok(filename.endsWith(`-${marker}.bin`));
      const cloudKey = `app-uploads/chat/${filename}`;
      state.cloudKeys.push(cloudKey);
      const object = await getFromB2(cloudKey);
      const ciphertext = Buffer.from(await object.Body.transformToByteArray());
      assert.notDeepEqual(ciphertext, Buffer.from(await original.arrayBuffer()));
      const decoded = await decryptChatMessage({ privateKey: seller.privateKey, message: sentAttachment.body,
        attachmentUrl: `data:application/octet-stream;base64,${ciphertext.toString("base64")}` });
      try {
        assert.equal(decoded.text, "Return evidence photo");
        const actual = Buffer.from(await (await fetch(decoded.image)).arrayBuffer());
        assert.deepEqual(actual, Buffer.from(await original.arrayBuffer()));
      } finally { if (decoded.image) URL.revokeObjectURL(decoded.image); }
      pass("Existing chat uploads encrypted evidence to Backblaze, retrieves ciphertext and decrypts the original photo bytes");
    }
  } else unavailable("Cloud attachment round trip", "Run with --attachments to allow the existing Backblaze attachment upload and immediate fixture cleanup");
}
async function orderCases() {
  const buyer = await api("/api/buyer/orders");
  assert.equal(buyer.status, 200);
  const current = buyer.body.find(order => order.orderId === primary.id);
  assert.ok(current);
  assert.ok(current.deliveredAt);
  assert.ok(current.returnDeadline);
  assert.equal(current.returnEligible, true, "The second order item remains independently eligible");
  assert.ok(current.returns.some(item => item.return_request_id === state.requestId));
  const seller = await api("/api/seller/orders", { token: state.sellerTokens[0] });
  assert.equal(seller.status, 200);
  assert.ok(seller.body.find(order => order.orderId === primary.id).returns.length);
  pass("Existing buyer/seller order histories include server policy metadata and linked item returns");
  const order = await createOrder({ status: "Shipped", ageSeconds: null });
  const delivered = await api(`/api/seller/orders/${order.id}/status`, { method: "PUT", token: state.sellerTokens[0], body: { status: "Delivered" } });
  assert.equal(delivered.status, 200);
  const values = await rows("SELECT status, delivered_at, payment_status FROM marketplace_order WHERE order_id = ?", [order.id]);
  assert.equal(values[0].status, "Delivered");
  assert.ok(values[0].delivered_at);
  assert.equal(values[0].payment_status, "Paid");
  assert.equal((await request(order)).status, 201);
  const later = await rows("SELECT delivered_at FROM marketplace_order WHERE order_id = ?", [order.id]);
  assert.equal(later[0].delivered_at.getTime(), values[0].delivered_at.getTime());
  assert.equal((await api(buyerPath(state.requestId))).body.completed_at, deliveryBefore.completed_at);
  pass("Actual seller Delivered transition sets delivered_at once; COD status and later return activity preserve it");
}
async function eventCase() {
  const order = await createOrder();
  const streams = [];
  try {
    for (const role of ["buyer", "seller"]) {
      const response = await fetch(`${baseUrl}/api/chat/${role}/events`, {
        headers: { Authorization: `Bearer ${role === "buyer" ? state.buyerTokens[0] : state.sellerTokens[0]}` },
        signal: AbortSignal.timeout(10000),
      });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/event-stream/);
      streams.push(response.body.getReader());
    }
    const before = await rows("SELECT COUNT(*) AS total FROM message WHERE conversation_id = ?", [state.conversationId]);
    const created = await request(order);
    assert.equal(created.status, 201);
    for (const reader of streams) {
      let buffer = "";
      let found;
      while (!found) {
        const chunk = await reader.read();
        assert.equal(chunk.done, false, "SSE closed before a return update");
        buffer += new TextDecoder().decode(chunk.value);
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (!block.startsWith("event: return_updated\n")) continue;
          const data = JSON.parse(block.split("\ndata: ")[1]);
          if (data.return_request_id === created.body.return_request_id) found = data;
        }
      }
      assert.equal(found.conversation_id, state.conversationId);
      assert.equal(found.order_id, order.id);
      assert.equal(found.status, "Requested");
    }
    const after = await rows("SELECT COUNT(*) AS total FROM message WHERE conversation_id = ?", [state.conversationId]);
    assert.equal(Number(after[0].total), Number(before[0].total));
    pass("Actual buyer/seller SSE streams receive committed structured return updates without inserting fake chat messages");
  } finally { await Promise.allSettled(streams.map(reader => reader.cancel())); }
}
async function assertOwnedFixtures() {
  assert.match(marker, /^rtest_[a-f0-9]{16}$/);
  const buyers = await rows("SELECT customer_id FROM customer WHERE customer_id IN (?) AND username IN (?)", [state.buyerIds, state.buyerIds.map((_, index) => `${marker}_${index}`)]);
  const sellers = await rows("SELECT student_id FROM student WHERE student_id IN (?) AND student_number IN (?)", [state.sellerIds, state.sellerIds.map((_, index) => `${marker}_${index}`)]);
  const artwork = await rows("SELECT artwork_id FROM artwork WHERE artwork_id IN (?) AND title LIKE ? AND student_id IN (?)", [state.artworkIds, `${marker} artwork %`, state.sellerIds]);
  assert.equal(buyers.length, state.buyerIds.length, "Fixture ownership changed; cleanup refused");
  assert.equal(sellers.length, state.sellerIds.length, "Fixture ownership changed; cleanup refused");
  assert.equal(artwork.length, state.artworkIds.length, "Fixture ownership changed; cleanup refused");
  if (state.orderIds.length) {
    const orders = await rows("SELECT order_id FROM marketplace_order WHERE order_id IN (?) AND customer_id = ? AND seller_id IN (?) AND order_number LIKE ?", [state.orderIds, state.buyerIds[0], state.sellerIds, `${marker}_%`]);
    assert.equal(orders.length, state.orderIds.length, "Fixture order ownership changed; cleanup refused");
  }
}
async function cleanup() {
  if (!committedFixtures) return;
  await assertOwnedFixtures();
  if (state.cloudKeys.length) {
    const { deleteFromB2 } = await import("../utils/b2Storage.js");
    for (const key of state.cloudKeys) {
      assert.ok(key.startsWith("app-uploads/chat/") && key.endsWith(`-${marker}.bin`) && !key.includes(".."));
      await deleteFromB2(key);
    }
    pass("Only this script's labelled encrypted Backblaze evidence object was removed");
  }
  const conversations = await rows("SELECT conversation_id FROM conversation WHERE customer_id IN (?) AND student_id IN (?)", [state.buyerIds, state.sellerIds]);
  const conversationIds = conversations.map(item => item.conversation_id);
  await database.beginTransaction();
  try {
    await rows("DELETE FROM account_notifications WHERE (role = 'buyer' AND account_id IN (?)) OR (role = 'seller' AND account_id IN (?))", [state.buyerIds, state.sellerIds]);
    await rows("DELETE ri FROM marketplace_return_item ri JOIN marketplace_return_request rr USING (return_request_id) WHERE rr.customer_id IN (?) AND rr.seller_id IN (?)", [state.buyerIds, state.sellerIds]);
    await rows("DELETE FROM marketplace_return_request WHERE customer_id IN (?) AND seller_id IN (?)", [state.buyerIds, state.sellerIds]);
    if (conversationIds.length) {
      await rows("DELETE FROM message WHERE conversation_id IN (?)", [conversationIds]);
      await rows("DELETE FROM conversation_read_state WHERE conversation_id IN (?)", [conversationIds]);
      await rows("DELETE FROM conversation WHERE conversation_id IN (?) AND customer_id IN (?) AND student_id IN (?)", [conversationIds, state.buyerIds, state.sellerIds]);
    }
    await rows("DELETE FROM chat_blocks WHERE (blocker_type = 'buyer' AND blocker_id IN (?)) OR (blocked_type = 'buyer' AND blocked_id IN (?)) OR (blocker_type = 'seller' AND blocker_id IN (?)) OR (blocked_type = 'seller' AND blocked_id IN (?))", [state.buyerIds, state.buyerIds, state.sellerIds, state.sellerIds]);
    if (state.orderIds.length) {
      await rows("DELETE FROM marketplace_order_item WHERE order_id IN (?)", [state.orderIds]);
      await rows("DELETE FROM marketplace_order WHERE order_id IN (?) AND customer_id = ?", [state.orderIds, state.buyerIds[0]]);
    }
    await rows("DELETE FROM artwork WHERE artwork_id IN (?) AND student_id IN (?)", [state.artworkIds, state.sellerIds]);
    await rows("DELETE FROM account_access WHERE (role = 'buyer' AND account_id IN (?)) OR (role = 'seller' AND account_id IN (?))", [state.buyerIds, state.sellerIds]);
    await rows("DELETE FROM customer WHERE customer_id IN (?) AND username IN (?)", [state.buyerIds, state.buyerIds.map((_, index) => `${marker}_${index}`)]);
    await rows("DELETE FROM student WHERE student_id IN (?) AND student_number IN (?)", [state.sellerIds, state.sellerIds.map((_, index) => `${marker}_${index}`)]);
    await database.commit();
    pass("Ownership-validated cleanup removed only this script's labelled fixtures");
  } catch (error) {
    await database.rollback();
    throw error;
  }
}

try {
  ({ default: db } = await import("../database/db.js"));
  // Freeze only this script's sessions, never the database/global clock. This
  // makes the actual HTTP policy check at the exact deadline deterministic.
  frozenTime = Math.floor(Date.now() / 1000);
  db.on("connection", connection => connection.query("SET timestamp = ?", [frozenTime]));
  const connection = await db.promise().getConnection();
  database = connection;
  const [{ ensureOrderTables }, { ensureReturnTables }, { ensureAccountAccessTable }, { ensureConversationReadStateTable }] = await Promise.all([
    import("../database/orders.js"), import("../database/returns.js"), import("../database/accountAccess.js"), import("../database/message.js"),
  ]);
  await ensureOrderTables();
  await ensureAccountAccessTable();
  await ensureConversationReadStateTable();
  await ensureReturnTables();
  await ensureReturnTables();
  pass("Order/return migrations initialize successfully and return initialization is repeatable");
  const [{ default: buyerReturns }, { default: sellerReturns }, { default: chat }, { default: buyerOrders }, { default: sellerOrders }] = await Promise.all([
    import("../routes/buyer/returns.js"), import("../routes/seller/returns.js"), import("../routes/chat.js"), import("../routes/buyer/orders.js"), import("../routes/seller/orders.js"),
  ]);
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/buyer/returns", buyerReturns);
  app.use("/api/seller/returns", sellerReturns);
  app.use("/api/chat", chat);
  app.use("/api/buyer/orders", buyerOrders);
  app.use("/api/seller/orders", sellerOrders);
  server = await new Promise(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await createFixtures();
  await returnCases();
  await rollbackCase();
  await chatCases();
  await orderCases();
  await eventCase();
  if (process.argv.includes("--browser")) {
    const { runReturnBrowserCheck } = await import("./verifyReturnsBrowser.js");
    await runReturnBrowserCheck({ state, apiBaseUrl: baseUrl, createOrder, rows });
    pass("Browser return workflow checks completed");
  }
} catch (error) {
  results.push({ result: "FAIL", test: "Return HTTP/MySQL integration", reason: error.message });
  console.error(`FAIL ${error.code || error.name}: ${error.message}`);
  process.exitCode = 1;
} finally {
  let returnRows = [];
  let itemRows = [];
  if (committedFixtures && database) {
    try {
      returnRows = await rows(`SELECT return_request_id, order_id, conversation_id, customer_id, seller_id, reason, status,
        requested_at, decision_at, return_shipped_at, received_at, completed_at
        FROM marketplace_return_request WHERE customer_id IN (?) ORDER BY return_request_id`, [state.buyerIds]);
      itemRows = await rows(`SELECT ri.* FROM marketplace_return_item ri JOIN marketplace_return_request rr USING (return_request_id)
        WHERE rr.customer_id IN (?) ORDER BY ri.return_item_id`, [state.buyerIds]);
    } catch (error) { console.error(`Evidence read failed: ${error.code || error.name}`); }
    try { await cleanup(); }
    catch (error) {
      results.push({ result: "FAIL", test: "Fixture cleanup", reason: error.message });
      console.error(`CLEANUP REQUIRED ${marker}: ${error.message}`);
      process.exitCode = 1;
    }
  }
  await fs.mkdir(new URL("../.cache/", import.meta.url), { recursive: true });
  await fs.writeFile(evidencePath, JSON.stringify({ marker, frozenDatabaseSessionEpoch: frozenTime, checks: results, returns: returnRows, items: itemRows }, null, 2));
  if (server) await new Promise(resolve => server.close(resolve));
  database?.release();
  if (db) await db.promise().end();
  console.log(JSON.stringify({ passed: results.filter(item => item.result === "PASS").length, failed: results.filter(item => item.result === "FAIL").length, notTestable: results.filter(item => item.result === "NOT TESTABLE").length, evidence: "backend/.cache/return-flow-results.json" }));
}
