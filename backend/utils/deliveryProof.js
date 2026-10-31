/*
 * Seller proof that an order is finished/delivered: 1-5 stored photos plus
 * optional notes. Validation lives here so the route (and its tests) share one
 * definition and never trust only the browser-provided MIME type.
 */
export const MAX_DELIVERY_PHOTOS = 5;
export const MAX_DELIVERY_NOTES_LENGTH = 1000;

export class DeliveryProofError extends Error {
  constructor(message) {
    super(message);
    this.name = "DeliveryProofError";
    this.statusCode = 400;
  }
}

const startsWith = (buffer, bytes, offset = 0) =>
  bytes.every((byte, index) => buffer[offset + index] === byte);

export function hasImageSignature(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (mimetype === "image/jpeg") return startsWith(buffer, [0xff, 0xd8, 0xff]);
  if (mimetype === "image/png") {
    return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (mimetype === "image/webp") {
    return startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8);
  }
  return false;
}

export function normalizeDeliveryNotes(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new DeliveryProofError("Delivery notes must be text.");
  }
  // Strip control characters other than tab/newline before storing.
  const cleaned = [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("")
    .trim();
  if (cleaned.length > MAX_DELIVERY_NOTES_LENGTH) {
    throw new DeliveryProofError(`Delivery notes must be ${MAX_DELIVERY_NOTES_LENGTH} characters or fewer.`);
  }
  return cleaned || null;
}

export function validateDeliveryProof(files, notes) {
  const list = Array.isArray(files) ? files : [];
  if (list.length < 1) {
    throw new DeliveryProofError("Upload at least 1 photo as proof that this order is finished before marking it Delivered.");
  }
  if (list.length > MAX_DELIVERY_PHOTOS) {
    throw new DeliveryProofError(`Upload no more than ${MAX_DELIVERY_PHOTOS} delivery proof photos.`);
  }
  for (const file of list) {
    if (!hasImageSignature(file?.buffer, file?.mimetype)) {
      throw new DeliveryProofError("Delivery proof photos must be valid JPEG, PNG, or WebP images.");
    }
  }
  return { notes: normalizeDeliveryNotes(notes) };
}

export const parsePhotoList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/*
 * Adds a `deliveryProof` summary ({ notes, submittedAt, photoCount }) to every
 * order that has one. Photos themselves are only available through the
 * authenticated received-photos routes.
 */
export async function attachDeliveryProof(executor, orders) {
  if (!Array.isArray(orders) || !orders.length) return orders;
  const ids = orders.map((order) => Number(order.orderId)).filter(Number.isSafeInteger);
  if (!ids.length) return orders;
  let proofs = [];
  try {
    [proofs] = await executor.query(
      `SELECT p.order_id, p.notes, p.photo_count, p.submitted_at, o.received_photos
       FROM marketplace_order_delivery_proof p
       JOIN marketplace_order o ON o.order_id = p.order_id
       WHERE p.order_id IN (?)`,
      [ids],
    );
  } catch (error) {
    // A missing optional table must never hide the user's orders.
    console.error("Unable to load delivery proof:", error.code || error.message);
    return orders;
  }
  const byOrder = new Map(proofs.map((row) => [Number(row.order_id), row]));
  for (const order of orders) {
    const row = byOrder.get(Number(order.orderId));
    if (!row) continue;
    order.deliveryProof = {
      notes: row.notes || null,
      submittedAt: row.submitted_at,
      photoCount: parsePhotoList(row.received_photos).length || Number(row.photo_count) || 0,
    };
  }
  return orders;
}

