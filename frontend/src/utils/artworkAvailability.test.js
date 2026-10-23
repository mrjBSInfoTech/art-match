import assert from "node:assert/strict";
import test from "node:test";
import { isArtworkSoldOut } from "./artworkAvailability.js";

test("recognizes sold-out boolean and string API values", () => {
  for (const value of [true, 1, "1", "true", "sold out", "sold_out", "unavailable"]) {
    assert.equal(isArtworkSoldOut({ is_sold_out: value }), true);
  }
  assert.equal(isArtworkSoldOut({ is_sold_out: 0, availability: "Available" }), false);
});

test("uses stock remaining when inventory details are available", () => {
  assert.equal(
    isArtworkSoldOut({ stock_available: "2", sold_quantity: "1", is_sold_out: 0 }),
    false,
  );
  assert.equal(
    isArtworkSoldOut({ stock_available: 2, sold_quantity: 2, is_sold_out: 0 }),
    true,
  );
  assert.equal(isArtworkSoldOut({ stock_available: 0, sold_quantity: 0 }), true);
});

test("recognizes legacy sold state even when stock remains", () => {
  assert.equal(isArtworkSoldOut({ stock_available: 5, status: "Sold" }), true);
  assert.equal(isArtworkSoldOut({ is_sold: 1 }), true);
});
