import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import {
  getArtworkSoldOutSql, getArtworkSoldQuantitySql, getCompletedOrderCondition,
} from "../../utils/artworkAvailability.js";
import { getArtworkRatingSql, getArtworkRatingSummary } from "../../utils/artworkRatings.js";
import { enrichArtworksWithOptionStock } from "../../utils/inventoryStock.js";

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
      getArtworkRatingSql, getArtworkRatingSummary, enrichArtworksWithOptionStock, console,
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
