// Read-only verification of the installed return schema and normal API startup.
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import db from "../database/db.js";

const database = db.promise();
const query = async (sql, params = []) => (await database.query(sql, params))[0];
try {
  const deliveryColumns = await query("SHOW COLUMNS FROM marketplace_order LIKE 'delivered_at'");
  assert.equal(deliveryColumns.length, 1);
  assert.match(deliveryColumns[0].Type, /^datetime/i);
  const tables = {};
  for (const table of ["marketplace_return_request", "marketplace_return_item"]) {
    tables[table] = {
      columns: await query(`SHOW COLUMNS FROM ${table}`),
      indexes: await query(`SHOW INDEX FROM ${table}`),
    };
  }
  const foreignKeys = await query(`SELECT TABLE_NAME, COLUMN_NAME,
      REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
      AND TABLE_NAME IN ('marketplace_return_request', 'marketplace_return_item')
    ORDER BY TABLE_NAME, COLUMN_NAME`);
  assert.equal(foreignKeys.length, 6);
  const duplicates = await query(`SELECT ri.order_item_id, COUNT(*) AS conflicts
    FROM marketplace_return_item ri
    JOIN marketplace_return_request r USING (return_request_id)
    WHERE r.status IN ('Requested', 'Approved', 'Return Shipped', 'Received', 'Completed')
    GROUP BY ri.order_item_id HAVING COUNT(*) > 1`);
  assert.equal(duplicates.length, 0);
  const orders = await query("SELECT order_id, status, delivered_at FROM marketplace_order ORDER BY order_id DESC LIMIT 5");
  const requests = await query(`SELECT return_request_id, order_id, conversation_id, customer_id, seller_id,
      reason, status, requested_at, decision_at, return_shipped_at, received_at, completed_at
    FROM marketplace_return_request ORDER BY return_request_id DESC LIMIT 5`);
  const items = await query("SELECT * FROM marketplace_return_item ORDER BY return_item_id DESC LIMIT 5");
  const fixtureCounts = await query(`SELECT
    (SELECT COUNT(*) FROM customer WHERE username REGEXP '^rtest_[a-f0-9]{16}_[01]$') AS buyers,
    (SELECT COUNT(*) FROM student WHERE student_number REGEXP '^rtest_[a-f0-9]{16}_[01]$') AS sellers`);
  assert.equal(Number(fixtureCounts[0].buyers), 0, "Return fixture buyers remain; inspect cleanup before completing");
  assert.equal(Number(fixtureCounts[0].sellers), 0, "Return fixture sellers remain; inspect cleanup before completing");
  const http = [];
  for (const [path, expected] of [
    ["/", 200], ["/api/buyer/returns", 401], ["/api/seller/returns", 401],
    ["/api/buyer/orders", 401], ["/api/seller/orders", 401],
    ["/api/buyer/event", 200], ["/api/buyer/artworks", 200],
  ]) {
    const response = await fetch(`http://localhost:5000${path}`, { signal: AbortSignal.timeout(15000) });
    http.push({ path, status: response.status });
    assert.equal(response.status, expected, `Unexpected status at ${path}`);
    await response.body?.cancel();
  }
  const directory = new URL("../.cache/", import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("returns-schema-verification.json", directory), JSON.stringify({
    deliveryColumns, tables, foreignKeys, orders, requests, items, fixtureCounts, http,
    duplicateActiveOrCompletedItems: duplicates.length,
  }, null, 2));
  console.log(JSON.stringify({ result: "PASS", returnTables: Object.keys(tables), foreignKeys: foreignKeys.length,
    duplicateActiveOrCompletedItems: duplicates.length, remainingTestAccounts: fixtureCounts[0], http,
    evidence: "backend/.cache/returns-schema-verification.json" }));
} finally { await database.end(); }
