const normalize = (value) => String(value ?? "").trim().toLowerCase();

export const isPayMongoOrder = (order) =>
  normalize(order?.payment ?? order?.payment_method) === "paymongo";

export const isOrderPaid = (order) =>
  normalize(order?.paymentStatus ?? order?.payment_status) === "paid";

// Online checkout attempts become purchases only after the server confirms payment.
export const isPlacedOrder = (order) =>
  !isPayMongoOrder(order) || ["paid", "refunded"].includes(normalize(order?.paymentStatus ?? order?.payment_status));

export const canFulfillOrder = (order) =>
  normalize(order?.status) !== "cancelled" &&
  (normalize(order?.payment ?? order?.payment_method) === "cod" ||
  (isPayMongoOrder(order) && isOrderPaid(order)));

export const needsPaymentSupport = (order) =>
  isPayMongoOrder(order) && isOrderPaid(order) && normalize(order?.status) === "cancelled";

export const isSellerSale = (order) =>
  normalize(order?.status) !== "cancelled" && canFulfillOrder(order);

export const getPaymentReference = (order) =>
  String(order?.paymentReference ?? order?.payment_reference ?? "");

export const canResumePayment = (order) =>
  isPayMongoOrder(order) && normalize(order.status) === "pending" &&
  ["pending", "failed"].includes(normalize(order.paymentStatus ?? order.payment_status)) &&
  Boolean(getPaymentReference(order));

export const getPaymentLabel = (order) => {
  if (!isPayMongoOrder(order)) return normalize(order?.payment ?? order?.payment_method) === "cod"
    ? "Cash on Delivery" : "Payment status unavailable";
  const labels = {
    pending: "Awaiting Payment",
    paid: "Paid",
    failed: "Payment Failed",
    expired: "Payment Expired",
    refunded: "Refunded",
  };
  return labels[normalize(order.paymentStatus ?? order.payment_status)] || "Payment status unavailable";
};

export const getPaymentColor = (order) => {
  if (!isPayMongoOrder(order)) return "default";
  const colors = { pending: "warning", paid: "success", failed: "error", expired: "warning", refunded: "info" };
  return colors[normalize(order.paymentStatus ?? order.payment_status)] || "default";
};

export const getPaymentMethodLabel = (order) => {
  if (!isPayMongoOrder(order)) return normalize(order?.payment ?? order?.payment_method) === "cod"
    ? "Cash on Delivery" : "Payment method unavailable";
  const channel = normalize(order.paymentChannel ?? order.paymongo_payment_method);
  const channels = { gcash: "GCash", paymaya: "Maya", card: "Card", qrph: "QR Ph" };
  const safeChannel = channels[channel] || (/^[a-z0-9_-]{1,50}$/.test(channel) ? channel.replace(/[_-]/g, " ") : "");
  return `Secure Online Payment${isOrderPaid(order) && safeChannel ? ` (${safeChannel})` : ""}`;
};

// A redirect only selects a payment to check; confirmation always comes from orders loaded from the API.
export const getPaymentReturnNotice = (orders, { payment, reference, loading, error } = {}) => {
  if (payment !== "success" && payment !== "cancelled") return null;
  if (loading) return { severity: "info", message: "Verifying your payment..." };
  if (error) return { severity: "warning", message: "Unable to verify your payment right now. Refresh to check its status." };
  const matching = reference
    ? orders.filter((order) => isPayMongoOrder(order) && getPaymentReference(order) === reference)
    : [];
  if (!matching.length) return { severity: "info", message: "Payment is not confirmed yet. Return to checkout to check its status." };
  if (matching.some(needsPaymentSupport)) return { severity: "warning", message: "Payment received, but this checkout needs support review for a refund." };
  if (matching.every(isOrderPaid)) return { severity: "success", message: "Payment confirmed." };
  if (matching.every((order) => normalize(order.status) === "cancelled")) {
    return { severity: "warning", message: "The unpaid checkout was cancelled. Review your cart before trying again." };
  }
  const status = normalize(matching[0].paymentStatus ?? matching[0].payment_status);
  if (matching.every((order) => normalize(order.paymentStatus ?? order.payment_status) === status)) {
    if (status === "failed") return { severity: "error", message: "Payment failed. You can resume or cancel this checkout below." };
    if (status === "expired") return { severity: "warning", message: "This payment has expired. Review your cart before trying again." };
    if (status === "refunded") return { severity: "info", message: "This payment has been refunded." };
  }
  return { severity: "info", message: payment === "cancelled"
    ? "Payment has not been confirmed. You can resume or cancel this checkout below."
    : "Verifying your payment... Refresh if confirmation takes longer than a minute." };
};
