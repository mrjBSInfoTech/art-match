import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STATUS_TABS,
  isRefundedOrder,
  orderMatchesStatusTab,
  filterOrdersByStatusTab,
  getTabCounts,
  getDeliveryProgressStepIndex,
} from "./orderStatusTabs.js";

const sampleOrders = [
  { orderId: 1, status: "Pending", paymentStatus: "Paid" },
  { orderId: 2, status: "Confirmed", paymentStatus: "Paid" },
  { orderId: 3, status: "Packed", paymentStatus: "Paid" },
  {
    orderId: 4,
    status: "Shipped",
    paymentStatus: "Paid",
    courier: "lalamove",
    trackingNumber: "TRK-12345",
  },
  { orderId: 5, status: "Delivered", paymentStatus: "Paid" },
  { orderId: 6, status: "Cancelled", paymentStatus: "Pending" },
  {
    orderId: 7,
    status: "Delivered",
    paymentStatus: "Refunded",
    activeReturn: { status: "Completed", reason: "Damaged frame" },
  },
  {
    orderId: 8,
    status: "Delivered",
    paymentStatus: "Paid",
    activeReturn: { status: "Requested", reason: "Wrong size" },
  },
];

test("STATUS_TABS contains all 8 required tabs", () => {
  assert.deepEqual(STATUS_TABS, [
    "All",
    "Pending",
    "Confirmed",
    "Packed",
    "Shipped",
    "Delivered",
    "Cancelled",
    "Refunded",
  ]);
});

test("filterOrdersByStatusTab filters each tab correctly", () => {
  // All
  const allOrders = filterOrdersByStatusTab(sampleOrders, "All");
  assert.equal(allOrders.length, 8);

  // Pending
  const pendingOrders = filterOrdersByStatusTab(sampleOrders, "Pending");
  assert.equal(pendingOrders.length, 1);
  assert.equal(pendingOrders[0].orderId, 1);

  // Confirmed
  const confirmedOrders = filterOrdersByStatusTab(sampleOrders, "Confirmed");
  assert.equal(confirmedOrders.length, 1);
  assert.equal(confirmedOrders[0].orderId, 2);

  // Packed
  const packedOrders = filterOrdersByStatusTab(sampleOrders, "Packed");
  assert.equal(packedOrders.length, 1);
  assert.equal(packedOrders[0].orderId, 3);

  // Shipped
  const shippedOrders = filterOrdersByStatusTab(sampleOrders, "Shipped");
  assert.equal(shippedOrders.length, 1);
  assert.equal(shippedOrders[0].orderId, 4);

  // Delivered
  const deliveredOrders = filterOrdersByStatusTab(sampleOrders, "Delivered");
  // Orders 5, 7, and 8 have status Delivered
  assert.equal(deliveredOrders.length, 3);
  assert.deepEqual(
    deliveredOrders.map((o) => o.orderId),
    [5, 7, 8]
  );

  // Cancelled
  const cancelledOrders = filterOrdersByStatusTab(sampleOrders, "Cancelled");
  assert.equal(cancelledOrders.length, 1);
  assert.equal(cancelledOrders[0].orderId, 6);

  // Refunded
  // Orders 7 (paymentStatus: Refunded, activeReturn: Completed) and 8 (activeReturn: Requested)
  const refundedOrders = filterOrdersByStatusTab(sampleOrders, "Refunded");
  assert.equal(refundedOrders.length, 2);
  assert.deepEqual(
    refundedOrders.map((o) => o.orderId),
    [7, 8]
  );
});

test("getTabCounts counts orders for all tabs", () => {
  const counts = getTabCounts(sampleOrders);
  assert.equal(counts.All, 8);
  assert.equal(counts.Pending, 1);
  assert.equal(counts.Confirmed, 1);
  assert.equal(counts.Packed, 1);
  assert.equal(counts.Shipped, 1);
  assert.equal(counts.Delivered, 3);
  assert.equal(counts.Cancelled, 1);
  assert.equal(counts.Refunded, 2);
});

test("isRefundedOrder handles various refund states", () => {
  assert.equal(isRefundedOrder(null), false);
  assert.equal(isRefundedOrder({ paymentStatus: "Paid" }), false);
  assert.equal(isRefundedOrder({ paymentStatus: "Refunded" }), true);
  assert.equal(
    isRefundedOrder({
      paymentStatus: "Paid",
      activeReturn: { status: "Requested" },
    }),
    true
  );
  assert.equal(
    isRefundedOrder({
      paymentStatus: "Paid",
      activeReturn: { status: "Cancelled" },
    }),
    false
  );
  assert.equal(
    isRefundedOrder({
      paymentStatus: "Paid",
      returns: [{ status: "Approved" }],
    }),
    true
  );
});

test("getDeliveryProgressStepIndex returns step indexes for order lifecycle", () => {
  assert.equal(getDeliveryProgressStepIndex("Pending"), 0);
  assert.equal(getDeliveryProgressStepIndex("Confirmed"), 1);
  assert.equal(getDeliveryProgressStepIndex("Packed"), 2);
  assert.equal(getDeliveryProgressStepIndex("Shipped"), 3);
  assert.equal(getDeliveryProgressStepIndex("Delivered"), 4);
  assert.equal(getDeliveryProgressStepIndex("Cancelled"), -1);
  assert.equal(getDeliveryProgressStepIndex("Unknown"), -1);
});

