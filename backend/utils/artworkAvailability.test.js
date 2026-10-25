import assert from "node:assert/strict";
import test from "node:test";
import {
  getArtworkAvailability,
  getArtworkSoldOutSql,
  getArtworkSoldQuantitySql,
  getCompletedOrderCondition,
} from "./artworkAvailability.js";

test("stock-tracked artwork stays available until all units are purchased", () => {
  assert.deepEqual(getArtworkAvailability("3", 2), {
    hasStockTracking: true,
    remainingStock: 1,
    isSoldOut: false,
  });
});

test("zero stock and fully purchased stock are sold out", () => {
  assert.equal(getArtworkAvailability(0, 0).isSoldOut, true);
  assert.deepEqual(getArtworkAvailability(4, 4), {
    hasStockTracking: true,
    remainingStock: 0,
    isSoldOut: true,
  });
});

test("stock becomes available again when cancelled quantities are excluded", () => {
  assert.equal(getArtworkAvailability(1, 0).isSoldOut, false);
});

test("artwork without stock tracking becomes sold out after purchase", () => {
  assert.equal(getArtworkAvailability(null, 0).isSoldOut, false);
  assert.equal(getArtworkAvailability(null, 1).isSoldOut, true);
});

test("legacy sold marker overrides available stock", () => {
  assert.equal(getArtworkAvailability(5, 0, true).isSoldOut, true);
});

test("only numeric decimal/exponent stock values enable inventory tracking", () => {
  for (const stock of [null, undefined, "", " ", "\t\n", false, true, "0x10", "0b10", "unknown", -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.deepEqual(getArtworkAvailability(stock, 0), {
      hasStockTracking: false, remainingStock: null, isSoldOut: false,
    }, String(stock));
    assert.equal(getArtworkAvailability(stock, 1).isSoldOut, true);
    assert.deepEqual(getArtworkAvailability(stock, 0, true), {
      hasStockTracking: false, remainingStock: 0, isSoldOut: true,
    });
  }
  for (const stock of [3, "3", " 3 ", "3.0", "3e0", "+3"]) {
    assert.deepEqual(getArtworkAvailability(stock, 2), {
      hasStockTracking: true, remainingStock: 1, isSoldOut: false,
    });
  }
});

test("all stock SQL uses the same payment-aware sale condition", () => {
  const condition = getCompletedOrderCondition("availability_order");
  assert.match(condition, /status <> 'Cancelled'/);
  assert.match(condition, /payment_method = 'cod'/);
  assert.match(condition, /payment_method = 'paymongo' AND availability_order\.payment_status = 'Paid'/);
  assert.ok(getArtworkSoldQuantitySql().includes(condition));
  assert.ok(getArtworkSoldOutSql().includes(condition));
  assert.match(getArtworkSoldOutSql(), /stock_available/);
});

test("SQL helpers reject invalid aliases rather than interpolating input", () => {
  for (const unsafe of ["a; DROP TABLE artwork", "a.b", "", "a -- comment"]) {
    assert.throws(() => getCompletedOrderCondition(unsafe), TypeError);
    assert.throws(() => getArtworkSoldQuantitySql(unsafe), TypeError);
    assert.throws(() => getArtworkSoldOutSql(unsafe), TypeError);
  }
});
