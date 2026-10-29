import assert from "node:assert/strict";
import test from "node:test";
import { invoke, loadPaymentRoute } from "../../test/paymentHarness.js";

test("MySQL: voucher preview and COD/online checkout retain exact discounted snapshots in isolated tables", {
  skip: process.env.ARTMATCH_TEST_VOUCHERS_DB !== "1",
}, async () => {
  const { default: db } = await import("../../database/db.js");
  const connection = await db.promise().getConnection();
  const tables = ["seller_payment_split", "marketplace_order_item", "marketplace_order", "seller_voucher_artwork", "seller_voucher", "artupload", "artwork", "student", "customer", "address", "cart_item", "add_cart"];
  // MySQL resolves these connection-local temporary tables before real tables.
  // This test writes no real buyer, artwork, order, voucher, or payment record.
  try {
    const definitions = {
      add_cart: "add_to_id INT PRIMARY KEY, customer_id INT, total_price DECIMAL(12,2)",
      cart_item: "add_to_id INT, artwork_id INT",
      artwork: "artwork_id INT PRIMARY KEY, student_id INT, title VARCHAR(255), price DECIMAL(12,2), image VARCHAR(255), artwork_details JSON, is_sold TINYINT DEFAULT 0, status VARCHAR(30)",
      artupload: "artwork_id INT, request_status VARCHAR(30)",
      student: "student_id INT PRIMARY KEY, first_name VARCHAR(100), last_name VARCHAR(100)",
      customer: "customer_id INT PRIMARY KEY, first_name VARCHAR(100), last_name VARCHAR(100), email VARCHAR(255)",
      address: "address_id INT PRIMARY KEY, customer_id INT, street_name VARCHAR(255), barangay VARCHAR(100), city VARCHAR(100), province VARCHAR(100), region VARCHAR(100), postal_code VARCHAR(20)",
      seller_voucher: "voucher_id INT PRIMARY KEY, student_id INT, code VARCHAR(20), discount_type VARCHAR(20), discount_value DECIMAL(12,2), minimum_purchase DECIMAL(12,2), starts_on DATE, expires_on DATE, applies_to_all TINYINT",
      seller_voucher_artwork: "voucher_id INT, artwork_id INT",
      marketplace_order: `order_id INT AUTO_INCREMENT PRIMARY KEY, customer_id INT, seller_id INT,
        buyer_name VARCHAR(201), buyer_email VARCHAR(255), payment_method VARCHAR(30), payment_status VARCHAR(30), payment_reference VARCHAR(100),
        shipping_street VARCHAR(255), shipping_barangay VARCHAR(100), shipping_city VARCHAR(100), shipping_province VARCHAR(100), shipping_region VARCHAR(100), shipping_postal_code VARCHAR(20),
        subtotal DECIMAL(12,2), original_subtotal DECIMAL(12,2), discount_amount DECIMAL(12,2) DEFAULT 0, voucher_code VARCHAR(20),
        shipping_fee DECIMAL(12,2) DEFAULT 0, total_amount DECIMAL(12,2), status VARCHAR(30) DEFAULT 'Pending',
        paymongo_checkout_session_id VARCHAR(100), paymongo_checkout_url VARCHAR(2048)`,
      marketplace_order_item: "order_item_id INT AUTO_INCREMENT PRIMARY KEY, order_id INT, artwork_id INT, title VARCHAR(255), artist_name VARCHAR(201), image VARCHAR(255), unit_price DECIMAL(12,2), original_unit_price DECIMAL(12,2), quantity INT",
      seller_payment_split: "split_id INT AUTO_INCREMENT PRIMARY KEY, order_id INT UNIQUE, seller_id INT, payment_reference VARCHAR(100), gross_amount DECIMAL(12,2), commission_rate DECIMAL(6,4), commission_amount DECIMAL(12,2), processing_fee_amount DECIMAL(12,2), net_amount DECIMAL(12,2), payout_status VARCHAR(30)",
    };
    for (const [name, columns] of Object.entries(definitions)) {
      await connection.query(`CREATE TEMPORARY TABLE ${name} (${columns}) ENGINE=InnoDB`);
    }
    await connection.query("INSERT INTO add_cart VALUES (1,1,300),(2,2,100)");
    await connection.query("INSERT INTO cart_item VALUES (1,20),(1,21),(2,20)");
    await connection.query("INSERT INTO student VALUES (5,'First','Seller'),(7,'Other','Seller')");
    await connection.query("INSERT INTO customer VALUES (1,'Test','Buyer','buyer@example.invalid')");
    await connection.query("INSERT INTO address VALUES (4,1,'Test Street','Test Barangay','Test City','Test Province','Test Region','1000')");
    await connection.query("INSERT INTO artwork (artwork_id,student_id,title,price,image,artwork_details,status) VALUES (20,5,'Voucher artwork',100,'test-a.webp',JSON_OBJECT('stock_available',10),'Available'),(21,7,'Other seller artwork',200,'test-b.webp',JSON_OBJECT('stock_available',10),'Available')");
    await connection.query("INSERT INTO artupload VALUES (20,'Verified'),(21,'Verified')");
    await connection.query("INSERT INTO seller_voucher VALUES (1,5,'SAVE10','percentage',10,100,CURRENT_DATE(),DATE_ADD(CURRENT_DATE(),INTERVAL 1 DAY),1)");
    const executor = { query: connection.query.bind(connection),
      beginTransaction: connection.beginTransaction.bind(connection), commit: connection.commit.bind(connection), rollback: connection.rollback.bind(connection), release() {} };
    const sessions = [];
    const routes = loadPaymentRoute("../routes/buyer/orders.js", {
      db: { promise: () => ({ query: executor.query, getConnection: async () => executor }) },
      recordRecommendationInteraction: async () => {},
      getPayMongoPaymentMethodTypes: async () => ["card", "gcash", "paymaya", "qrph"],
      createPayMongoCheckoutSession: async (options) => {
        sessions.push(options);
        return { checkoutSessionId: "cs_test_database_stub", checkoutUrl: "https://checkout.paymongo.com/test-database-stub" };
      },
    });
    const request = { body: { voucher_code: "save10", artwork_ids: [20,21], address_id: 4, payment_method: "cod" } };
    const preview = await invoke(routes, "post", "/vouchers/validate", request);
    assert.equal(preview.status, 200, preview.body?.message);
    assert.equal(preview.body.discount_amount, 10);
    assert.equal(preview.body.total, 290);
    const cod = await invoke(routes, "post", "/checkout", request);
    assert.equal(cod.status, 201, cod.body?.message);
    const [orders] = await connection.query("SELECT seller_id,subtotal,original_subtotal,discount_amount,voucher_code,total_amount FROM marketplace_order ORDER BY seller_id");
    assert.deepEqual(orders.map(row => [row.seller_id, Number(row.subtotal), Number(row.original_subtotal), Number(row.discount_amount), row.voucher_code, Number(row.total_amount)]), [[5,90,100,10,"SAVE10",90],[7,200,200,0,null,200]]);
    const [items] = await connection.query("SELECT artwork_id,unit_price,original_unit_price FROM marketplace_order_item ORDER BY artwork_id");
    assert.deepEqual(items.map(row => [row.artwork_id, Number(row.unit_price), Number(row.original_unit_price)]), [[20,90,100],[21,200,200]]);
    const [splits] = await connection.query("SELECT gross_amount,net_amount FROM seller_payment_split ORDER BY seller_id");
    assert.deepEqual(splits.map(row => [Number(row.gross_amount),Number(row.net_amount)]), [[90,90],[200,200]]);
    assert.equal(sessions.length, 0);
    const [remaining] = await connection.query("SELECT add_to_id,artwork_id FROM cart_item ORDER BY add_to_id");
    assert.deepEqual(remaining.map(row => [row.add_to_id,row.artwork_id]), [[2,20]]);

    // New isolated online attempt; every provider operation is a local stub.
    for (const name of ["seller_payment_split", "marketplace_order_item", "marketplace_order"]) await connection.query(`DELETE FROM ${name}`);
    await connection.query("INSERT INTO cart_item VALUES (1,20),(1,21)");
    request.body.payment_method = "paymongo";
    const online = await invoke(routes, "post", "/checkout", request);
    assert.equal(online.status, 201, online.body?.message);
    assert.equal(sessions.length, 1);
    assert.deepEqual(sessions[0].lineItems.map(row => row.amount), [9000,20000]);
    assert.equal(sessions[0].lineItems.reduce((sum,row) => sum + row.amount * row.quantity, 0), 29000);
    const [onlineTotal] = await connection.query("SELECT SUM(total_amount) AS total FROM marketplace_order");
    assert.equal(Number(onlineTotal[0].total), 290);

    // Active DATE boundaries use the database clock and restricted subtotals.
    await connection.query("UPDATE seller_voucher SET minimum_purchase=100.01");
    const rejectedMinimum = await invoke(routes, "post", "/vouchers/validate", request);
    assert.equal(rejectedMinimum.status,400);
    assert.equal(rejectedMinimum.body.code,"voucher_invalid");
    await connection.query("UPDATE seller_voucher SET minimum_purchase=0, starts_on=DATE_ADD(CURRENT_DATE(),INTERVAL 1 DAY)");
    assert.equal((await invoke(routes,"post","/vouchers/validate",request)).status,400);
    await connection.query("UPDATE seller_voucher SET starts_on=CURRENT_DATE(), expires_on=DATE_SUB(CURRENT_DATE(),INTERVAL 1 DAY)");
    assert.equal((await invoke(routes,"post","/vouchers/validate",request)).status,400);
  } finally {
    await connection.rollback().catch(() => {});
    for (const table of tables) await connection.query(`DROP TEMPORARY TABLE IF EXISTS ${table}`).catch(() => {});
    connection.release();
    await db.promise().end();
  }
});
