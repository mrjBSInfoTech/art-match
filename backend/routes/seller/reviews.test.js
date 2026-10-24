import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

test("seller feedback includes public comments without order links and preserves seller scoping", () => {
  const source = fs.readFileSync(new URL("./reviews.js", import.meta.url), "utf8")
    .replace(/^import[^;]+;\s*/gm, "").replace("export default router;", "");
  let handler;
  let query;
  let body;
  const router = { get: (path, authenticate, callback) => { handler = callback; } };
  const db = { query(sql, params, callback) {
    query = { sql, params };
    callback(null, [{
      review_id: 11, order_id: null, order_item_id: null, rating: 5,
      comment: "Great art", reviewer_name: "Public Buyer", artwork_id: 12,
      artwork_title: "Painting", artwork_image: "painting.jpg", created_at: "2026-10-24",
    }]);
  } };
  vm.runInNewContext(source, { express: { Router: () => router }, db, authenticateSeller: () => {}, console });
  handler({ user: { student_id: 9 } }, { json: (value) => { body = value; } });
  assert.deepEqual(Array.from(query.params), [9]);
  assert.match(query.sql, /WHERE r\.seller_id = \?/);
  assert.match(query.sql, /LEFT JOIN marketplace_order o/);
  assert.match(query.sql, /LEFT JOIN marketplace_order_item oi/);
  assert.match(query.sql, /LEFT JOIN customer c/);
  assert.match(query.sql, /LEFT JOIN artwork a/);
  assert.match(query.sql, /COALESCE\(oi\.title, a\.title\)/);
  assert.equal(body[0].orderId, null);
  assert.equal(body[0].orderItemId, null);
  assert.equal(body[0].reviewerName, "Public Buyer");
  assert.equal(body[0].artworkTitle, "Painting");
});
