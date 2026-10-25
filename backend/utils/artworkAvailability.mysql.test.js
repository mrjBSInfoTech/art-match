import assert from "node:assert/strict";
import test, { after } from "node:test";
import { getArtworkAvailability, getArtworkSoldOutSql, getArtworkSoldQuantitySql, getCompletedOrderCondition } from "./artworkAvailability.js";

let database;
const getDatabase = async () => {
  if (!database) database = (await import("../database/db.js")).default;
  return database;
};
after(async () => { if (database) await database.promise().end(); });

// Explicitly opt in to read-only tests against the configured development DB.
// The order matrix is made only from SELECT literals, without inserting fixtures.
test("MySQL: pending/failed/expired/refunded online is available, Paid/COD counts, Cancelled does not", {
  skip: process.env.PAYMENT_READONLY_MYSQL_TEST !== "1",
}, async () => {
  const db = await getDatabase();
    const [rows] = await db.promise().query(`SELECT o.*, ${getCompletedOrderCondition()} AS counts_as_sale
      FROM (
        SELECT 'paymongo' AS payment_method, 'Pending' AS payment_status, 'Pending' AS status, 0 AS expected
        UNION ALL SELECT 'paymongo', 'Paid', 'Pending', 1
        UNION ALL SELECT 'paymongo', 'Failed', 'Pending', 0
        UNION ALL SELECT 'paymongo', 'Expired', 'Pending', 0
        UNION ALL SELECT 'paymongo', 'Refunded', 'Delivered', 0
        UNION ALL SELECT 'paymongo', 'Paid', 'Cancelled', 0
        UNION ALL SELECT 'cod', 'Pending', 'Pending', 1
        UNION ALL SELECT 'cod', 'Paid', 'Delivered', 1
        UNION ALL SELECT 'cod', 'Pending', 'Cancelled', 0
      ) o`);
    for (const row of rows) {
      assert.equal(Number(row.counts_as_sale), row.expected,
        `${row.payment_method}/${row.payment_status}/${row.status}`);
    }

    // Parse/execute the production helper against actual tables without altering
    // any order, stock, or payment; also verify catalogue stock projection.
    const [artworks] = await db.promise().query(`SELECT a.artwork_id,
      ${getArtworkSoldQuantitySql()} AS sold_quantity,
      ${getArtworkSoldOutSql()} AS is_sold_out
      FROM artwork a LIMIT 10`);
    for (const row of artworks) {
      assert.ok(Number(row.sold_quantity) >= 0);
      assert.ok([0, 1].includes(Number(row.is_sold_out)));
    }
});

test("MySQL: stock JSON null/empty/invalid and tracked stock agree with checkout availability", {
  skip: process.env.PAYMENT_READONLY_MYSQL_TEST !== "1",
}, async () => {
  const db = await getDatabase();
  const cases = [
    { name: "no detail object", details: null },
    { name: "2D details without stock", details: { is_fragile: true } },
    { name: "inactive product field is JSON null", details: { stock_available: null } },
    { name: "inactive product field is empty", details: { stock_available: "" } },
    { name: "inactive product field is whitespace", details: { stock_available: " " } },
    { name: "invalid false boolean", details: { stock_available: false } },
    { name: "hexadecimal text is untracked", details: { stock_available: "0x10" } },
    { name: "invalid text", details: { stock_available: "unknown" } },
    { name: "invalid boolean", details: { stock_available: true } },
    { name: "invalid object", details: { stock_available: {} } },
    { name: "negative stock", details: { stock_available: -1 } },
    { name: "fractional stock", details: { stock_available: 1.5 } },
    { name: "unsafe stock integer", details: { stock_available: 9007199254740992 } },
    { name: "zero stock", details: { stock_available: 0 } },
    { name: "positive stock", details: { stock_available: 3 } },
    { name: "string stock", details: { stock_available: "3" } },
    { name: "padded numeric stock", details: { stock_available: " 3 " } },
    { name: "whole decimal text", details: { stock_available: "3.0" } },
    { name: "scientific whole text", details: { stock_available: "3e1" } },
    { name: "untracked purchased artwork", details: { stock_available: null }, sold: 1 },
    { name: "partially purchased stock", details: { stock_available: 3 }, sold: 2 },
    { name: "exhausted stock", details: { stock_available: 3 }, sold: 3 },
    { name: "manually sold flag", details: { stock_available: 3 }, markedSold: 1 },
    { name: "manual sold status", details: { stock_available: 3 }, status: "Sold" },
  ];
  // Keep the production CASE intact and supply a literal sold quantity rather
  // than inserting fake order rows into a real database.
  const expression = getArtworkSoldOutSql().replaceAll(getArtworkSoldQuantitySql(), "a.sold_quantity");
  for (const sample of cases) {
    const [rows] = await db.promise().query(`SELECT ${expression} AS is_sold_out,
      JSON_UNQUOTE(JSON_EXTRACT(a.artwork_details, '$.stock_available')) AS stock_available
      FROM (SELECT ? AS artwork_details, ? AS sold_quantity, ? AS is_sold, ? AS status) a`,
    [sample.details === null ? null : JSON.stringify(sample.details), sample.sold || 0,
      sample.markedSold || 0, sample.status || "Available"]);
    const expected = getArtworkAvailability(rows[0].stock_available, sample.sold || 0,
      Boolean(sample.markedSold) || sample.status === "Sold");
    assert.equal(Number(rows[0].is_sold_out), Number(expected.isSoldOut), sample.name);
  }
});
