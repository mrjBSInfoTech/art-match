import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const loadSellerReviewsRouter = (db) => {
  const source = fs.readFileSync(new URL("./reviews.js", import.meta.url), "utf8")
    .replace(/^import[^;]+;\s*/gm, "").replace("export default router;", "");
  const handlers = {};
  const router = {
    get: (path, authenticate, callback) => { handlers[`GET ${path}`] = callback; },
    put: (path, authenticate, callback) => { handlers[`PUT ${path}`] = callback; },
  };
  vm.runInNewContext(source, {
    express: { Router: () => router },
    db,
    authenticateSeller: () => {},
    console,
  });
  return handlers;
};

test("seller feedback includes responses and preserves seller scoping", () => {
  let query;
  let body;
  const handlers = loadSellerReviewsRouter({ query(sql, params, callback) {
    query = { sql, params };
    callback(null, [{
      review_id: 11, order_id: null, order_item_id: null, rating: 5,
      comment: "Great art", reviewer_name: "Public Buyer", artwork_id: 12,
      artwork_title: "Painting", artwork_image: "painting.jpg", created_at: "2026-10-24",
      seller_response: "Thank you!", seller_response_at: "2026-10-25",
    }]);
  } });
  handlers["GET /"]({ user: { student_id: 9 } }, { json: (value) => { body = value; } });
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
  assert.equal(body[0].sellerResponse, "Thank you!");
  assert.equal(body[0].sellerResponseAt, "2026-10-25");
});

test("seller response updates are scoped to the authenticated seller", () => {
  let query;
  let body;
  let statusCode;
  const handlers = loadSellerReviewsRouter({ query(sql, params, callback) {
    query = { sql, params };
    callback(null, { affectedRows: 1 });
  } });
  handlers["PUT /:reviewId/response"](
    {
      params: { reviewId: "11" },
      body: { response: "  Thank you for your feedback!  " },
      user: { student_id: 9 },
    },
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json(value) { body = value; },
    },
  );
  assert.match(query.sql, /WHERE review_id = \? AND seller_id = \?/);
  assert.deepEqual(Array.from(query.params), ["Thank you for your feedback!", 11, 9]);
  assert.equal(statusCode, undefined);
  assert.equal(body.response, "Thank you for your feedback!");
});

test("seller response rejects empty or overly long responses", () => {
  let queryCalled = false;
  const handlers = loadSellerReviewsRouter({ query() { queryCalled = true; } });
  let statusCode;
  let body;
  handlers["PUT /:reviewId/response"](
    { params: { reviewId: "11" }, body: { response: " " }, user: { student_id: 9 } },
    {
      status(code) {
        statusCode = code;
        return this;
      },
      json(value) { body = value; },
    },
  );
  assert.equal(queryCalled, false);
  assert.equal(statusCode, 400);
  assert.match(body.message, /1 to 600 characters/);
});
