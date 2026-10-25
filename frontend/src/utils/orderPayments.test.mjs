import test from "node:test";
import assert from "node:assert/strict";
import {
  canFulfillOrder,
  canResumePayment,
  getPaymentLabel,
  getPaymentMethodLabel,
  getPaymentReturnNotice,
  isSellerSale,
  isPlacedOrder,
} from "./orderPayments.js";
import { getSellerSalesData } from "./sellerSales.js";

const online = (paymentStatus = "Pending", extra = {}) => ({
  orderId: 1, payment: "paymongo", paymentStatus, paymentReference: "AM-first",
  status: "Pending", date: "2026-10-25T12:00:00Z", subtotal: 1000,
  items: [{ title: "Artwork", qty: 1, price: 1000 }], ...extra,
});

test("placed purchases exclude unpaid attempts while paid, refunded and COD history remain visible", () => {
  for (const paymentStatus of ["Pending", "Failed", "Expired", ""]) {
    assert.equal(isPlacedOrder(online(paymentStatus)), false);
    assert.equal(isPlacedOrder(online(paymentStatus, { status: "Cancelled" })), false);
  }
  for (const paymentStatus of ["Paid", "Refunded"]) {
    assert.equal(isPlacedOrder(online(paymentStatus)), true);
    assert.equal(isPlacedOrder(online(paymentStatus, { status: "Cancelled" })), true);
  }
  assert.equal(isPlacedOrder({ payment: "cod", paymentStatus: "Pending" }), true);
});

test("unpaid online orders are read-only and excluded from every sales metric", () => {
  const unpaid = ["Pending", "Failed", "Expired", "Refunded", ""].map((status) => online(status));
  for (const order of unpaid) {
    assert.equal(canFulfillOrder(order), false);
    assert.equal(isSellerSale(order), false);
  }
  assert.equal(canFulfillOrder({ payment: "unexpected", paymentStatus: "Paid" }), false);
  const result = getSellerSalesData(unpaid, new Date("2026-10-25T12:00:00Z"));
  assert.equal(result.orderCount, 0);
  assert.equal(result.revenue, 0);
  assert.equal(result.currentMonthSales, 0);
  assert.equal(result.averageOrder, 0);
  assert.deepEqual(result.bestSellers, []);
  assert.deepEqual(result.recentSales, []);
  assert.equal(result.monthlySales.every((month) => month.sales === 0), true);
});

test("paid PayMongo and existing COD policy count, cancelled orders never count", () => {
  const paid = online("Paid");
  const cod = { ...online(), payment: "cod", subtotal: 500, items: [{ title: "COD artwork", price: 500, qty: 1 }] };
  assert.equal(canFulfillOrder(paid), true);
  assert.equal(canFulfillOrder(cod), true);
  assert.equal(isSellerSale({ ...paid, status: "Cancelled" }), false);
  assert.equal(canFulfillOrder({ ...paid, status: "Cancelled" }), false);
  assert.equal(isSellerSale({ ...cod, status: "Cancelled" }), false);
  const result = getSellerSalesData([paid, cod, online("Pending"), { ...paid, status: "Cancelled" }], new Date("2026-10-25T12:00:00Z"));
  assert.equal(result.orderCount, 2);
  assert.equal(result.revenue, 1500);
  assert.equal(result.currentMonthSales, 1500);
  assert.equal(result.averageOrder, 750);
  assert.equal(result.recentSales.length, 2);
  assert.equal(result.bestSellers.reduce((sum, artwork) => sum + artwork.sold, 0), 2);
});

test("payment labels distinguish payment state, fulfillment and safe channel names", () => {
  for (const [status, label] of Object.entries({ Pending: "Awaiting Payment", Paid: "Paid", Failed: "Payment Failed", Expired: "Payment Expired", Refunded: "Refunded" })) {
    assert.equal(getPaymentLabel(online(status)), label);
  }
  assert.equal(getPaymentLabel({ payment: "cod", paymentStatus: "Pending" }), "Cash on Delivery");
  for (const [channel, label] of Object.entries({ gcash: "GCash", paymaya: "Maya", card: "Card", qrph: "QR Ph", dob: "dob" })) {
    assert.equal(getPaymentMethodLabel(online("Paid", { paymentChannel: channel })), `Secure Online Payment (${label})`);
  }
  assert.equal(getPaymentMethodLabel(online("Paid", { paymentChannel: "<unsafe>" })), "Secure Online Payment");
  assert.equal(getPaymentMethodLabel(online("Pending", { paymentChannel: "card" })), "Secure Online Payment");
});

test("forged success URL cannot confirm a Pending, unrelated or unavailable payment", () => {
  const options = { payment: "success", reference: "AM-first", loading: false };
  assert.equal(getPaymentReturnNotice([online("Pending")], options).severity, "info");
  assert.match(getPaymentReturnNotice([online("Pending")], options).message, /Verifying/);
  assert.equal(getPaymentReturnNotice([online("Paid", { paymentReference: "AM-other" })], options).severity, "info");
  assert.equal(getPaymentReturnNotice([online("Paid")], { ...options, reference: "" }).severity, "info");
  assert.equal(getPaymentReturnNotice([online("Paid")], { ...options, error: "offline" }).severity, "warning");
  assert.equal(getPaymentReturnNotice([online("Paid")], { ...options, loading: true }).severity, "info");
  assert.equal(getPaymentReturnNotice([online("Paid")], options).message, "Payment confirmed.");
});

test("one shared reference is confirmed only when every seller order is paid", () => {
  const options = { payment: "success", reference: "AM-first" };
  assert.equal(getPaymentReturnNotice([online("Paid"), online("Pending", { orderId: 2 })], options).severity, "info");
  assert.equal(getPaymentReturnNotice([online("Paid"), online("Paid", { orderId: 2 })], options).severity, "success");
  assert.equal(getPaymentReturnNotice([online("Pending", { status: "Cancelled" })], { ...options, payment: "cancelled" }).severity, "warning");
  assert.match(getPaymentReturnNotice([online("Pending")], { ...options, payment: "cancelled" }).message, /not been confirmed/);
});

test("financial Paid with cancelled fulfillment warns about refund review instead of confirming completion", () => {
  const options = { payment: "success", reference: "AM-first" };
  const notice = getPaymentReturnNotice([online("Paid", { status: "Cancelled" })], options);
  assert.equal(notice.severity, "warning");
  assert.equal(notice.message, "Payment received, but this checkout needs support review for a refund.");
  assert.equal(getPaymentReturnNotice([online("Paid"), online("Paid", { orderId: 2, status: "Cancelled" })], options).severity, "warning");
});

test("resume is offered only for an active Pending or Failed online checkout with a reference", () => {
  assert.equal(canResumePayment(online("Pending")), true);
  assert.equal(canResumePayment(online("Failed")), true);
  assert.equal(canResumePayment(online("Paid")), false);
  assert.equal(canResumePayment(online("Expired")), false);
  assert.equal(canResumePayment(online("Pending", { status: "Cancelled" })), false);
  assert.equal(canResumePayment(online("Pending", { paymentReference: "" })), false);
  assert.equal(canResumePayment({ payment: "cod", paymentStatus: "Pending" }), false);
});
