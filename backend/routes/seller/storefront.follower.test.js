import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("./storefront.js", import.meta.url), "utf8")
  .replace(/^import .*?;\s*/gm, "")
  .replace("export default router;", "");

const createRoute = (rows) => {
  const routes = new Map();
  let query;
  const db = {
    query(sql, params, callback) {
      query = { sql, params };
      callback(null, rows);
    },
  };
  const express = { Router: () => ({
    get: (path, ...handlers) => routes.set(`GET ${path}`, handlers),
    put: () => {},
  }) };
  vm.runInNewContext(source, {
    express,
    db,
    authenticateSeller: () => {},
    console,
  });
  let body;
  const response = { json(value) { body = value; return this; } };
  const handler = routes.get("GET /")[1];
  handler({ user: { student_id: 14 } }, response);
  return { body, query };
};

test("seller storefront reads the same database-backed artist follower count", () => {
  const { body, query } = createRoute([{
    storefront_id: 2,
    student_id: 14,
    follower_count: "6",
    specialties: null,
    pinned_artwork_ids: null,
  }]);
  assert.match(query.sql, /FROM customer_artist_follow caf/);
  assert.match(query.sql, /WHERE caf\.student_id = \?/);
  assert.deepEqual(Array.from(query.params), [14, 14]);
  assert.equal(body.follower_count, "6");
});

test("seller storefront without a saved storefront still reports zero followers", () => {
  const { body } = createRoute([]);
  assert.equal(body.follower_count, 0);
});
