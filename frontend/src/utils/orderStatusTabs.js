export const STATUS_TABS = [
  "All",
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Refunded",
];

export const isRefundedOrder = (order) => {
  if (!order) return false;
  const paymentStatus = String(order.paymentStatus ?? order.payment_status ?? "").trim().toLowerCase();
  if (paymentStatus === "refunded") return true;
  const activeStatus = String(order.activeReturn?.status ?? "").trim().toLowerCase();
  if (activeStatus && activeStatus !== "cancelled") return true;
  if (Array.isArray(order.returns) && order.returns.some((r) => String(r.status ?? "").trim().toLowerCase() !== "cancelled")) {
    return true;
  }
  return false;
};

export const orderMatchesStatusTab = (order, tab) => {
  if (!order) return false;
  const normalizedTab = String(tab ?? "All").trim();
  if (normalizedTab.toLowerCase() === "all") return true;
  if (normalizedTab.toLowerCase() === "refunded") {
    return isRefundedOrder(order);
  }
  const status = String(order.status ?? "").trim();
  return status.toLowerCase() === normalizedTab.toLowerCase();
};

export const filterOrdersByStatusTab = (orders = [], tab = "All") => {
  if (!Array.isArray(orders)) return [];
  return orders.filter((order) => orderMatchesStatusTab(order, tab));
};

export const getTabCounts = (orders = []) => {
  const counts = {
    All: 0,
    Pending: 0,
    Confirmed: 0,
    Packed: 0,
    Shipped: 0,
    Delivered: 0,
    Cancelled: 0,
    Refunded: 0,
  };
  if (!Array.isArray(orders)) return counts;
  counts.All = orders.length;
  orders.forEach((order) => {
    STATUS_TABS.slice(1).forEach((tab) => {
      if (orderMatchesStatusTab(order, tab)) {
        counts[tab] = (counts[tab] || 0) + 1;
      }
    });
  });
  return counts;
};

export const DELIVERY_LIFECYCLE_STEPS = ["Placed", "Confirmed", "Packed", "Shipped", "Delivered"];

export const getDeliveryProgressStepIndex = (status) => {
  const normalized = String(status ?? "").trim().toLowerCase();
  switch (normalized) {
    case "pending":
      return 0;
    case "confirmed":
      return 1;
    case "packed":
      return 2;
    case "shipped":
      return 3;
    case "delivered":
      return 4;
    default:
      return -1;
  }
};

