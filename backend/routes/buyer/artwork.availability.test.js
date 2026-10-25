import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import {
  getArtworkSoldOutSql, getArtworkSoldQuantitySql, getCompletedOrderCondition,
} from "../../utils/artworkAvailability.js";
import { getArtworkRatingSql, getArtworkRatingSummary } from "../../utils/artworkRatings.js";

const stripImports = (name) => fs.readFileSync(new URL(name, import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replace("export default router;", "");

for (const path of ["/", "/:id", "/seller/:id"]) {
  test(`public artwork ${path} uses payment-aware stock/sales SQL`, () => {
    const routes = new Map();
    let executedSql;
    const db = { query(sql, params, callback) {
      executedSql = sql;
      (callback || params)(null, [{ artwork_id: 2 }]);
    } };
    vm.runInNewContext(stripImports("./artwork.js"), {
      express: { Router: () => ({ get: (route, handler) => routes.set(route, handler) }) },
      db, getArtworkSoldOutSql, getArtworkSoldQuantitySql, getCompletedOrderCondition,
      getArtworkRatingSql, getArtworkRatingSummary, console,
    });
    const res = { status() { return this; }, json() {}, set() {} };
    routes.get(path)({ params: { id: "2" } }, res);
    if (path === "/seller/:id") {
      assert.ok(executedSql.includes(getCompletedOrderCondition()));
      assert.match(executedSql, /o\.status = 'Delivered'/);
    } else {
      assert.ok(executedSql.includes(getArtworkSoldQuantitySql()));
      assert.ok(executedSql.includes(getArtworkSoldOutSql()));
      assert.match(executedSql, /AS is_sold_out/);
    }
  });
}

test("recommendation candidates and final hydration both exclude sold-out paid/COD purchases", async () => {
  const queries = [];
  const context = {
    express: { Router: () => ({ get() {}, post() {} }) },
    db: { promise: () => ({ async query(sql) { queries.push(sql); return [[]]; } }) },
    getArtworkSoldOutSql, getArtworkSoldQuantitySql, getArtworkRatingSql,
    process: { env: {} }, console,
  };
  vm.runInNewContext(stripImports("./recommendation.js") +
    "\nglobalThis.readCandidates = getAvailableCandidateArtworkIds; globalThis.hydrate = attachArtworkDetails;", context);
  await context.readCandidates();
  await context.hydrate([{ artwork_id: 7 }]);
  assert.equal(queries.length, 2);
  for (const sql of queries) {
    assert.ok(sql.includes(`AND ${getArtworkSoldOutSql()} = 0`));
  }
});
