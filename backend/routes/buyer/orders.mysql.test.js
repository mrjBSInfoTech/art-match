import assert from "node:assert/strict";
import test from "node:test";
import { databaseFixture, invoke, loadPaymentRoute, signedEvent } from "../../test/paymentHarness.js";
import { verifyPayMongoSignature } from "../../utils/paymongo.js";

test("MySQL: checkout, retry and webhook SQL compile with actual availability/approval/payment tables", {
  skip: process.env.PAYMENT_READONLY_MYSQL_TEST !== "1",
}, async () => {
  // Capture the actual route SQL via the same isolated path, then execute only
  // SELECT projections against development tables. No real checkout is created.
  const checkoutFixture = databaseFixture({ orders: [], orderItems: [] });
  const checkoutRoutes = loadPaymentRoute("../routes/buyer/orders.js", {
    ...checkoutFixture,
    getPayMongoPaymentMethodTypes: async () => ["qrph"],
    createPayMongoCheckoutSession: async ({ referenceNumber }) => ({
      checkoutSessionId: "cs_test_readonly_capture",
      checkoutUrl: "https://checkout.paymongo.com/test-readonly-capture",
      referenceNumber,
    }),
  });
  assert.equal((await invoke(checkoutRoutes, "post", "/checkout", {
    body: { address_id: 4, payment_method: "paymongo" },
  })).status, 201);
  const checkoutSql = checkoutFixture.calls.find(call => /FROM cart_item ci JOIN artwork a/i.test(call.sql || ""))?.sql;
  assert.ok(checkoutSql);

  const retryFixture = databaseFixture();
  const retryRoutes = loadPaymentRoute("../routes/buyer/orders.js", {
    ...retryFixture,
    retrievePayMongoCheckoutSession: async () => ({ id: "cs_test_checkout", attributes: {
      status: "active", reference_number: "AM-fixture-group",
      checkout_url: "https://checkout.paymongo.com/test-readonly-capture", payments: [],
    } }),
  });
  assert.equal((await invoke(retryRoutes, "post", "/payments/:reference/retry", {
    params: { reference: "AM-fixture-group" },
  })).status, 200);
  const retrySql = retryFixture.calls.find(call => /FROM marketplace_order_item oi LEFT JOIN artwork a/i.test(call.sql || ""))?.sql;
  assert.ok(retrySql);

  const webhookFixture = databaseFixture();
  const webhookRoutes = loadPaymentRoute("../routes/payments/paymongo.js", {
    ...webhookFixture,
    getPayMongoMode: () => false,
    verifyPayMongoSignature: options => verifyPayMongoSignature({ ...options, secret: "isolated-webhook-fixture" }),
  });
  assert.equal((await invoke(webhookRoutes, "post", "/webhook", signedEvent())).status, 200);
  const webhookItemsSql = webhookFixture.calls.find(call => /FROM marketplace_order_item oi LEFT JOIN artwork a/i.test(call.sql || ""))?.sql;
  const webhookPurchasesSql = webhookFixture.calls.find(call => /oi\.order_id NOT IN/i.test(call.sql || ""))?.sql;
  assert.ok(webhookItemsSql);
  assert.ok(webhookPurchasesSql);

  const { default: db } = await import("../../database/db.js");
  try {
    const [carts] = await db.promise().query("SELECT add_to_id FROM add_cart ORDER BY add_to_id LIMIT 1");
    const [orderItems] = await db.promise().query("SELECT DISTINCT order_id FROM marketplace_order_item ORDER BY order_id LIMIT 5");
    const projections = [
      [checkoutSql, [carts[0]?.add_to_id || 0]],
      [retrySql, [orderItems.length ? orderItems.map(item => item.order_id) : [0]]],
      [webhookItemsSql, [orderItems.length ? orderItems.map(item => item.order_id) : [0]]],
    ];
    for (const [sql, params] of projections) {
      assert.match(sql, /^SELECT /i);
      assert.match(sql, /FROM artupload au/i);
      assert.match(sql, /LOWER\(au\.request_status\) = 'verified'/i);
      const [rows, fields] = await db.promise().query(sql.replace(/\bFOR UPDATE\b/gi, ""), params);
      const names = fields.map(field => field.name);
      for (const required of ["artwork_id", "status", "is_verified", "stock_available"]) {
        assert.ok(names.includes(required), `Missing ${required} in production SQL projection`);
      }
      for (const row of rows) {
        assert.ok([0, 1].includes(Number(row.is_verified)));
        const [approval] = await db.promise().query(
          "SELECT COUNT(*) AS verified_count FROM artupload WHERE artwork_id = ? AND LOWER(request_status) = 'verified'",
          [row.artwork_id],
        );
        assert.equal(Number(row.is_verified), Number(approval[0].verified_count) > 0 ? 1 : 0);
      }
    }
    // Validate the exact completed-purchase recheck, including NOT IN, without
    // retaining locks or writing payment/order records.
    const [artworks] = await db.promise().query("SELECT artwork_id FROM artwork ORDER BY artwork_id LIMIT 10");
    const [purchases, purchaseFields] = await db.promise().query(
      webhookPurchasesSql.replace(/\bFOR UPDATE\b/gi, ""),
      [artworks.length ? artworks.map(art => art.artwork_id) : [0], [0]],
    );
    assert.ok(purchaseFields.some(field => field.name === "artwork_id"));
    assert.ok(purchaseFields.some(field => field.name === "quantity"));
    assert.ok(purchases.every(item => Number(item.quantity) > 0));
  } finally {
    await db.promise().end();
  }
});
