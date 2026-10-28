import test from "node:test";
import assert from "node:assert/strict";
import db from "../database/db.js";
import { getAdminDashboard } from "../utils/adminDashboard.js";

test("dashboard SQL counts paid quantities once per order and excludes unsuccessful payments", {
  skip: process.env.ARTMATCH_TEST_DASHBOARD_DB !== "1",
}, async () => {
  const connection = await db.promise().getConnection();
  const tables = ["marketplace_order_item", "marketplace_order", "artupload", "artwork"];
  try {
    // Connection-local temporary tables shadow real tables without touching user data.
    await connection.query("CREATE TEMPORARY TABLE artwork (artwork_id INT PRIMARY KEY)");
    await connection.query("CREATE TEMPORARY TABLE artupload (artwork_id INT, request_status VARCHAR(30))");
    await connection.query(`CREATE TEMPORARY TABLE marketplace_order (order_id INT PRIMARY KEY,
      payment_status VARCHAR(20),status VARCHAR(20),subtotal DECIMAL(12,2),
      paid_at DATETIME,delivered_at DATETIME,created_at DATETIME)`);
    await connection.query("CREATE TEMPORARY TABLE marketplace_order_item (order_id INT, quantity INT)");
    const empty = await getAdminDashboard(connection);
    assert.equal(empty.totalArtworks, 0);
    assert.equal(empty.totalSales, 0);
    assert.equal(empty.soldCount, 0);
    assert.equal(empty.monthlySales.length, 12);
    assert.ok(empty.monthlySales.every(month => month.sales === 0));

    await connection.query("INSERT INTO artwork VALUES (1),(2),(3),(4)");
    await connection.query("INSERT INTO artupload VALUES (1,'verified'),(2,'unverified'),(3,'rejected'),(1,'verified')");
    await connection.query(`INSERT INTO marketplace_order VALUES
      (1,'Paid','Packed',300,CURRENT_TIMESTAMP,NULL,CURRENT_TIMESTAMP),
      (2,'Paid','Delivered',200,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
      (3,'Pending','Pending',900,NULL,NULL,CURRENT_TIMESTAMP),
      (4,'Paid','Cancelled',800,CURRENT_TIMESTAMP,NULL,CURRENT_TIMESTAMP),
      (5,'Refunded','Delivered',700,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
      (6,'Failed','Pending',600,NULL,NULL,CURRENT_TIMESTAMP),
      (7,'Paid','Delivered',100,DATE_SUB(MAKEDATE(YEAR(CURRENT_DATE),1),INTERVAL 1 DAY),NULL,CURRENT_TIMESTAMP)`);
    await connection.query("INSERT INTO marketplace_order_item VALUES (1,2),(1,1),(2,1),(3,1),(4,1),(5,1),(6,1),(7,1)");
    const result = await getAdminDashboard(connection);
    assert.equal(result.totalArtworks, 4);
    assert.equal(result.pendingArtworks, 2);
    assert.equal(result.soldCount, 5);
    assert.equal(result.totalSales, 600);
    assert.equal(result.monthlySales.reduce((sum, month) => sum + month.sales, 0), 500);
  } finally {
    for (const table of tables) await connection.query(`DROP TEMPORARY TABLE IF EXISTS ${table}`);
    connection.release();
  }
});
test.after(async () => { await db.promise().end(); });
