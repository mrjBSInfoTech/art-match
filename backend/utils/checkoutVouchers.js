// Checkout prices are recalculated from the buyer's selected cart rows. A
// seller-funded voucher never discounts another seller's items or shipping.
export class CheckoutVoucherError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "CheckoutVoucherError";
    this.status = status;
  }
}

export const normalizeCheckoutVoucherCode = (value, { optional = false } = {}) => {
  if (optional && (value === undefined || value === null || value === "")) return null;
  if (typeof value !== "string" || !/^[A-Z0-9-]{3,20}$/.test(value.trim().toUpperCase())) {
    throw new CheckoutVoucherError("Enter a valid voucher code using 3–20 letters, numbers, or hyphens.");
  }
  return value.trim().toUpperCase();
};

const cents = (value) => {
  const text = String(value ?? "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new CheckoutVoucherError("A checkout price is invalid. Please refresh your cart.");
  const [whole, fraction = ""] = text.split(".");
  const amount = Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")));
  if (!Number.isSafeInteger(amount)) throw new CheckoutVoucherError("The checkout amount is too large.");
  return amount;
};
const pesos = (value) => value / 100;
const safeSum = (values) => {
  const value = values.reduce((sum, amount) => sum + amount, 0);
  if (!Number.isSafeInteger(value)) throw new CheckoutVoucherError("The checkout amount is too large.");
  return value;
};

// Exact largest-remainder allocation avoids floating point drift, even for
// large prices. Stable artwork-ID ties keep preview and final checkout equal.
const allocateDiscount = (discount, items) => {
  const total = BigInt(safeSum(items.map((item) => item.originalCentavos)));
  const shares = items.map((item) => {
    const product = BigInt(discount) * BigInt(item.originalCentavos);
    return { id: item.artworkId, value: Number(product / total), remainder: product % total };
  });
  let remaining = discount - safeSum(shares.map((share) => share.value));
  const ranked = [...shares].sort((a, b) => a.remainder === b.remainder
    ? a.id - b.id : a.remainder > b.remainder ? -1 : 1);
  for (const share of ranked) {
    if (!remaining) break;
    share.value += 1;
    remaining -= 1;
  }
  return new Map(shares.map((share) => [share.id, share.value]));
};

export const priceCheckoutItems = (items, voucher = null, voucherArtworkIds = []) => {
  if (!items.length) throw new CheckoutVoucherError("Select at least one artwork to apply a voucher.");
  const pricedItems = items.map((item) => ({
    ...item,
    artworkId: Number(item.artwork_id),
    quantity: Number(item.quantity || 1),
    originalCentavos: cents(item.price) * Math.max(1, Number(item.quantity || 1)),
    discountCentavos: 0,
  }));
  if (new Set(pricedItems.map((item) => item.artworkId)).size !== pricedItems.length ||
      pricedItems.some((item) => !Number.isSafeInteger(item.artworkId) || item.artworkId <= 0 || item.originalCentavos <= 0)) {
    throw new CheckoutVoucherError("Some checkout artworks or prices are invalid. Please refresh your cart.");
  }
  const subtotal = safeSum(pricedItems.map((item) => item.originalCentavos));
  let eligibleSubtotal = 0;
  let discount = 0;
  let minimum = 0;
  if (voucher) {
    if (!Number(voucher.is_active)) throw new CheckoutVoucherError("This voucher is not active yet or has expired.");
    if (!["fixed", "percentage"].includes(voucher.discount_type)) {
      throw new CheckoutVoucherError("This freebie voucher does not provide a price discount. Please contact the seller about the free item.");
    }
    const listingIds = new Set(voucherArtworkIds.map(Number));
    const eligible = pricedItems.filter((item) => Number(item.student_id) === Number(voucher.student_id) &&
      (Number(voucher.applies_to_all) === 1 || listingIds.has(item.artworkId)));
    eligibleSubtotal = safeSum(eligible.map((item) => item.originalCentavos));
    if (!eligibleSubtotal) throw new CheckoutVoucherError("This voucher does not apply to the artworks selected for checkout.");
    minimum = cents(voucher.minimum_purchase ?? 0);
    if (eligibleSubtotal < minimum) {
      throw new CheckoutVoucherError(`Voucher requires at least ₱${pesos(minimum).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of eligible artworks from this seller. Your eligible subtotal is ₱${pesos(eligibleSubtotal).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
    }
    const value = cents(voucher.discount_value);
    if (value <= 0 || (voucher.discount_type === "percentage" && value > 10000)) {
      throw new CheckoutVoucherError("This voucher has an invalid discount. Please contact the seller.");
    }
    discount = voucher.discount_type === "percentage"
      ? Number((BigInt(eligibleSubtotal) * BigInt(value) + 5000n) / 10000n) : value;
    if (discount <= 0) throw new CheckoutVoucherError("This voucher does not give a discount on the selected amount.");
    if (discount >= eligibleSubtotal) {
      throw new CheckoutVoucherError("This voucher would make the eligible artworks free. Free-item checkout is not supported; choose another voucher.");
    }
    const allocations = allocateDiscount(discount, eligible);
    for (const item of pricedItems) item.discountCentavos = allocations.get(item.artworkId) || 0;
    if (pricedItems.some((item) => item.originalCentavos - item.discountCentavos < 1)) {
      throw new CheckoutVoucherError("This voucher would make an artwork free. Free-item checkout is not supported; choose another voucher.");
    }
  }
  return {
    items: pricedItems.map((item) => ({ ...item, chargedCentavos: item.originalCentavos - item.discountCentavos })),
    summary: {
      voucher: voucher ? {
        voucher_id: voucher.voucher_id, code: voucher.code,
        discount_type: voucher.discount_type, discount_value: Number(voucher.discount_value), student_id: voucher.student_id,
      } : null,
      subtotal: pesos(subtotal), eligible_subtotal: pesos(eligibleSubtotal),
      minimum_purchase: pesos(minimum), discount_amount: pesos(discount), total: pesos(subtotal - discount),
    },
  };
};

export const quoteCheckoutVoucher = async (executor, items, rawCode, { lock = false, required = false } = {}) => {
  const code = normalizeCheckoutVoucherCode(rawCode, { optional: !required });
  if (!code) return priceCheckoutItems(items);
  const [vouchers] = await executor.query(
    `SELECT voucher_id, student_id, code, discount_type, discount_value,
      minimum_purchase, applies_to_all,
      (starts_on <= CURRENT_DATE() AND expires_on >= CURRENT_DATE()) AS is_active
     FROM seller_voucher WHERE UPPER(code) = ? ORDER BY voucher_id${lock ? " FOR UPDATE" : ""}`,
    [code],
  );
  const active = vouchers.filter((voucher) => Number(voucher.is_active) === 1);
  if (!active.length) throw new CheckoutVoucherError("Voucher is invalid, has not started yet, or has expired.");
  if (active.length !== 1) throw new CheckoutVoucherError("This voucher code matches multiple active vouchers. Please contact the seller for a unique code.");
  const voucher = active[0];
  const [listings] = Number(voucher.applies_to_all) === 1 ? [[]] : await executor.query(
    `SELECT artwork_id FROM seller_voucher_artwork WHERE voucher_id = ?${lock ? " FOR UPDATE" : ""}`, [voucher.voucher_id],
  );
  return priceCheckoutItems(items, voucher, listings.map((listing) => listing.artwork_id));
};
