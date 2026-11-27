import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { PayMongoError, verifyPayMongoSignature } from "../utils/paymongo.js";
import { calculateProcessingFee } from "../utils/paymentSplit.js";
import {
  databaseFixture,
  invoke,
  loadPaymentRoute,
  signedEvent,
} from "../test/paymentHarness.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const FRONTEND_DIST = path.join(REPO_ROOT, "frontend", "dist");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

// ============================================================================
// PART 1: 100 SIMULATED TRANSACTIONS — TRANSACTION LOGGING ACCURACY TEST
// ============================================================================
async function runTransactionLoggingAccuracyTest() {
  const TOTAL_TRANSACTIONS = 100;
  const artworks = [];
  for (let i = 1; i <= TOTAL_TRANSACTIONS; i += 1) {
    const basePrice = 500 + ((i * 137) % 4500);
    artworks.push({
      artwork_id: 1000 + i * 2,
      student_id: 5,
      title: `Sim Artwork ${i}-A`,
      price: `${basePrice}.00`,
      artist_name: "Seller Alpha",
      stock_available: null,
      status: "Available",
      is_verified: 1,
      is_sold: 0,
    });
    artworks.push({
      artwork_id: 1000 + i * 2 + 1,
      student_id: 7,
      title: `Sim Artwork ${i}-B`,
      price: `${basePrice + 250}.00`,
      artist_name: "Seller Beta",
      stock_available: null,
      status: "Available",
      is_verified: 1,
      is_sold: 0,
    });
  }

  const fixture = databaseFixture({
    orders: [],
    orderItems: [],
    paymentSplits: [],
    carts: [{ add_to_id: 1, customer_id: 1, total_price: 0 }],
    cartItems: [],
    artworks,
  });

  const auditLogs = [];
  const logSellerAudit = async (seller, entry) => {
    auditLogs.push({
      seller_id: seller?.student_id,
      action: entry?.action,
      information: entry?.information,
      logged_at: new Date().toISOString(),
    });
  };

  let nextSessionCounter = 0;
  let forceCheckoutFailure = false;
  const providerSessions = new Map();

  const ordersRoutes = loadPaymentRoute("../routes/buyer/orders.js", {
    ...fixture,
    logSellerAudit,
    getPayMongoMode: () => false,
    getPayMongoPaymentMethodTypes: async () => ["card", "gcash", "paymaya", "qrph"],
    async createPayMongoCheckoutSession(options) {
      if (forceCheckoutFailure) {
        throw new PayMongoError("Simulated PayMongo gateway error", 502, 503);
      }
      nextSessionCounter += 1;
      const checkoutSessionId = `cs_sim_${String(nextSessionCounter).padStart(4, "0")}`;
      providerSessions.set(checkoutSessionId, {
        id: checkoutSessionId,
        type: "checkout_session",
        attributes: {
          reference_number: options.referenceNumber,
          checkout_url: `https://checkout.paymongo.com/${checkoutSessionId}`,
          status: "active",
          livemode: false,
          payments: [],
          payment_intent: {
            id: `pi_sim_${nextSessionCounter}`,
            attributes: { status: "awaiting_payment_method" },
          },
        },
      });
      return {
        checkoutSessionId,
        checkoutUrl: `https://checkout.paymongo.com/${checkoutSessionId}`,
        referenceNumber: options.referenceNumber,
      };
    },
    async retrievePayMongoCheckoutSession(sessionId) {
      const session = providerSessions.get(sessionId);
      if (!session) throw new PayMongoError("Session not found", 404, 404);
      return structuredClone(session);
    },
    async expirePayMongoCheckoutSession(sessionId) {
      const session = providerSessions.get(sessionId);
      if (!session) throw new PayMongoError("Session not found", 404, 404);
      session.attributes.status = "expired";
      return structuredClone(session);
    },
  });

  const paymongoRoutes = loadPaymentRoute("../routes/payments/paymongo.js", {
    ...fixture,
    logSellerAudit,
    getPayMongoMode: () => false,
    verifyPayMongoSignature: (options) =>
      verifyPayMongoSignature({ ...options, secret: "isolated-webhook-fixture" }),
  });

  // Distribution across 100 simulated transactions:
  // 45 PayMongo single-seller paid (webhook) + 20 PayMongo multi-seller paid (webhook)
  // + 10 PayMongo paid via buyer-return retry reconciliation
  // + 10 PayMongo gateway failures (rollback) + 10 PayMongo cancelled/expired
  // + 5 rejected/invalid attempts (2 bad HMAC signature, 2 tampered amount, 1 disabled COD)
  const scenarios = [];
  for (let i = 1; i <= 45; i += 1) scenarios.push({ idx: i, type: "paymongo_paid_single" });
  for (let i = 46; i <= 65; i += 1) scenarios.push({ idx: i, type: "paymongo_paid_multi" });
  for (let i = 66; i <= 75; i += 1) scenarios.push({ idx: i, type: "paymongo_paid_retry_reconciliation" });
  for (let i = 76; i <= 85; i += 1) scenarios.push({ idx: i, type: "paymongo_gateway_failure" });
  for (let i = 86; i <= 95; i += 1) scenarios.push({ idx: i, type: "paymongo_cancelled_expired" });
  scenarios.push({ idx: 96, type: "paymongo_webhook_bad_sig" });
  scenarios.push({ idx: 97, type: "paymongo_webhook_bad_sig" });
  scenarios.push({ idx: 98, type: "paymongo_webhook_amount_mismatch" });
  scenarios.push({ idx: 99, type: "paymongo_webhook_amount_mismatch" });
  scenarios.push({ idx: 100, type: "cod_disabled_rejected" });

  const stats = {
    total: scenarios.length,
    matched: 0,
    discrepancies: [],
    byCategory: {},
    durationMs: 0,
  };
  const bumpCategory = (cat, ok) => {
    stats.byCategory[cat] ??= { total: 0, passed: 0, failed: 0 };
    stats.byCategory[cat].total += 1;
    if (ok) stats.byCategory[cat].passed += 1;
    else stats.byCategory[cat].failed += 1;
  };

  const startedAt = performance.now();

  for (const scenario of scenarios) {
    const { idx, type } = scenario;
    const artA = 1000 + idx * 2;
    const artB = 1000 + idx * 2 + 1;
    const artObjA = fixture.state.artworks.find((a) => a.artwork_id === artA);
    const artObjB = fixture.state.artworks.find((a) => a.artwork_id === artB);
    const isMulti = type === "paymongo_paid_multi";
    const selectedIds = isMulti ? [artA, artB] : [artA];
    const expectedSubtotal = isMulti
      ? Number(artObjA.price) + Number(artObjB.price)
      : Number(artObjA.price);
    const expectedFee = calculateProcessingFee(expectedSubtotal);
    const expectedBuyerTotal = Number((expectedSubtotal + expectedFee).toFixed(2));
    const expectedBuyerTotalCentavos = Math.round(expectedBuyerTotal * 100);

    // Seed buyer cart for this transaction
    fixture.state.cartItems = selectedIds.map((artwork_id) => ({
      add_to_id: 1,
      artwork_id,
      quantity: 1,
    }));

    const ordersBefore = fixture.state.orders.length;
    const splitsBefore = fixture.state.paymentSplits.length;
    const auditsBefore = auditLogs.length;

    try {
      if (type === "paymongo_paid_single" || type === "paymongo_paid_multi") {
        forceCheckoutFailure = false;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          body: {
            address_id: 4,
            payment_method: "paymongo",
            artwork_ids: selectedIds,
          },
        });
        assert.equal(checkoutRes.status, 201);
        assert.equal(Number(checkoutRes.body.processing_fee || 0), expectedFee);
        assert.equal(Number(checkoutRes.body.total), expectedBuyerTotal);
        const reference = checkoutRes.body.payment_reference;
        const createdOrders = fixture.state.orders.filter(
          (o) => o.payment_reference === reference,
        );
        const expectedOrderCount = isMulti ? 2 : 1;
        assert.equal(createdOrders.length, expectedOrderCount);
        const sessionId = createdOrders[0].paymongo_checkout_session_id;
        const payId = `pay_sim_${String(idx).padStart(4, "0")}`;
        const channel = ["gcash", "card", "paymaya", "qrph"][idx % 4];

        const webhookReq = signedEvent({
          mutate(session) {
            session.id = sessionId;
            session.attributes.reference_number = reference;
            session.attributes.payments[0].id = payId;
            session.attributes.payments[0].attributes.amount = expectedBuyerTotalCentavos;
            session.attributes.payments[0].attributes.source = { type: channel };
          },
        });
        const webhookRes = await invoke(paymongoRoutes, "post", "/webhook", webhookReq);
        assert.equal(webhookRes.status, 200);
        assert.equal(webhookRes.body.received, true);

        // Cross-reference persisted orders, splits, and seller audit logs
        const updatedOrders = fixture.state.orders.filter(
          (o) => o.payment_reference === reference,
        );
        const newSplits = fixture.state.paymentSplits.filter(
          (s) => s.payment_reference === reference,
        );
        const newAudits = auditLogs.slice(auditsBefore);

        assert.equal(updatedOrders.length, expectedOrderCount);
        assert.ok(
          updatedOrders.every(
            (o) =>
              o.payment_status === "Paid" &&
              o.paymongo_payment_id === payId &&
              o.paymongo_payment_method === channel &&
              Boolean(o.paid_at),
          ),
        );
        const loggedTotalCentavos = updatedOrders.reduce(
          (sum, o) => sum + Math.round(Number(o.total_amount) * 100),
          0,
        );
        const loggedFeeCentavos = updatedOrders.reduce(
          (sum, o) => sum + Math.round(Number(o.processing_fee || 0) * 100),
          0,
        );
        assert.equal(loggedTotalCentavos, expectedBuyerTotalCentavos);
        assert.equal(loggedFeeCentavos, Math.round(expectedFee * 100));
        assert.equal(newSplits.length, expectedOrderCount);
        assert.equal(
          Math.round(newSplits.reduce((sum, s) => sum + Number(s.gross_amount), 0) * 100),
          Math.round(expectedSubtotal * 100),
        );
        assert.ok(newSplits.every((s) => s.payout_status === "Held"));
        assert.equal(newAudits.length, expectedOrderCount);
        for (const order of updatedOrders) {
          const expectedOrderTag = `AM-${String(order.order_id).padStart(6, "0")}`;
          const matchedAudit = newAudits.find(
            (a) =>
              a.action === "SALE_PAYMENT_RECEIVED" &&
              Number(a.seller_id) === Number(order.seller_id) &&
              a.information.includes(expectedOrderTag) &&
              a.information.includes(reference) &&
              a.information.includes(`PHP ${Number(order.total_amount).toFixed(2)}`),
          );
          assert.ok(matchedAudit, `Missing SALE_PAYMENT_RECEIVED log for ${expectedOrderTag}`);
        }
        assert.equal(fixture.state.cartItems.length, 0);
      } else if (type === "paymongo_paid_retry_reconciliation") {
        forceCheckoutFailure = false;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          body: {
            address_id: 4,
            payment_method: "paymongo",
            artwork_ids: selectedIds,
          },
        });
        assert.equal(checkoutRes.status, 201);
        const reference = checkoutRes.body.payment_reference;
        const createdOrder = fixture.state.orders.find(
          (o) => o.payment_reference === reference,
        );
        const sessionId = createdOrder.paymongo_checkout_session_id;
        const payId = `pay_retry_${String(idx).padStart(4, "0")}`;
        const providerSession = providerSessions.get(sessionId);
        providerSession.attributes.status = "completed";
        providerSession.attributes.payments = [
          {
            id: payId,
            type: "payment",
            attributes: {
              status: "paid",
              amount: expectedBuyerTotalCentavos,
              currency: "PHP",
              livemode: false,
              source: { type: "gcash" },
              paid_at: Math.floor(Date.now() / 1000),
            },
          },
        ];

        const retryRes = await invoke(ordersRoutes, "post", "/payments/:reference/retry", {
          params: { reference },
        });
        assert.equal(retryRes.status, 200);
        assert.equal(retryRes.body.payment_status, "Paid");

        const updatedOrder = fixture.state.orders.find(
          (o) => o.payment_reference === reference,
        );
        const newSplits = fixture.state.paymentSplits.filter(
          (s) => s.payment_reference === reference,
        );
        const newAudits = auditLogs.slice(auditsBefore);
        assert.equal(updatedOrder.payment_status, "Paid");
        assert.equal(updatedOrder.paymongo_payment_id, payId);
        assert.equal(Math.round(Number(updatedOrder.total_amount) * 100), expectedBuyerTotalCentavos);
        assert.equal(newSplits.length, 1);
        assert.equal(newSplits[0].payout_status, "Held");
        assert.equal(newAudits.length, 1);
        const expectedOrderTag = `AM-${String(updatedOrder.order_id).padStart(6, "0")}`;
        assert.equal(newAudits[0].action, "SALE_PAYMENT_RECEIVED");
        assert.ok(newAudits[0].information.includes(expectedOrderTag));
        assert.ok(newAudits[0].information.includes(reference));
        assert.ok(newAudits[0].information.includes(`PHP ${Number(updatedOrder.total_amount).toFixed(2)}`));
        assert.equal(fixture.state.cartItems.length, 0);
      } else if (type === "paymongo_gateway_failure") {
        forceCheckoutFailure = true;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          body: {
            address_id: 4,
            payment_method: "paymongo",
            artwork_ids: selectedIds,
          },
        });
        assert.equal(checkoutRes.status, 502);
        // Verify clean rollback: zero orphan orders, splits, or audit logs; cart retained
        assert.equal(fixture.state.orders.length, ordersBefore);
        assert.equal(fixture.state.paymentSplits.length, splitsBefore);
        assert.equal(auditLogs.length, auditsBefore);
        assert.equal(fixture.state.cartItems.length, 1);
      } else if (type === "paymongo_cancelled_expired") {
        forceCheckoutFailure = false;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          body: {
            address_id: 4,
            payment_method: "paymongo",
            artwork_ids: selectedIds,
          },
        });
        assert.equal(checkoutRes.status, 201);
        const reference = checkoutRes.body.payment_reference;
        const cancelRes = await invoke(ordersRoutes, "put", "/payments/:reference/cancel", {
          params: { reference },
        });
        assert.equal(cancelRes.status, 200);
        const cancelledOrders = fixture.state.orders.filter(
          (o) => o.payment_reference === reference,
        );
        assert.equal(cancelledOrders.length, 1);
        assert.equal(cancelledOrders[0].status, "Cancelled");
        assert.equal(cancelledOrders[0].payment_status, "Expired");
        // Verify SALE_ORDER_CANCELLED audit entry recorded and cart retained
        const newAudits = auditLogs.slice(auditsBefore);
        assert.equal(newAudits.length, 1);
        const expectedOrderTag = `AM-${String(cancelledOrders[0].order_id).padStart(6, "0")}`;
        assert.equal(newAudits[0].action, "SALE_ORDER_CANCELLED");
        assert.ok(newAudits[0].information.includes(expectedOrderTag));
        assert.ok(newAudits[0].information.includes(reference));
        assert.equal(fixture.state.cartItems.length, 1);
      } else if (
        type === "paymongo_webhook_bad_sig" ||
        type === "paymongo_webhook_amount_mismatch"
      ) {
        forceCheckoutFailure = false;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          body: {
            address_id: 4,
            payment_method: "paymongo",
            artwork_ids: selectedIds,
          },
        });
        assert.equal(checkoutRes.status, 201);
        const reference = checkoutRes.body.payment_reference;
        const createdOrder = fixture.state.orders.find(
          (o) => o.payment_reference === reference,
        );
        const sessionId = createdOrder.paymongo_checkout_session_id;
        const webhookReq = signedEvent(
          {
            mutate(session) {
              session.id = sessionId;
              session.attributes.reference_number = reference;
              session.attributes.payments[0].id = `pay_bad_${idx}`;
              session.attributes.payments[0].attributes.amount =
                type === "paymongo_webhook_amount_mismatch"
                  ? expectedBuyerTotalCentavos - 500
                  : expectedBuyerTotalCentavos;
            },
          },
          { invalid: type === "paymongo_webhook_bad_sig" },
        );
        const webhookRes = await invoke(paymongoRoutes, "post", "/webhook", webhookReq);
        assert.equal(
          webhookRes.status,
          type === "paymongo_webhook_bad_sig" ? 401 : 400,
        );
        // Must remain Pending and NOT log a confirmed sale
        assert.equal(createdOrder.payment_status, "Pending");
        assert.equal(auditLogs.length, auditsBefore);
      } else if (type === "cod_disabled_rejected") {
        forceCheckoutFailure = false;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          body: {
            address_id: 4,
            payment_method: "cod",
            artwork_ids: selectedIds,
          },
        });
        assert.equal(checkoutRes.status, 400);
        // Must reject cleanly without creating orders, splits, or audit logs; cart retained
        assert.equal(fixture.state.orders.length, ordersBefore);
        assert.equal(fixture.state.paymentSplits.length, splitsBefore);
        assert.equal(auditLogs.length, auditsBefore);
        assert.equal(fixture.state.cartItems.length, 1);
      }

      stats.matched += 1;
      bumpCategory(type, true);
    } catch (err) {
      stats.discrepancies.push({ idx, type, error: err.message });
      bumpCategory(type, false);
    }
  }

  // Final cross-reference of GET /api/buyer/orders visibility across all 100 simulated runs
  const buyerOrdersRes = await invoke(ordersRoutes, "get", "/");
  assert.equal(buyerOrdersRes.status, 200);
  // 45*1 + 20*2 + 10*1 = 95 paid placed orders visible (0 from failures, cancellations, or rejected attempts)
  const expectedVisibleOrders = 45 * 1 + 20 * 2 + 10 * 1;
  const visibleOrdersMatch = buyerOrdersRes.body.length === expectedVisibleOrders;
  if (!visibleOrdersMatch) {
    stats.discrepancies.push({
      idx: "FINAL_LEDGER",
      type: "buyer_orders_visibility",
      error: `Expected ${expectedVisibleOrders} visible orders, got ${buyerOrdersRes.body.length}`,
    });
  }

  const paidAuditLogs = auditLogs.filter((a) => a.action === "SALE_PAYMENT_RECEIVED").length;
  const cancelledAuditLogs = auditLogs.filter((a) => a.action === "SALE_ORDER_CANCELLED").length;
  const expectedAuditLogs = expectedVisibleOrders + 10;

  stats.durationMs = Number((performance.now() - startedAt).toFixed(2));
  stats.accuracyPercent = Number(((stats.matched / stats.total) * 100).toFixed(2));
  stats.totalOrdersPersisted = fixture.state.orders.length;
  stats.totalPlacedOrdersVisible = buyerOrdersRes.body.length;
  stats.expectedPlacedOrdersVisible = expectedVisibleOrders;
  stats.totalAuditLogsRecorded = auditLogs.length;
  stats.paidAuditLogsRecorded = paidAuditLogs;
  stats.cancelledAuditLogsRecorded = cancelledAuditLogs;
  stats.expectedAuditLogs = expectedAuditLogs;
  return stats;
}

// ============================================================================
// PART 2: 50 CONSECUTIVE CHECKOUT PAGE LOAD SIMULATIONS IN HEADLESS CHROME
// ============================================================================
function startStaticDistServer() {
  const assetCache = new Map();
  const COMPRESSIBLE = new Set([".html", ".js", ".css", ".json", ".svg"]);

  const getAsset = (filePath) => {
    if (!assetCache.has(filePath)) {
      const raw = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const gzip = COMPRESSIBLE.has(ext) ? zlib.gzipSync(raw, { level: 6 }) : null;
      assetCache.set(filePath, {
        raw,
        gzip,
        contentType: MIME_TYPES[ext] || "application/octet-stream",
      });
    }
    return assetCache.get(filePath);
  };

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqPath = decodeURIComponent((req.url || "/").split("?")[0]);
      let filePath = path.join(FRONTEND_DIST, reqPath === "/" ? "index.html" : reqPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(FRONTEND_DIST, "index.html");
      }
      const asset = getAsset(filePath);
      const acceptsGzip = String(req.headers["accept-encoding"] || "").includes("gzip");
      if (acceptsGzip && asset.gzip) {
        res.writeHead(200, {
          "Content-Type": asset.contentType,
          "Content-Encoding": "gzip",
          "Content-Length": asset.gzip.length,
          "Cache-Control": "no-store",
        });
        res.end(asset.gzip);
      } else {
        res.writeHead(200, {
          "Content-Type": asset.contentType,
          "Content-Length": asset.raw.length,
          "Cache-Control": "no-store",
        });
        res.end(asset.raw);
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, origin: `http://localhost:${port}` });
    });
  });
}

function buildMockApiResponse(urlStr) {
  const pathname = new URL(urlStr).pathname.replace(/\/+$/, "");
  const sampleCart = [
    {
      artwork_id: 201,
      seller_id: 5,
      title: "Sunset Horizon Study",
      artist: "Sample Artist A",
      price: 1500,
      quantity: 1,
      is_sold_out: 0,
      art_type: "Painting",
      product_type: "Pre-made",
      image: "",
    },
    {
      artwork_id: 202,
      seller_id: 7,
      title: "Carved Heritage Figure Set",
      artist: "Sample Artist B",
      price: 3200,
      quantity: 1,
      is_sold_out: 0,
      art_type: "Product",
      product_type: "Pre-made",
      stock_available: 10,
      sold_quantity: 2,
      image: "",
    },
  ];
  const sampleAddresses = [
    {
      address_id: 4,
      recipient_name: "Test Buyer",
      phone_number: "09171234567",
      street_name: "123 Ayala Blvd",
      barangay: "Ermita",
      city: "Manila",
      province: "Metro Manila",
      region: "NCR",
      postal_code: "1000",
      is_current: 1,
    },
  ];
  const sampleProfile = {
    customer_id: 1,
    username: "survey_buyer",
    first_name: "Test",
    last_name: "Buyer",
    email: "buyer@example.invalid",
    phone_number: "09171234567",
    profile_image: "",
    payment_method_types: ["card", "gcash", "paymaya", "qrph"],
  };

  if (pathname.endsWith("/api/buyer/cart")) return sampleCart;
  if (pathname.endsWith("/api/buyer/addresses")) return sampleAddresses;
  if (pathname.endsWith("/api/buyer/authenticate/me")) return sampleProfile;
  if (
    pathname.endsWith("/api/buyer/orders/payments/methods") ||
    pathname.endsWith("/api/buyer/orders/payment-methods")
  ) {
    return { payment_method_types: ["card", "gcash", "paymaya", "qrph"] };
  }
  if (pathname.includes("/api/footer-content")) {
    return {
      brandName: "ArtMatch",
      description: "Campus fine arts marketplace.",
      columns: [],
      socials: [],
      offerings: [],
      copyright: "© {year} ArtMatch. All rights reserved.",
    };
  }
  if (pathname.includes("/api/buyer/promotion-slides")) return [];
  if (pathname.includes("/api/buyer/favorites")) return [];
  if (pathname.includes("/api/chat/buyer/")) return [];
  if (pathname.includes("/api/buyer/orders")) return [];
  return { ok: true };
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || "CDP error"));
        else resolve(msg.result);
      } else if (msg.method && this.listeners.has(msg.method)) {
        for (const fn of this.listeners.get(msg.method)) fn(msg.params);
      }
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(fn);
    return () => this.listeners.get(method)?.delete(fn);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

function httpGetJson(urlStr) {
  return new Promise((resolve, reject) => {
    const req = http.get(urlStr, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(2000, () => {
      req.destroy(new Error("HTTP GET timeout"));
    });
  });
}

async function waitForDevToolsWs(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = "";
  while (Date.now() < deadline) {
    try {
      const targets = await httpGetJson(`http://127.0.0.1:${port}/json/list`);
      const page = Array.isArray(targets)
        ? targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl)
        : null;
      if (page) return page.webSocketDebuggerUrl;
      lastErr = `Targets returned: ${JSON.stringify(targets).slice(0, 200)}`;
    } catch (err) {
      lastErr = err.message;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for Chrome DevTools endpoint (last error: ${lastErr})`);
}

async function runCheckoutLoadTimeBenchmark(runs = 50) {
  const browserPath = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!browserPath) {
    throw new Error("No Chromium/Chrome/Edge executable found on this machine.");
  }
  if (!fs.existsSync(path.join(FRONTEND_DIST, "index.html"))) {
    throw new Error(`Missing production build at ${FRONTEND_DIST}. Run npm run build in frontend/ first.`);
  }

  const { server, origin } = await startStaticDistServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "artmatch-perf-"));
  const debugPort = 9222 + Math.floor(Math.random() * 500);
  const chrome = spawn(
    browserPath,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-allow-origins=*",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let chromeStderr = "";
  chrome.stderr?.on("data", (chunk) => {
    chromeStderr += chunk.toString("utf8");
  });

  let cdp;
  try {
    let wsUrl;
    try {
      wsUrl = await waitForDevToolsWs(debugPort);
    } catch (err) {
      throw new Error(`${err.message}. Chrome exit=${chrome.exitCode}. Stderr: ${chromeStderr.slice(0, 600)}`);
    }
    cdp = new CdpClient(wsUrl);
    await cdp.ready;

    await cdp.send("Page.enable");
    await cdp.send("Network.enable");
    await cdp.send("Runtime.enable");

    // Normal network conditions (realistic consumer broadband / Fast 4G: 40ms RTT, 10 Mbps down, 5 Mbps up)
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 40,
      downloadThroughput: (10 * 1024 * 1024) / 8,
      uploadThroughput: (5 * 1024 * 1024) / 8,
      connectionType: "wifi",
    });

    const diag = {
      pausedUrls: [],
      fulfillErrors: [],
      networkFailed: [],
      runtimeExceptions: [],
    };
    cdp.on("Network.loadingFailed", (params) => {
      if (!params.canceled) {
        diag.networkFailed.push(`${params.type}: ${params.errorText} (${params.blockedReason || ""})`);
      }
    });
    cdp.on("Runtime.exceptionThrown", (params) => {
      const msg = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || "unknown";
      diag.runtimeExceptions.push(msg.slice(0, 200));
    });

    // Intercept API requests to http://localhost:5000/* so checkout renders full data cleanly
    await cdp.send("Fetch.enable", {
      patterns: [{ urlPattern: "http://localhost:5000/*", requestStage: "Request" }],
    });
    cdp.on("Fetch.requestPaused", async (params) => {
      diag.pausedUrls.push(`${params.request.method} ${params.request.url}`);
      try {
        const reqOrigin =
          params.request.headers?.Origin ||
          params.request.headers?.origin ||
          origin;
        const reqHeaders =
          params.request.headers?.["Access-Control-Request-Headers"] ||
          params.request.headers?.["access-control-request-headers"] ||
          "Content-Type,Authorization,X-Requested-With,Cache-Control";
        if (params.request.method === "OPTIONS") {
          await cdp.send("Fetch.fulfillRequest", {
            requestId: params.requestId,
            responseCode: 204,
            responseHeaders: [
              { name: "Access-Control-Allow-Origin", value: reqOrigin },
              { name: "Access-Control-Allow-Credentials", value: "true" },
              { name: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
              { name: "Access-Control-Allow-Headers", value: reqHeaders },
            ],
          });
          return;
        }
        const payload = JSON.stringify(buildMockApiResponse(params.request.url));
        await cdp.send("Fetch.fulfillRequest", {
          requestId: params.requestId,
          responseCode: 200,
          responseHeaders: [
            { name: "Content-Type", value: "application/json" },
            { name: "Access-Control-Allow-Origin", value: reqOrigin },
            { name: "Access-Control-Allow-Credentials", value: "true" },
          ],
          body: Buffer.from(payload, "utf8").toString("base64"),
        });
      } catch (err) {
        diag.fulfillErrors.push(`${params.request.method} ${params.request.url}: ${err.message}`);
      }
    });

    // Seed authenticated buyer session marker in localStorage before every document load
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        if (window.location && window.location.protocol && window.location.protocol.startsWith("http")) {
          localStorage.setItem("buyer_logged_in", "true");
          localStorage.setItem("buyer_customer_id", "1");
          localStorage.setItem("buyer_username", "survey_buyer");
          localStorage.setItem("auth_section", "buyer");
        }
      `,
    });

    const checkoutUrl = `${origin}/buyer/checkout`;
    const samples = [];

    for (let run = 1; run <= runs; run += 1) {
      // Clear browser cache each run to simulate genuine consecutive page loads
      await cdp.send("Network.clearBrowserCache");
      await cdp.send("Page.navigate", { url: "about:blank" });
      await new Promise((r) => setTimeout(r, 20));

      const loadEventPromise = new Promise((resolve) => {
        const off = cdp.on("Page.loadEventFired", () => {
          off();
          resolve();
        });
      });

      const navStart = performance.now();
      await cdp.send("Page.navigate", { url: checkoutUrl });
      await loadEventPromise;

      // Wait until React Checkout hydrates & renders actual loaded cart items (no spinner)
      let readyMs = null;
      let lastDebugSnippet = "";
      const pollDeadline = Date.now() + 10000;
      while (Date.now() < pollDeadline) {
        const evalRes = await cdp.send("Runtime.evaluate", {
          returnByValue: true,
          expression: `(() => {
            const text = document.body ? document.body.innerText : "";
            const ready = text.includes("Sunset Horizon Study") && text.includes("Continue to Secure Payment");
            const nav = performance.getEntriesByType("navigation")[0];
            const fcp = performance.getEntriesByName("first-contentful-paint")[0];
            return {
              ready,
              path: window.location.pathname,
              snippet: text.slice(0, 220),
              domContentLoadedMs: nav ? nav.domContentLoadedEventEnd : null,
              loadEventMs: nav ? nav.loadEventEnd : null,
              fcpMs: fcp ? fcp.startTime : null,
            };
          })()`,
        });
        const val = evalRes?.result?.value;
        if (val?.snippet) lastDebugSnippet = `${val.path}: ${val.snippet}`;
        if (val?.ready) {
          readyMs = performance.now() - navStart;
          samples.push({
            run,
            checkoutReadyMs: Number(readyMs.toFixed(1)),
            loadEventMs: val.loadEventMs ? Number(val.loadEventMs.toFixed(1)) : null,
            domContentLoadedMs: val.domContentLoadedMs ? Number(val.domContentLoadedMs.toFixed(1)) : null,
            fcpMs: val.fcpMs ? Number(val.fcpMs.toFixed(1)) : null,
          });
          break;
        }
        await new Promise((r) => setTimeout(r, 25));
      }
      if (readyMs === null) {
        throw new Error(
          `Run #${run} timed out waiting for Checkout content to render.\n` +
            `Last DOM: ${lastDebugSnippet}\n` +
            `Paused API URLs (${diag.pausedUrls.length}): ${diag.pausedUrls.slice(-20).join(" | ")}\n` +
            `Fulfill errors: ${diag.fulfillErrors.slice(-10).join(" | ")}\n` +
            `Network failed: ${diag.networkFailed.slice(-10).join(" | ")}\n` +
            `Runtime exceptions: ${diag.runtimeExceptions.slice(-5).join(" | ")}`,
        );
      }
    }

    const summarize = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      const mean = sum / sorted.length;
      const median = sorted[Math.floor(sorted.length / 2)];
      const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
      return {
        minMs: Number(sorted[0].toFixed(1)),
        avgMs: Number(mean.toFixed(1)),
        medianMs: Number(median.toFixed(1)),
        p95Ms: Number(p95.toFixed(1)),
        maxMs: Number(sorted[sorted.length - 1].toFixed(1)),
      };
    };

    const readySummary = summarize(samples.map((s) => s.checkoutReadyMs));
    const loadSummary = summarize(samples.map((s) => s.loadEventMs).filter((v) => v !== null));
    const fcpSummary = summarize(samples.map((s) => s.fcpMs).filter((v) => v !== null));

    return {
      browser: path.basename(browserPath),
      runs: samples.length,
      networkProfile: "Normal network emulation (40ms RTT, 10 Mbps down, 5 Mbps up, cold cache)",
      thresholdMs: 3000,
      passedThreshold: readySummary.avgMs < 3000 && loadSummary.avgMs < 3000,
      checkoutInteractiveReady: readySummary,
      windowLoadEvent: loadSummary,
      firstContentfulPaint: fcpSummary,
      samples,
    };
  } finally {
    cdp?.close();
    chrome.kill();
    server.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore temp dir cleanup race on Windows */
    }
  }
}

async function main() {
  console.log("Running 100 simulated transactions (Transaction Logging Accuracy)...");
  const txResults = await runTransactionLoggingAccuracyTest();
  console.log(
    `Part 1 complete: ${txResults.matched}/${txResults.total} matched (${txResults.accuracyPercent}%) in ${txResults.durationMs}ms.`,
  );

  console.log("Running 50 consecutive /buyer/checkout page loads in headless Chrome...");
  const perfResults = await runCheckoutLoadTimeBenchmark(50);

  const report = {
    executedAt: new Date().toISOString(),
    checkoutPageLoadTime: {
      browser: perfResults.browser,
      runs: perfResults.runs,
      networkProfile: perfResults.networkProfile,
      thresholdSeconds: 3.0,
      averageCheckoutReadySeconds: Number((perfResults.checkoutInteractiveReady.avgMs / 1000).toFixed(3)),
      averageWindowLoadSeconds: Number((perfResults.windowLoadEvent.avgMs / 1000).toFixed(3)),
      averageFcpSeconds: Number((perfResults.firstContentfulPaint.avgMs / 1000).toFixed(3)),
      checkoutInteractiveReady: perfResults.checkoutInteractiveReady,
      windowLoadEvent: perfResults.windowLoadEvent,
      firstContentfulPaint: perfResults.firstContentfulPaint,
      passed: perfResults.passedThreshold,
    },
    transactionLoggingAccuracy: txResults,
  };

  console.log("\n=== BENCHMARK & ACCURACY REPORT ===");
  console.log(JSON.stringify(report, null, 2));

  if (!report.checkoutPageLoadTime.passed || report.transactionLoggingAccuracy.accuracyPercent < 100) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Test suite error:", err);
  process.exit(1);
});
