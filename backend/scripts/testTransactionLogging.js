import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import db, { resolveDbConfig } from "../database/db.js";
import { ensureOrderTables } from "../database/orders.js";
import { ensurePaymentSplitTable, getCommissionRate } from "../database/paymentSplits.js";
import { ensureAuditLogsTable, logSellerAudit } from "../utils/auditLogger.js";
import * as paymongo from "../utils/paymongo.js";
import * as availability from "../utils/artworkAvailability.js";
import * as paymentSplit from "../utils/paymentSplit.js";
import * as paymongoReconciliation from "../utils/paymongoReconciliation.js";
import * as checkoutVouchers from "../utils/checkoutVouchers.js";
import * as productOptions from "../utils/productOptions.js";
import { attachDeliveryProof, parsePhotoList } from "../utils/deliveryProof.js";
import { attachOrderReturns } from "../utils/returns.js";
import {
  recordRecommendationInteraction,
  getRecommendationSessionIdFromRequest,
} from "../utils/recommendationInteractions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const REPORT_PATH = path.join(REPO_ROOT, "transaction_logging_test_report.md");

const RUN_TIMESTAMP = Date.now();
const RUN_TAG = `TEST_RUN_${RUN_TIMESTAMP}`;
const TEST_WEBHOOK_SECRET = `whsec_${RUN_TAG}`;
const TOTAL_TRANSACTIONS = 500;

function loadRealRoute(relativePath, dependencies = {}) {
  const routes = new Map();
  const router = {};
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    router[method] = (routePath, ...handlers) => {
      routes.set(`${method}:${routePath}`, handlers.at(-1));
    };
  }
  const source = fs
    .readFileSync(new URL(relativePath, import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\s*/gm, "")
    .replace(/export default router;?/, "");

  const context = {
    ...paymongo,
    ...availability,
    ...paymentSplit,
    ...paymongoReconciliation,
    ...checkoutVouchers,
    ...productOptions,
    createHmac,
    timingSafeEqual,
    Buffer,
    URL,
    URLSearchParams,
    Date,
    setTimeout,
    clearTimeout,
    db,
    express: { Router: () => router },
    authenticateBuyer: () => {},
    attachOrderReturns,
    attachDeliveryProof,
    parsePhotoList,
    getCommissionRate,
    recordRecommendationInteraction,
    getRecommendationSessionIdFromRequest,
    logSellerAudit,
    payoutService: {
      list: async () => ({ currency: "PHP", totals: {}, orders: [] }),
      handleTransferEvent: async () => false,
    },
    readParcelPhoto: () => {
      throw new Error("Unexpected parcel photo read during transaction logging test");
    },
    process: {
      env: {
        ...process.env,
        PAYMONGO_SECRET_KEY: "sk_test_isolated_tx_logging",
        PAYMONGO_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
        FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
      },
    },
    console: { log() {}, warn() {}, error() {} },
    ...dependencies,
  };

  vm.runInNewContext(source, context, { filename: relativePath });
  return routes;
}

async function invoke(routes, method, routePath, overrides = {}) {
  const handler = routes.get(`${method}:${routePath}`);
  if (!handler) throw new Error(`Route not found: ${method.toUpperCase()} ${routePath}`);
  let status = 200;
  let body;
  const req = {
    user: overrides.user || {},
    body: overrides.body || {},
    params: overrides.params || {},
    query: overrides.query || {},
    rawBody: overrides.rawBody,
    get: overrides.get || (() => null),
  };
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
    set() {
      return this;
    },
  };
  await handler(req, res);
  return { status, body: JSON.parse(JSON.stringify(body ?? null)) };
}

function buildSignedPayMongoWebhook({
  sessionId,
  referenceNumber,
  paymentId,
  amountCentavos,
  channel,
  invalidSignature = false,
}) {
  const session = {
    id: sessionId,
    type: "checkout_session",
    attributes: {
      reference_number: referenceNumber,
      livemode: false,
      payments: [
        {
          id: paymentId,
          type: "payment",
          attributes: {
            status: "paid",
            amount: amountCentavos,
            currency: "PHP",
            livemode: false,
            source: { type: channel },
            paid_at: Math.floor(Date.now() / 1000),
          },
        },
      ],
    },
  };
  const body = {
    data: {
      id: `evt_${RUN_TAG}_${paymentId}`,
      type: "event",
      attributes: {
        type: "checkout_session.payment.paid",
        livemode: false,
        data: session,
      },
    },
  };
  const rawBody = Buffer.from(JSON.stringify(body), "utf8");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const digest = createHmac("sha256", TEST_WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody.toString("utf8")}`)
    .digest("hex");
  const finalDigest = invalidSignature ? `${digest}deadbeef` : digest;
  const signatureHeader = `t=${timestamp},te=${finalDigest},li=`;
  return {
    body,
    rawBody,
    get: (headerName) =>
      String(headerName || "").toLowerCase() === "paymongo-signature" ? signatureHeader : null,
  };
}

async function query(sql, params = []) {
  const [rows] = await db.promise().query(sql, params);
  return rows;
}

async function getTableRowCounts() {
  const tables = [
    "marketplace_order",
    "marketplace_order_item",
    "seller_payment_split",
    "audit_logs",
    "recommendation_interaction",
    "customer",
    "student",
    "artwork",
    "artupload",
    "address",
    "add_cart",
    "cart_item",
  ];
  const counts = {};
  for (const table of tables) {
    const [row] = await query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
    counts[table] = Number(row.cnt);
  }
  return counts;
}

async function setupIsolatedTestEntities() {
  const shortTag = String(RUN_TIMESTAMP).slice(-8);

  // Create isolated test buyer
  const customerRes = await query(
    `INSERT INTO customer
       (username, first_name, last_name, email, phone_number, password, allow_personalized_recommendations)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      `test_buyer_${shortTag}`,
      "TestBuyer",
      RUN_TAG,
      `${RUN_TAG.toLowerCase()}@test.artmatch.invalid`,
      "09170000001",
      "$2b$10$syntheticTestPasswordHashNotForLogin000000000000000000",
      1,
    ],
  );
  const customerId = customerRes.insertId;

  // Create isolated shipping address
  const addressRes = await query(
    `INSERT INTO address
       (customer_id, region, province, city, barangay, postal_code, street_name, is_current)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customerId,
      "NCR",
      "Metro Manila",
      "Manila",
      "Ermita",
      "1000",
      `100 ${RUN_TAG} Test Ave`,
      1,
    ],
  );
  const addressId = addressRes.insertId;

  // Create buyer cart
  const cartRes = await query(
    `INSERT INTO add_cart (customer_id, total_price) VALUES (?, ?)`,
    [customerId, 0],
  );
  const cartId = cartRes.insertId;

  // Create two isolated verified student sellers for single-seller and multi-seller split tests
  const sellerDefs = [
    {
      firstName: "TestSellerA",
      lastName: RUN_TAG,
      email: `seller_a_${shortTag}@test.artmatch.invalid`,
      studentNumber: `TS-A-${shortTag}`,
    },
    {
      firstName: "TestSellerB",
      lastName: RUN_TAG,
      email: `seller_b_${shortTag}@test.artmatch.invalid`,
      studentNumber: `TS-B-${shortTag}`,
    },
  ];
  const sellerIds = [];
  for (const s of sellerDefs) {
    const sRes = await query(
      `INSERT INTO student
         (first_name, last_name, email, student_number, course, year_level, address, password, account_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.firstName,
        s.lastName,
        s.email,
        s.studentNumber,
        "Fine Arts",
        "4th Year",
        "CAFA Studio Test Wing",
        "$2b$10$syntheticTestPasswordHashNotForLogin000000000000000000",
        "active",
      ],
    );
    const studentId = sRes.insertId;
    sellerIds.push(studentId);
    await query(
      `INSERT INTO accregistration (student_id, register_status, approved_date)
       VALUES (?, 'verified', NOW())`,
      [studentId],
    );
  }

  // Create 4 reusable high-stock artworks across both sellers (varied prices incl. centavos)
  const reusableSpecs = [
    { sellerIdx: 0, title: `${RUN_TAG} Painting Alpha`, price: "850.00", artType: "Painting" },
    { sellerIdx: 0, title: `${RUN_TAG} Painting Gamma`, price: "2350.00", artType: "Painting" },
    { sellerIdx: 1, title: `${RUN_TAG} Digital Beta`, price: "1425.50", artType: "Digital" },
    { sellerIdx: 1, title: `${RUN_TAG} Sculpture Delta`, price: "3190.00", artType: "Sculpture" },
  ];

  const reusableArtworks = [];
  const allArtworkIds = [];

  for (const spec of reusableSpecs) {
    const sellerId = sellerIds[spec.sellerIdx];
    const artRes = await query(
      `INSERT INTO artwork
         (student_id, title, price, description, genre, art_type, product, status, is_sold, product_type, artwork_details)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', 0, 'Pre-made', ?)`,
      [
        sellerId,
        spec.title,
        spec.price,
        `Synthetic test artwork for ${RUN_TAG}`,
        "Contemporary",
        spec.artType,
        "Artwork",
        JSON.stringify({ stock_available: 2000 }),
      ],
    );
    const artworkId = artRes.insertId;
    await query(
      `INSERT INTO artupload (artwork_id, request_status, approved_date)
       VALUES (?, 'verified', NOW())`,
      [artworkId],
    );
    reusableArtworks.push({
      artwork_id: artworkId,
      seller_id: sellerId,
      title: spec.title,
      price: Number(spec.price),
    });
    allArtworkIds.push(artworkId);
  }

  // Create 40 dedicated single-use artworks for rejected-webhook tests (where order remains Pending)
  const pendingScenarioArtworks = [];
  for (let i = 1; i <= 40; i += 1) {
    const sellerId = sellerIds[i % 2];
    const price = Number((600 + i * 47.25).toFixed(2));
    const artRes = await query(
      `INSERT INTO artwork
         (student_id, title, price, description, genre, art_type, product, status, is_sold, product_type, artwork_details)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', 0, 'Pre-made', ?)`,
      [
        sellerId,
        `${RUN_TAG} PendingCheck #${i}`,
        price.toFixed(2),
        `Synthetic rejected-webhook test artwork #${i} for ${RUN_TAG}`,
        "Abstract",
        "Painting",
        "Artwork",
        JSON.stringify({ stock_available: 10 }),
      ],
    );
    const artworkId = artRes.insertId;
    await query(
      `INSERT INTO artupload (artwork_id, request_status, approved_date)
       VALUES (?, 'verified', NOW())`,
      [artworkId],
    );
    pendingScenarioArtworks.push({
      artwork_id: artworkId,
      seller_id: sellerId,
      title: `${RUN_TAG} PendingCheck #${i}`,
      price,
    });
    allArtworkIds.push(artworkId);
  }

  return {
    customerId,
    addressId,
    cartId,
    sellerIds,
    reusableArtworks,
    pendingScenarioArtworks,
    allArtworkIds,
  };
}

async function cleanupTestEntities(entities) {
  if (!entities) return null;
  const { customerId, cartId, sellerIds, allArtworkIds } = entities;

  // Delete in FK-safe order
  if (sellerIds?.length) {
    await query(`DELETE FROM audit_logs WHERE actor IN (?)`, [sellerIds.map(String)]);
  }
  await query(`DELETE FROM audit_logs WHERE information LIKE ?`, [`%${RUN_TAG}%`]);
  if (customerId) {
    await query(`DELETE FROM recommendation_interaction WHERE customer_id = ?`, [customerId]);
    const orderRows = await query(
      `SELECT order_id FROM marketplace_order WHERE customer_id = ?`,
      [customerId],
    );
    const orderIds = orderRows.map((r) => r.order_id);
    if (orderIds.length) {
      await query(`DELETE FROM seller_payment_split WHERE order_id IN (?)`, [orderIds]);
      await query(`DELETE FROM marketplace_order_item WHERE order_id IN (?)`, [orderIds]);
      await query(`DELETE FROM marketplace_order WHERE order_id IN (?)`, [orderIds]);
    }
  }
  if (cartId) {
    await query(`DELETE FROM cart_item WHERE add_to_id = ?`, [cartId]);
  }
  if (customerId) {
    await query(`DELETE FROM add_cart WHERE customer_id = ?`, [customerId]);
    await query(`DELETE FROM address WHERE customer_id = ?`, [customerId]);
  }
  if (allArtworkIds?.length) {
    await query(`DELETE FROM artupload WHERE artwork_id IN (?)`, [allArtworkIds]);
    await query(`DELETE FROM artwork WHERE artwork_id IN (?)`, [allArtworkIds]);
  }
  if (sellerIds?.length) {
    await query(`DELETE FROM accregistration WHERE student_id IN (?)`, [sellerIds]);
    await query(`DELETE FROM student WHERE student_id IN (?)`, [sellerIds]);
  }
  if (customerId) {
    await query(`DELETE FROM customer WHERE customer_id = ?`, [customerId]);
  }

  // Verify zero leftover synthetic records across all audited tables
  const residual = {
    marketplace_order: (
      await query(
        `SELECT COUNT(*) AS cnt FROM marketplace_order WHERE customer_id = ? OR payment_reference LIKE ?`,
        [customerId || -1, `%${RUN_TAG}%`],
      )
    )[0].cnt,
    seller_payment_split: (
      await query(
        `SELECT COUNT(*) AS cnt FROM seller_payment_split WHERE seller_id IN (?) OR payment_reference LIKE ?`,
        [sellerIds?.length ? sellerIds : [-1], `%${RUN_TAG}%`],
      )
    )[0].cnt,
    audit_logs: (
      await query(
        `SELECT COUNT(*) AS cnt FROM audit_logs WHERE actor IN (?) OR information LIKE ?`,
        [sellerIds?.length ? sellerIds.map(String) : ["-1"], `%${RUN_TAG}%`],
      )
    )[0].cnt,
    recommendation_interaction: (
      await query(`SELECT COUNT(*) AS cnt FROM recommendation_interaction WHERE customer_id = ?`, [
        customerId || -1,
      ])
    )[0].cnt,
    artwork: (
      await query(`SELECT COUNT(*) AS cnt FROM artwork WHERE title LIKE ?`, [`${RUN_TAG}%`])
    )[0].cnt,
    student: (
      await query(`SELECT COUNT(*) AS cnt FROM student WHERE last_name = ?`, [RUN_TAG])
    )[0].cnt,
    customer: (
      await query(`SELECT COUNT(*) AS cnt FROM customer WHERE last_name = ?`, [RUN_TAG])
    )[0].cnt,
  };
  return residual;
}

function buildScenarioPlan() {
  // 500 total consecutive simulated transactions:
  //   350 Successful Online Payments (PayMongo):
  //     200 Single-Seller PayMongo Paid (HMAC-SHA256 webhook confirmed)
  //     100 Multi-Seller 2-Storefront PayMongo Paid (HMAC-SHA256 webhook confirmed)
  //      50 PayMongo Paid via Buyer-Return Delayed-Webhook Reconciliation (/retry)
  //   150 Failed, Cancelled, Declined, or Rejected Attempts:
  //      50 Cancelled / Expired Unpaid Online Checkout (PUT /payments/:ref/cancel)
  //      40 PayMongo Gateway Outage Failure (HTTP 502 + MySQL rollback)
  //      20 Rejected Webhook — Forged HMAC Signature (HTTP 401)
  //      20 Rejected Webhook — Tampered Amount Mismatch (HTTP 400)
  //      20 Rejected Discontinued COD Checkout Attempt (HTTP 400)
  const plan = [];
  const push = (count, type) => {
    for (let i = 0; i < count; i += 1) {
      plan.push({ idx: plan.length + 1, type });
    }
  };
  push(200, "paymongo_paid_single");
  push(100, "paymongo_paid_multi");
  push(50, "paymongo_paid_retry");
  push(50, "paymongo_cancelled_expired");
  push(40, "paymongo_gateway_failure");
  push(20, "paymongo_webhook_bad_sig");
  push(20, "paymongo_webhook_amount_mismatch");
  push(20, "cod_discontinued_rejected");
  assert.equal(plan.length, TOTAL_TRANSACTIONS);
  return plan;
}

function formatMarkdownReport(summary) {
  const categoryLabels = {
    paymongo_paid_single: "Successful Online Payment — PayMongo Single-Seller (Webhook)",
    paymongo_paid_multi: "Successful Online Payment — PayMongo Multi-Seller Split (Webhook)",
    paymongo_paid_retry: "Successful Online Payment — PayMongo Delayed-Webhook Reconciliation (Retry)",
    paymongo_cancelled_expired: "Cancelled / Expired Online Payment (`PUT /payments/:reference/cancel`)",
    paymongo_gateway_failure: "Failed Online Payment — PayMongo Gateway Error (`HTTP 502` Rollback)",
    paymongo_webhook_bad_sig: "Declined / Rejected Webhook — Invalid HMAC-SHA256 Signature (`HTTP 401`)",
    paymongo_webhook_amount_mismatch: "Declined / Rejected Webhook — Tampered Amount Mismatch (`HTTP 400`)",
    cod_discontinued_rejected: "Rejected Legacy COD Checkout (`payment_method='cod'`, Discontinued `HTTP 400`)",
  };

  const categoryRows = Object.entries(summary.byCategory)
    .map(([key, c]) => {
      const rate = ((c.matched / c.total) * 100).toFixed(2);
      return `| ${categoryLabels[key] || key} | ${c.total} | ${c.matched} | ${c.mismatched} | ${c.missing} | ${c.duplicates} | ${rate}% |`;
    })
    .join("\n");

  const discrepancySection =
    summary.discrepancies.length === 0
      ? "None — `0` discrepancies, `0` missing entries, `0` mismatches, and `0` duplicate entries across all 500 simulated transactions."
      : summary.discrepancies
          .slice(0, 25)
          .map((d) => `- **Tx #${d.idx}** (\`${d.type}\`, ref \`${d.reference || "N/A"}\`): [${d.kind}] ${d.reason}`)
          .join("\n");

  const cleanupRows = Object.entries(summary.cleanupResidual)
    .map(([tbl, cnt]) => `| \`${tbl}\` | ${summary.baselineCounts[tbl] ?? "—"} | ${summary.postCleanupCounts[tbl] ?? "—"} | ${cnt} |`)
    .join("\n");

  return `# Transaction Logging Accuracy Integration Test Report

## 1. Test Metadata & Environment

| Field | Value |
| :--- | :--- |
| **Test Date (UTC)** | \`${summary.executedAt}\` |
| **Test Run Tag** | \`${summary.runTag}\` |
| **System / Repository** | ArtMatch Backend (\`backend/routes/buyer/orders.js\`, \`backend/routes/payments/paymongo.js\`) |
| **Runtime** | Node.js \`${summary.nodeVersion}\` on \`${summary.platform}\` |
| **MySQL Target** | \`${summary.dbTarget}\` (live InnoDB tables, real SQL transactions & constraints) |
| **Processing Fee Config** | \`PAYMONGO_PROCESSING_FEE_ENABLED=${summary.processingFeeEnabled}\` |
| **Total Execution Time** | \`${summary.simulationDurationMs} ms\` (500 consecutive transactions) + \`${summary.validationDurationMs} ms\` (MySQL cross-reference) |
| **Database Tables Audited** | \`marketplace_order\`, \`marketplace_order_item\`, \`seller_payment_split\`, \`audit_logs\`, \`recommendation_interaction\` |

> **Codebase Audit Note on Cash on Delivery (COD):** Inspection of the latest \`backend/routes/buyer/orders.js\` (lines 628–632) confirms that while \`marketplace_order.payment_method\` retains \`ENUM('paymongo', 'cod')\` for historical records, new COD checkouts are intentionally disabled and rejected with \`HTTP 400\` (*"Cash on Delivery is no longer available. Please select an online payment method."*). Accordingly, this suite tests **350 successful PayMongo online payments** (single-seller, multi-seller split, and delayed-webhook reconciliation) and **150 failed, cancelled, declined, or rejected payment attempts** (including **20 explicit COD rejection tests** verifying zero orphan database entries).

---

## 2. Breakdown of the 500 Simulated Transactions

| Transaction Category | Simulated | Matched | Mismatched | Missing | Duplicates | Category Accuracy |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
${categoryRows}
| **Total** | **${summary.totalSimulated}** | **${summary.accuratelyLogged}** | **${summary.mismatched}** | **${summary.missing}** | **${summary.duplicates}** | **${summary.accuracyPercent.toFixed(2)}%** |

---

## 3. MySQL Cross-Reference Verification Summary

After all **500** consecutive simulations completed, fresh \`SELECT\` queries were executed directly against MySQL (\`${summary.dbTarget}\`) to cross-reference every ground-truth transaction against persisted database state:

| Verification Check | Expected | Observed in MySQL | Status |
| :--- | ---: | ---: | :---: |
| Accurately Logged Simulated Transactions | ${summary.totalSimulated} | ${summary.accuratelyLogged} | ${summary.accuratelyLogged === summary.totalSimulated ? "PASS" : "FAIL"} |
| Persisted \`marketplace_order\` Rows (450 Paid across 350 online txns + 50 Expired + 40 Pending Rejected-Webhook) | ${summary.expectedOrdersPersisted} | ${summary.observedOrdersPersisted} | ${summary.observedOrdersPersisted === summary.expectedOrdersPersisted ? "PASS" : "FAIL"} |
| Persisted \`marketplace_order_item\` Rows | ${summary.expectedOrderItemsPersisted} | ${summary.observedOrderItemsPersisted} | ${summary.observedOrderItemsPersisted === summary.expectedOrderItemsPersisted ? "PASS" : "FAIL"} |
| Persisted \`seller_payment_split\` Rows | ${summary.expectedSplitsPersisted} | ${summary.observedSplitsPersisted} | ${summary.observedSplitsPersisted === summary.expectedSplitsPersisted ? "PASS" : "FAIL"} |
| Persisted \`audit_logs\` — \`SALE_PAYMENT_RECEIVED\` | ${summary.expectedPaidAudits} | ${summary.observedPaidAudits} | ${summary.observedPaidAudits === summary.expectedPaidAudits ? "PASS" : "FAIL"} |
| Persisted \`audit_logs\` — \`SALE_ORDER_CANCELLED\` | ${summary.expectedCancelledAudits} | ${summary.observedCancelledAudits} | ${summary.observedCancelledAudits === summary.expectedCancelledAudits ? "PASS" : "FAIL"} |
| Buyer Orders Ledger Visibility (\`GET /api/buyer/orders\`) | ${summary.expectedBuyerVisibleOrders} | ${summary.observedBuyerVisibleOrders} | ${summary.observedBuyerVisibleOrders === summary.expectedBuyerVisibleOrders ? "PASS" : "FAIL"} |
| Total Gross Paid Amount Verified (PHP) | PHP ${summary.expectedTotalPaidPhp} | PHP ${summary.observedTotalPaidPhp} | ${summary.expectedTotalPaidPhp === summary.observedTotalPaidPhp ? "PASS" : "FAIL"} |
| Rolled-Back / Rejected Orphan Records | 0 | ${summary.orphanRecordsObserved} | ${summary.orphanRecordsObserved === 0 ? "PASS" : "FAIL"} |

### Discrepancies, Missing Entries, and Errors
${discrepancySection}

---

## 4. Accuracy Formula & Final Calculation

$$\\text{Transaction Logging Accuracy (\\%)} = \\left( \\frac{\\text{Accurately Logged Transactions}}{\\text{Total Simulated Transactions (500)}} \\right) \\times 100$$

**Step-by-step substitution:**

1. $\\text{Accurately Logged Transactions} = ${summary.accuratelyLogged}$
2. $\\text{Total Simulated Transactions} = ${summary.totalSimulated}$
3. $\\text{Transaction Logging Accuracy (\\%)} = \\left( \\frac{${summary.accuratelyLogged}}{${summary.totalSimulated}} \\right) \\times 100 = \\mathbf{${summary.accuracyPercent.toFixed(2)}\\%}$

---

## 5. Pass / Fail Verdict

- **Final Verdict:** **${summary.verdict}**
- **Result:** **${summary.accuratelyLogged} / ${summary.totalSimulated} (${summary.accuracyPercent.toFixed(2)}%)** simulated transactions matched their ground-truth payment reference, exact centavo total (including processing fee apportionment and multi-seller split ledger), payment method/channel, final order & payment status, and seller \`audit_logs\` entries in MySQL with zero missing, mismatched, or duplicate records.

---

## 6. Post-Test Database Cleanup Verification

All synthetic \`${summary.runTag}\` buyer, seller, artwork, cart, order, payment split, recommendation interaction, and audit log records were removed after report validation:

| Table | Count Before Test | Count After Cleanup | Residual \`${summary.runTag}\` Rows |
| :--- | ---: | ---: | ---: |
${cleanupRows}

- **Database Cleanliness Status:** **${summary.cleanupClean ? "CLEAN (0 synthetic rows remaining; baseline counts restored identically)" : "NEEDS ATTENTION"}**
`;
}

async function main() {
  const dbCfg = resolveDbConfig();
  const dbTarget = `${dbCfg.host || "localhost"}:${dbCfg.port || 3306}/${dbCfg.database || "art_match"}`;

  console.log(`=== ArtMatch Transaction Logging Accuracy Integration Test (${TOTAL_TRANSACTIONS} Txns) ===`);
  console.log(`Run Tag: ${RUN_TAG}`);
  console.log(`MySQL Target: ${dbTarget}`);

  await ensureOrderTables();
  await ensurePaymentSplitTable();
  await ensureAuditLogsTable();

  const baselineCounts = await getTableRowCounts();
  let entities = null;
  let reportSummary = null;

  try {
    entities = await setupIsolatedTestEntities();
    const {
      customerId,
      addressId,
      cartId,
      sellerIds,
      reusableArtworks,
      pendingScenarioArtworks,
    } = entities;

    console.log(
      `Isolated fixtures created: customer_id=${customerId}, sellers=[${sellerIds.join(", ")}], artworks=${entities.allArtworkIds.length}`,
    );

    let refSequence = 0;
    let sessionSequence = 0;
    let forceGatewayFailure = false;
    const providerSessions = new Map();

    const ordersRoutes = loadRealRoute("../routes/buyer/orders.js", {
      randomUUID: () => `${RUN_TAG}-${String(++refSequence).padStart(4, "0")}`,
      getPayMongoMode: () => false,
      getPayMongoPaymentMethodTypes: async () => ["card", "gcash", "paymaya", "qrph"],
      async createPayMongoCheckoutSession(options) {
        if (forceGatewayFailure) {
          throw new paymongo.PayMongoError("Simulated PayMongo gateway outage", 502, 503);
        }
        sessionSequence += 1;
        const checkoutSessionId = `cs_${RUN_TAG}_${String(sessionSequence).padStart(4, "0")}`;
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
              id: `pi_${RUN_TAG}_${sessionSequence}`,
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
        if (!session) throw new paymongo.PayMongoError("Session not found", 404, 404);
        return structuredClone(session);
      },
      async expirePayMongoCheckoutSession(sessionId) {
        const session = providerSessions.get(sessionId);
        if (!session) throw new paymongo.PayMongoError("Session not found", 404, 404);
        session.attributes.status = "expired";
        return structuredClone(session);
      },
    });

    const paymongoRoutes = loadRealRoute("../routes/payments/paymongo.js", {
      getPayMongoMode: () => false,
      verifyPayMongoSignature: (options) =>
        paymongo.verifyPayMongoSignature({ ...options, secret: TEST_WEBHOOK_SECRET }),
    });

    const plan = buildScenarioPlan();
    const groundTruth = [];
    let pendingArtworkCursor = 0;

    const simStart = performance.now();

    for (const step of plan) {
      const { idx, type } = step;
      let selectedArtworks;
      let quantities = {};

      if (type === "paymongo_paid_multi") {
        const artA = reusableArtworks[idx % 2]; // Seller A
        const artB = reusableArtworks[2 + (idx % 2)]; // Seller B
        selectedArtworks = [artA, artB];
        quantities = { [artA.artwork_id]: (idx % 2) + 1, [artB.artwork_id]: 1 };
      } else if (type === "paymongo_webhook_bad_sig" || type === "paymongo_webhook_amount_mismatch") {
        const art = pendingScenarioArtworks[pendingArtworkCursor++];
        selectedArtworks = [art];
        quantities = { [art.artwork_id]: 1 };
      } else {
        const art = reusableArtworks[idx % reusableArtworks.length];
        selectedArtworks = [art];
        quantities = { [art.artwork_id]: (idx % 3) + 1 };
      }

      // Reset buyer cart to exact items for this transaction
      await query(`DELETE FROM cart_item WHERE add_to_id = ?`, [cartId]);
      let cartTotal = 0;
      for (const art of selectedArtworks) {
        const qty = quantities[art.artwork_id] || 1;
        cartTotal += art.price * qty;
        await query(
          `INSERT INTO cart_item (add_to_id, artwork_id, quantity) VALUES (?, ?, ?)`,
          [cartId, art.artwork_id, qty],
        );
      }
      await query(`UPDATE add_cart SET total_price = ? WHERE add_to_id = ?`, [
        Number(cartTotal.toFixed(2)),
        cartId,
      ]);

      const expectedSubtotalCentavos = selectedArtworks.reduce(
        (sum, art) => sum + Math.round(art.price * 100) * (quantities[art.artwork_id] || 1),
        0,
      );
      const expectedFeePesos = paymentSplit.calculateProcessingFee(expectedSubtotalCentavos / 100);
      const expectedFeeCentavos = Math.round(expectedFeePesos * 100);
      const expectedBuyerTotalCentavos = expectedSubtotalCentavos + expectedFeeCentavos;
      const artworkIds = selectedArtworks.map((a) => a.artwork_id);
      const channel = ["gcash", "card", "paymaya", "qrph"][idx % 4];
      const buyerUser = { customer_id: customerId };

      if (type === "paymongo_paid_single" || type === "paymongo_paid_multi") {
        forceGatewayFailure = false;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          user: buyerUser,
          body: {
            address_id: addressId,
            payment_method: "paymongo",
            artwork_ids: artworkIds,
            quantities,
          },
        });
        const reference = checkoutRes.body?.payment_reference || null;
        const sessionId = checkoutRes.body?.checkout_session_id || null;
        const paymentId = `pay_${RUN_TAG}_${String(idx).padStart(4, "0")}`;

        let webhookStatus = null;
        if (checkoutRes.status === 201 && reference && sessionId) {
          const webhookReq = buildSignedPayMongoWebhook({
            sessionId,
            referenceNumber: reference,
            paymentId,
            amountCentavos: expectedBuyerTotalCentavos,
            channel,
          });
          const webhookRes = await invoke(paymongoRoutes, "post", "/webhook", webhookReq);
          webhookStatus = webhookRes.status;
        }

        groundTruth.push({
          idx,
          type,
          reference,
          sessionId,
          paymentId,
          paymentMethod: "paymongo",
          paymentChannel: channel,
          sellerIds: selectedArtworks.map((a) => a.seller_id),
          expectedHttpStatus: 201,
          observedHttpStatus: checkoutRes.status,
          expectedSecondaryHttpStatus: 200,
          observedSecondaryHttpStatus: webhookStatus,
          expectedOrderCount: selectedArtworks.length,
          expectedSubtotalCentavos,
          expectedFeeCentavos,
          expectedBuyerTotalCentavos,
          expectedOrderStatus: "Pending",
          expectedPaymentStatus: "Paid",
          expectedSplitStatus: "Held",
          expectedAuditAction: "SALE_PAYMENT_RECEIVED",
          expectedAuditCount: selectedArtworks.length,
          expectedVisibleInOrders: true,
        });
      } else if (type === "paymongo_paid_retry") {
        forceGatewayFailure = false;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          user: buyerUser,
          body: {
            address_id: addressId,
            payment_method: "paymongo",
            artwork_ids: artworkIds,
            quantities,
          },
        });
        const reference = checkoutRes.body?.payment_reference || null;
        const sessionId = checkoutRes.body?.checkout_session_id || null;
        const paymentId = `pay_retry_${RUN_TAG}_${String(idx).padStart(4, "0")}`;

        let retryStatus = null;
        if (checkoutRes.status === 201 && reference && sessionId) {
          const prov = providerSessions.get(sessionId);
          prov.attributes.status = "completed";
          prov.attributes.payments = [
            {
              id: paymentId,
              type: "payment",
              attributes: {
                status: "paid",
                amount: expectedBuyerTotalCentavos,
                currency: "PHP",
                livemode: false,
                source: { type: channel },
                paid_at: Math.floor(Date.now() / 1000),
              },
            },
          ];
          const retryRes = await invoke(ordersRoutes, "post", "/payments/:reference/retry", {
            user: buyerUser,
            params: { reference },
          });
          retryStatus = retryRes.status;
        }

        groundTruth.push({
          idx,
          type,
          reference,
          sessionId,
          paymentId,
          paymentMethod: "paymongo",
          paymentChannel: channel,
          sellerIds: selectedArtworks.map((a) => a.seller_id),
          expectedHttpStatus: 201,
          observedHttpStatus: checkoutRes.status,
          expectedSecondaryHttpStatus: 200,
          observedSecondaryHttpStatus: retryStatus,
          expectedOrderCount: 1,
          expectedSubtotalCentavos,
          expectedFeeCentavos,
          expectedBuyerTotalCentavos,
          expectedOrderStatus: "Pending",
          expectedPaymentStatus: "Paid",
          expectedSplitStatus: "Held",
          expectedAuditAction: "SALE_PAYMENT_RECEIVED",
          expectedAuditCount: 1,
          expectedVisibleInOrders: true,
        });
      } else if (type === "paymongo_cancelled_expired") {
        forceGatewayFailure = false;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          user: buyerUser,
          body: {
            address_id: addressId,
            payment_method: "paymongo",
            artwork_ids: artworkIds,
            quantities,
          },
        });
        const reference = checkoutRes.body?.payment_reference || null;
        const sessionId = checkoutRes.body?.checkout_session_id || null;

        let cancelStatus = null;
        if (checkoutRes.status === 201 && reference) {
          const cancelRes = await invoke(ordersRoutes, "put", "/payments/:reference/cancel", {
            user: buyerUser,
            params: { reference },
          });
          cancelStatus = cancelRes.status;
        }

        groundTruth.push({
          idx,
          type,
          reference,
          sessionId,
          paymentId: null,
          paymentMethod: "paymongo",
          paymentChannel: null,
          sellerIds: selectedArtworks.map((a) => a.seller_id),
          expectedHttpStatus: 201,
          observedHttpStatus: checkoutRes.status,
          expectedSecondaryHttpStatus: 200,
          observedSecondaryHttpStatus: cancelStatus,
          expectedOrderCount: 1,
          expectedSubtotalCentavos,
          expectedFeeCentavos,
          expectedBuyerTotalCentavos,
          expectedOrderStatus: "Cancelled",
          expectedPaymentStatus: "Expired",
          expectedSplitStatus: "Held",
          expectedAuditAction: "SALE_ORDER_CANCELLED",
          expectedAuditCount: 1,
          expectedVisibleInOrders: false,
        });
      } else if (type === "paymongo_gateway_failure") {
        forceGatewayFailure = true;
        const expectedRef = `AM-${RUN_TAG}-${String(refSequence + 1).padStart(4, "0")}`;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          user: buyerUser,
          body: {
            address_id: addressId,
            payment_method: "paymongo",
            artwork_ids: artworkIds,
            quantities,
          },
        });
        forceGatewayFailure = false;

        groundTruth.push({
          idx,
          type,
          reference: expectedRef,
          sessionId: null,
          paymentId: null,
          paymentMethod: "paymongo",
          paymentChannel: null,
          sellerIds: selectedArtworks.map((a) => a.seller_id),
          expectedHttpStatus: 502,
          observedHttpStatus: checkoutRes.status,
          expectedSecondaryHttpStatus: null,
          observedSecondaryHttpStatus: null,
          expectedOrderCount: 0,
          expectedSubtotalCentavos,
          expectedFeeCentavos,
          expectedBuyerTotalCentavos,
          expectedOrderStatus: null,
          expectedPaymentStatus: null,
          expectedSplitStatus: null,
          expectedAuditAction: null,
          expectedAuditCount: 0,
          expectedVisibleInOrders: false,
        });
      } else if (
        type === "paymongo_webhook_bad_sig" ||
        type === "paymongo_webhook_amount_mismatch"
      ) {
        forceGatewayFailure = false;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          user: buyerUser,
          body: {
            address_id: addressId,
            payment_method: "paymongo",
            artwork_ids: artworkIds,
            quantities,
          },
        });
        const reference = checkoutRes.body?.payment_reference || null;
        const sessionId = checkoutRes.body?.checkout_session_id || null;
        const paymentId = `pay_rej_${RUN_TAG}_${String(idx).padStart(4, "0")}`;

        let webhookStatus = null;
        if (checkoutRes.status === 201 && reference && sessionId) {
          const webhookReq = buildSignedPayMongoWebhook({
            sessionId,
            referenceNumber: reference,
            paymentId,
            amountCentavos:
              type === "paymongo_webhook_amount_mismatch"
                ? expectedBuyerTotalCentavos - 500
                : expectedBuyerTotalCentavos,
            channel,
            invalidSignature: type === "paymongo_webhook_bad_sig",
          });
          const webhookRes = await invoke(paymongoRoutes, "post", "/webhook", webhookReq);
          webhookStatus = webhookRes.status;
        }

        groundTruth.push({
          idx,
          type,
          reference,
          sessionId,
          paymentId: null,
          paymentMethod: "paymongo",
          paymentChannel: null,
          sellerIds: selectedArtworks.map((a) => a.seller_id),
          expectedHttpStatus: 201,
          observedHttpStatus: checkoutRes.status,
          expectedSecondaryHttpStatus: type === "paymongo_webhook_bad_sig" ? 401 : 400,
          observedSecondaryHttpStatus: webhookStatus,
          expectedOrderCount: 1,
          expectedSubtotalCentavos,
          expectedFeeCentavos,
          expectedBuyerTotalCentavos,
          expectedOrderStatus: "Pending",
          expectedPaymentStatus: "Pending",
          expectedSplitStatus: "Held",
          expectedAuditAction: null,
          expectedAuditCount: 0,
          expectedVisibleInOrders: false,
        });
      } else if (type === "cod_discontinued_rejected") {
        forceGatewayFailure = false;
        const checkoutRes = await invoke(ordersRoutes, "post", "/checkout", {
          user: buyerUser,
          body: {
            address_id: addressId,
            payment_method: "cod",
            artwork_ids: artworkIds,
            quantities,
          },
        });

        groundTruth.push({
          idx,
          type,
          reference: null,
          sessionId: null,
          paymentId: null,
          paymentMethod: "cod",
          paymentChannel: null,
          sellerIds: selectedArtworks.map((a) => a.seller_id),
          expectedHttpStatus: 400,
          observedHttpStatus: checkoutRes.status,
          expectedSecondaryHttpStatus: null,
          observedSecondaryHttpStatus: null,
          expectedOrderCount: 0,
          expectedSubtotalCentavos,
          expectedFeeCentavos: 0,
          expectedBuyerTotalCentavos: expectedSubtotalCentavos,
          expectedOrderStatus: null,
          expectedPaymentStatus: null,
          expectedSplitStatus: null,
          expectedAuditAction: null,
          expectedAuditCount: 0,
          expectedVisibleInOrders: false,
        });
      }
    }

    const simulationDurationMs = Number((performance.now() - simStart).toFixed(2));
    console.log(`Completed ${groundTruth.length} simulated transactions in ${simulationDurationMs} ms.`);

    // =========================================================================
    // STEP 3: CROSS-REFERENCE AGAINST ACTUAL LIVE MYSQL DATABASE LOGS
    // =========================================================================
    const valStart = performance.now();

    const dbOrders = await query(
      `SELECT order_id, customer_id, seller_id, payment_method, payment_status,
              payment_reference, paymongo_checkout_session_id, paymongo_payment_id,
              paymongo_payment_method, paid_at, subtotal, processing_fee, total_amount, status
       FROM marketplace_order
       WHERE customer_id = ?
       ORDER BY order_id ASC`,
      [customerId],
    );
    const dbOrderIds = dbOrders.map((o) => o.order_id);
    const dbOrderItems = dbOrderIds.length
      ? await query(
          `SELECT order_item_id, order_id, artwork_id, quantity, unit_price, line_total
           FROM marketplace_order_item
           WHERE order_id IN (?)`,
          [dbOrderIds],
        )
      : [];
    const dbSplits = dbOrderIds.length
      ? await query(
          `SELECT split_id, order_id, seller_id, payment_reference, gross_amount,
                  commission_rate, commission_amount, processing_fee_amount, net_amount, payout_status
           FROM seller_payment_split
           WHERE order_id IN (?)`,
          [dbOrderIds],
        )
      : [];
    const dbAudits = await query(
      `SELECT audit_id, datetime, action, actor, role, status, information
       FROM audit_logs
       WHERE actor IN (?)
       ORDER BY audit_id ASC`,
      [sellerIds.map(String)],
    );

    // Buyer-facing orders API visibility cross-check
    const buyerVisibleRes = await invoke(ordersRoutes, "get", "/", {
      user: { customer_id: customerId },
    });
    assert.equal(buyerVisibleRes.status, 200);
    const buyerVisibleOrderIds = new Set(buyerVisibleRes.body.map((o) => Number(o.orderId)));

    // Index database records by payment_reference and order_id
    const ordersByRef = new Map();
    for (const o of dbOrders) {
      const key = o.payment_reference || "__NO_REF__";
      if (!ordersByRef.has(key)) ordersByRef.set(key, []);
      ordersByRef.get(key).push(o);
    }
    const itemsByOrderId = new Map();
    for (const item of dbOrderItems) {
      if (!itemsByOrderId.has(item.order_id)) itemsByOrderId.set(item.order_id, []);
      itemsByOrderId.get(item.order_id).push(item);
    }
    const splitsByOrderId = new Map();
    for (const sp of dbSplits) {
      if (!splitsByOrderId.has(sp.order_id)) splitsByOrderId.set(sp.order_id, []);
      splitsByOrderId.get(sp.order_id).push(sp);
    }

    const byCategory = {};
    const discrepancies = [];
    let matchedCount = 0;
    let mismatchedCount = 0;
    let missingCount = 0;
    let duplicateCount = 0;
    let expectedTotalPaidCentavos = 0;
    let observedTotalPaidCentavos = 0;

    const recordResult = (tx, statusKind, reason = "") => {
      byCategory[tx.type] ??= {
        total: 0,
        matched: 0,
        mismatched: 0,
        missing: 0,
        duplicates: 0,
      };
      byCategory[tx.type].total += 1;
      if (statusKind === "matched") {
        byCategory[tx.type].matched += 1;
        matchedCount += 1;
      } else {
        if (statusKind === "missing") {
          byCategory[tx.type].missing += 1;
          missingCount += 1;
        } else if (statusKind === "duplicate") {
          byCategory[tx.type].duplicates += 1;
          duplicateCount += 1;
        } else {
          byCategory[tx.type].mismatched += 1;
          mismatchedCount += 1;
        }
        discrepancies.push({
          idx: tx.idx,
          type: tx.type,
          reference: tx.reference,
          kind: statusKind,
          reason,
        });
      }
    };

    for (const tx of groundTruth) {
      if (tx.expectedPaymentStatus === "Paid") {
        expectedTotalPaidCentavos += tx.expectedBuyerTotalCentavos;
      }

      if (tx.observedHttpStatus !== tx.expectedHttpStatus) {
        recordResult(
          tx,
          "mismatched",
          `Checkout HTTP status ${tx.observedHttpStatus} !== expected ${tx.expectedHttpStatus}`,
        );
        continue;
      }
      if (
        tx.expectedSecondaryHttpStatus !== null &&
        tx.observedSecondaryHttpStatus !== tx.expectedSecondaryHttpStatus
      ) {
        recordResult(
          tx,
          "mismatched",
          `Secondary HTTP status ${tx.observedSecondaryHttpStatus} !== expected ${tx.expectedSecondaryHttpStatus}`,
        );
        continue;
      }

      // Case A: Rolled-back gateway failure or rejected COD (must have 0 DB rows & 0 audit logs)
      if (tx.expectedOrderCount === 0) {
        const refOrders = tx.reference ? ordersByRef.get(tx.reference) || [] : [];
        const codOrders =
          tx.paymentMethod === "cod"
            ? dbOrders.filter((o) => o.payment_method === "cod")
            : [];
        const refAudits = tx.reference
          ? dbAudits.filter((a) => String(a.information || "").includes(tx.reference))
          : [];
        if (refOrders.length > 0 || codOrders.length > 0 || refAudits.length > 0) {
          recordResult(
            tx,
            "duplicate",
            `Found orphan records for rolled-back/rejected tx (orders=${refOrders.length + codOrders.length}, audits=${refAudits.length})`,
          );
          continue;
        }
        recordResult(tx, "matched");
        continue;
      }

      // Case B: Persisted order expected (Paid, Cancelled/Expired, or Pending after rejected webhook)
      const persistedOrders = ordersByRef.get(tx.reference) || [];
      if (persistedOrders.length < tx.expectedOrderCount) {
        recordResult(
          tx,
          "missing",
          `Expected ${tx.expectedOrderCount} marketplace_order rows for ${tx.reference}, found ${persistedOrders.length}`,
        );
        continue;
      }
      if (persistedOrders.length > tx.expectedOrderCount) {
        recordResult(
          tx,
          "duplicate",
          `Expected ${tx.expectedOrderCount} marketplace_order rows for ${tx.reference}, found ${persistedOrders.length}`,
        );
        continue;
      }

      // Validate payment_method, status, payment_status, amounts, items, splits, visibility, audit logs
      let txError = null;
      let txErrorKind = "mismatched";

      const sumTotalCentavos = persistedOrders.reduce(
        (sum, o) => sum + Math.round(Number(o.total_amount) * 100),
        0,
      );
      const sumSubtotalCentavos = persistedOrders.reduce(
        (sum, o) => sum + Math.round(Number(o.subtotal) * 100),
        0,
      );
      const sumFeeCentavos = persistedOrders.reduce(
        (sum, o) => sum + Math.round(Number(o.processing_fee || 0) * 100),
        0,
      );
      if (tx.expectedPaymentStatus === "Paid") {
        observedTotalPaidCentavos += sumTotalCentavos;
      }

      if (sumTotalCentavos !== tx.expectedBuyerTotalCentavos) {
        txError = `Logged total ${sumTotalCentavos}c !== expected ${tx.expectedBuyerTotalCentavos}c`;
      } else if (sumSubtotalCentavos !== tx.expectedSubtotalCentavos) {
        txError = `Logged subtotal ${sumSubtotalCentavos}c !== expected ${tx.expectedSubtotalCentavos}c`;
      } else if (sumFeeCentavos !== tx.expectedFeeCentavos) {
        txError = `Logged processing_fee ${sumFeeCentavos}c !== expected ${tx.expectedFeeCentavos}c`;
      }

      let totalSplitGrossCentavos = 0;
      if (!txError) {
        for (const order of persistedOrders) {
          if (order.payment_method !== tx.paymentMethod) {
            txError = `Order ${order.order_id} payment_method=${order.payment_method} !== ${tx.paymentMethod}`;
            break;
          }
          if (order.status !== tx.expectedOrderStatus) {
            txError = `Order ${order.order_id} status=${order.status} !== ${tx.expectedOrderStatus}`;
            break;
          }
          if (order.payment_status !== tx.expectedPaymentStatus) {
            txError = `Order ${order.order_id} payment_status=${order.payment_status} !== ${tx.expectedPaymentStatus}`;
            break;
          }
          if (tx.expectedPaymentStatus === "Paid") {
            if (order.paymongo_payment_id !== tx.paymentId) {
              txError = `Order ${order.order_id} paymongo_payment_id=${order.paymongo_payment_id} !== ${tx.paymentId}`;
              break;
            }
            if (order.paymongo_payment_method !== tx.paymentChannel) {
              txError = `Order ${order.order_id} channel=${order.paymongo_payment_method} !== ${tx.paymentChannel}`;
              break;
            }
            if (!order.paid_at) {
              txError = `Order ${order.order_id} missing paid_at timestamp`;
              break;
            }
          }

          const isVisible = buyerVisibleOrderIds.has(Number(order.order_id));
          if (isVisible !== tx.expectedVisibleInOrders) {
            txError = `Order ${order.order_id} buyer visibility=${isVisible} !== expected ${tx.expectedVisibleInOrders}`;
            break;
          }

          const orderItems = itemsByOrderId.get(order.order_id) || [];
          if (orderItems.length !== 1) {
            txErrorKind = orderItems.length === 0 ? "missing" : "duplicate";
            txError = `Order ${order.order_id} item count=${orderItems.length} !== 1`;
            break;
          }

          const orderSplits = splitsByOrderId.get(order.order_id) || [];
          if (orderSplits.length !== 1) {
            txErrorKind = orderSplits.length === 0 ? "missing" : "duplicate";
            txError = `Order ${order.order_id} split count=${orderSplits.length} !== 1`;
            break;
          }
          const sp = orderSplits[0];
          if (sp.payout_status !== tx.expectedSplitStatus) {
            txError = `Split for order ${order.order_id} payout_status=${sp.payout_status} !== ${tx.expectedSplitStatus}`;
            break;
          }
          totalSplitGrossCentavos += Math.round(Number(sp.gross_amount) * 100);
        }
      }

      if (!txError && totalSplitGrossCentavos !== tx.expectedSubtotalCentavos) {
        txError = `Split gross sum ${totalSplitGrossCentavos}c !== expected subtotal ${tx.expectedSubtotalCentavos}c`;
      }

      // Cross-reference audit_logs entries for this payment reference
      if (!txError) {
        const refAudits = dbAudits.filter((a) =>
          String(a.information || "").includes(tx.reference),
        );
        if (refAudits.length < tx.expectedAuditCount) {
          txErrorKind = "missing";
          txError = `Expected ${tx.expectedAuditCount} audit_logs rows for ${tx.reference}, found ${refAudits.length}`;
        } else if (refAudits.length > tx.expectedAuditCount) {
          txErrorKind = "duplicate";
          txError = `Expected ${tx.expectedAuditCount} audit_logs rows for ${tx.reference}, found ${refAudits.length}`;
        } else if (tx.expectedAuditCount > 0) {
          for (const order of persistedOrders) {
            const orderTag = `AM-${String(order.order_id).padStart(6, "0")}`;
            const expectedPhp = `PHP ${Number(order.total_amount).toFixed(2)}`;
            const match = refAudits.find(
              (a) =>
                a.action === tx.expectedAuditAction &&
                String(a.actor) === String(order.seller_id) &&
                a.status === "SUCCESS" &&
                String(a.information || "").includes(orderTag) &&
                String(a.information || "").includes(tx.reference) &&
                String(a.information || "").includes(expectedPhp),
            );
            if (!match) {
              txErrorKind = "missing";
              txError = `Missing exact audit_logs (${tx.expectedAuditAction}) for ${orderTag} / ${expectedPhp}`;
              break;
            }
          }
        }
      }

      if (txError) {
        recordResult(tx, txErrorKind, txError);
      } else {
        recordResult(tx, "matched");
      }
    }

    const validationDurationMs = Number((performance.now() - valStart).toFixed(2));
    const expectedOrdersPersisted = 200 * 1 + 100 * 2 + 50 * 1 + 50 * 1 + 20 * 1 + 20 * 1; // 540
    const expectedBuyerVisibleOrders = 200 * 1 + 100 * 2 + 50 * 1; // 450
    const expectedPaidAudits = 450;
    const expectedCancelledAudits = 50;
    const observedPaidAudits = dbAudits.filter((a) => a.action === "SALE_PAYMENT_RECEIVED").length;
    const observedCancelledAudits = dbAudits.filter(
      (a) => a.action === "SALE_ORDER_CANCELLED",
    ).length;
    const orphanRecordsObserved =
      Math.max(0, dbOrders.length - expectedOrdersPersisted) +
      dbOrders.filter((o) => o.payment_method === "cod").length;
    const accuracyPercent = Number(((matchedCount / TOTAL_TRANSACTIONS) * 100).toFixed(2));

    reportSummary = {
      executedAt: new Date().toISOString(),
      runTag: RUN_TAG,
      nodeVersion: process.version,
      platform: `${process.platform} (${process.arch})`,
      dbTarget,
      processingFeeEnabled: String(process.env.PAYMONGO_PROCESSING_FEE_ENABLED || "false"),
      totalSimulated: TOTAL_TRANSACTIONS,
      accuratelyLogged: matchedCount,
      mismatched: mismatchedCount,
      missing: missingCount,
      duplicates: duplicateCount,
      accuracyPercent,
      verdict:
        matchedCount === TOTAL_TRANSACTIONS &&
        discrepancies.length === 0 &&
        dbOrders.length === expectedOrdersPersisted &&
        buyerVisibleRes.body.length === expectedBuyerVisibleOrders &&
        observedPaidAudits === expectedPaidAudits &&
        observedCancelledAudits === expectedCancelledAudits
          ? "PASSED"
          : "FAILED",
      simulationDurationMs,
      validationDurationMs,
      byCategory,
      discrepancies,
      expectedOrdersPersisted,
      observedOrdersPersisted: dbOrders.length,
      expectedOrderItemsPersisted: expectedOrdersPersisted,
      observedOrderItemsPersisted: dbOrderItems.length,
      expectedSplitsPersisted: expectedOrdersPersisted,
      observedSplitsPersisted: dbSplits.length,
      expectedPaidAudits,
      observedPaidAudits,
      expectedCancelledAudits,
      observedCancelledAudits,
      expectedBuyerVisibleOrders,
      observedBuyerVisibleOrders: buyerVisibleRes.body.length,
      expectedTotalPaidPhp: (expectedTotalPaidCentavos / 100).toFixed(2),
      observedTotalPaidPhp: (observedTotalPaidCentavos / 100).toFixed(2),
      orphanRecordsObserved,
      baselineCounts,
      cleanupResidual: {},
      postCleanupCounts: {},
      cleanupClean: false,
    };
  } finally {
    // =========================================================================
    // STEP 5: SAFE CLEANUP OF ALL SYNTHETIC TEST_RUN_<timestamp> RECORDS
    // =========================================================================
    const cleanupResidual = await cleanupTestEntities(entities);
    const postCleanupCounts = await getTableRowCounts();

    if (reportSummary && cleanupResidual) {
      reportSummary.cleanupResidual = cleanupResidual;
      reportSummary.postCleanupCounts = postCleanupCounts;
      reportSummary.cleanupClean =
        Object.values(cleanupResidual).every((cnt) => Number(cnt) === 0) &&
        Object.keys(baselineCounts).every((tbl) => baselineCounts[tbl] === postCleanupCounts[tbl]);

      const markdown = formatMarkdownReport(reportSummary);
      fs.writeFileSync(REPORT_PATH, markdown, "utf8");
      console.log(`\nReport written to: ${REPORT_PATH}`);
      console.log(JSON.stringify(reportSummary, null, 2));

      if (reportSummary.verdict !== "PASSED" || !reportSummary.cleanupClean) {
        process.exitCode = 1;
      }
    }

    await db.promise().end();
  }
}

main().catch((error) => {
  console.error("Transaction logging integration test failed:", error);
  process.exitCode = 1;
});
