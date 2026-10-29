import assert from "node:assert/strict";
import test from "node:test";
import { CheckoutVoucherError, normalizeCheckoutVoucherCode, priceCheckoutItems, quoteCheckoutVoucher } from "./checkoutVouchers.js";
import { buildPaymentSplit, validateSplits } from "./paymentSplit.js";

const item = (artwork_id, student_id, price) => ({ artwork_id, student_id, price });
const voucher = (overrides = {}) => ({ voucher_id: 1, student_id: 5, code: "SAVE10", discount_type: "percentage", discount_value: "10.00", minimum_purchase: "100.00", applies_to_all: 1, is_active: 1, ...overrides });

test("codes are normalized consistently and non-string/malformed codes rejected", () => {
  assert.equal(normalizeCheckoutVoucherCode(" save-10 "), "SAVE-10");
  assert.equal(normalizeCheckoutVoucherCode(undefined, { optional: true }), null);
  for (const code of [undefined, 1, {}, "", "a", "OOPS!", "a".repeat(21)]) {
    assert.throws(() => normalizeCheckoutVoucherCode(code), CheckoutVoucherError);
  }
});

test("percentage discounts apply only to the issuing seller and do not alter input prices", () => {
  const items = [item(1, 5, "300.00"), item(2, 7, "500.00"), item(3, 5, "100.00")];
  const original = structuredClone(items);
  const quote = priceCheckoutItems(items, voucher());
  assert.deepEqual(quote.items.map(row => row.chargedCentavos), [27000, 50000, 9000]);
  assert.deepEqual(quote.summary, { voucher: { voucher_id: 1, student_id: 5, code: "SAVE10", discount_type: "percentage", discount_value: 10 }, subtotal: 900, eligible_subtotal: 400, minimum_purchase: 100, discount_amount: 40, total: 860 });
  assert.deepEqual(items, original);
});

test("minimum purchase excludes other sellers, unchecked listings and restricted-out listings", () => {
  const items = [item(1, 5, "99.99"), item(2, 7, "900.00"), item(3, 5, "700.00")];
  assert.throws(() => priceCheckoutItems(items, voucher({ applies_to_all: 0 }), [1]), /at least ₱100\.00.*₱99\.99/);
  assert.equal(priceCheckoutItems([item(1, 5, "100.00")], voucher()).summary.discount_amount, 10);
  assert.throws(() => priceCheckoutItems([item(2, 7, "1000.00")], voucher()), /does not apply/);
  assert.throws(() => priceCheckoutItems([item(1, 5, "1000.00")], voucher({ applies_to_all: 0 }), [3]), /does not apply/);
});

test("fixed discount allocations preserve every cent with deterministic artwork-ID ties", () => {
  const v = voucher({ discount_type: "fixed", discount_value: "0.01", minimum_purchase: 0 });
  const items = [item(3, 5, 1), item(1, 5, 1), item(2, 5, 1)];
  const quote = priceCheckoutItems(items, v);
  assert.deepEqual(quote.items.map(row => row.discountCentavos), [0, 1, 0]);
  const reversed = priceCheckoutItems([...items].reverse(), v);
  assert.deepEqual(Object.fromEntries(quote.items.map(row => [row.artworkId, row.chargedCentavos])), Object.fromEntries(reversed.items.map(row => [row.artworkId, row.chargedCentavos])));
  assert.equal(quote.items.reduce((sum, row) => sum + row.chargedCentavos, 0), 299);
});

test("large and fractional percentage prices retain exact totals and seller split invariants", () => {
  const quote = priceCheckoutItems([item(1, 5, "9999999999.99"), item(2, 5, "123456789.12"), item(3, 7, "0.01")], voucher({ discount_value: "12.34" }));
  assert.equal(quote.items.reduce((sum, row) => sum + row.discountCentavos, 0), Math.round(quote.summary.discount_amount * 100));
  const orders = [5, 7].map((sellerId, index) => ({ orderId: index + 1, sellerId, total: quote.items.filter(row => row.student_id === sellerId).reduce((sum, row) => sum + row.chargedCentavos, 0) / 100 }));
  const { splits, totals } = buildPaymentSplit(orders);
  assert.deepEqual(validateSplits(splits, totals, quote.summary.total), []);
});

test("inactive, freebie, invalid and free-artwork discounts fail rather than creating payable mismatches", () => {
  const items = [item(1, 5, "100.00")];
  for (const overrides of [{ is_active: 0 }, { discount_type: "freebie" }, { discount_type: "percentage", discount_value: 101 }, { discount_type: "fixed", discount_value: 0 }, { discount_type: "fixed", discount_value: 100 }, { discount_type: "percentage", discount_value: 100 }]) {
    assert.throws(() => priceCheckoutItems(items, voucher(overrides)), CheckoutVoucherError);
  }
  assert.throws(() => priceCheckoutItems([item(1, 5, ".01"), item(2, 5, 100)], voucher()), CheckoutVoucherError);
  assert.throws(() => priceCheckoutItems([item(1, 5, "0.01"), item(2, 5, 100)], voucher({ discount_value: 99 })), /would make an artwork free/);
});

test("quote re-reads SQL active-date flags and selected listing restrictions under requested locks", async () => {
  const calls = [];
  const executor = { query: async (sql, values) => {
    calls.push({ sql, values });
    return /FROM seller_voucher_artwork/.test(sql) ? [[{ artwork_id: 1 }]] : [[voucher({ applies_to_all: 0 })]];
  } };
  const quote = await quoteCheckoutVoucher(executor, [item(1, 5, "100.00"), item(2, 5, "200.00")], " save10 ", { lock: true });
  assert.equal(quote.summary.discount_amount, 10);
  assert.equal(quote.summary.total, 290);
  assert.deepEqual(calls[0].values, ["SAVE10"]);
  assert.match(calls[0].sql, /starts_on <= CURRENT_DATE\(\) AND expires_on >= CURRENT_DATE\(\)/);
  assert.ok(calls.every(call => /FOR UPDATE$/.test(call.sql)));
});

test("missing and ambiguous active codes are rejected and absent codes require no voucher lookup", async () => {
  const items = [item(1, 5, "100.00")];
  for (const rows of [[], [voucher({ is_active: 0 })], [voucher(), voucher({ voucher_id: 2 })]]) {
    await assert.rejects(quoteCheckoutVoucher({ query: async () => [rows] }, items, "SAVE10"), CheckoutVoucherError);
  }
  const quote = await quoteCheckoutVoucher({ query() { throw new Error("unexpected query"); } }, items, undefined);
  assert.equal(quote.summary.discount_amount, 0);
  assert.equal(quote.summary.total, 100);
});
