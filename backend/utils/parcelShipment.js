export function validateParcelPhotoCount(photos) {
  if (!Array.isArray(photos) || photos.length < 1 || photos.length > 5) {
    throw new Error("Upload 1 to 5 parcel photos before marking the order Packed");
  }
}

export function normalizeTrackingUrl(value) {
  const trackingUrl = String(value || "").trim();
  if (!trackingUrl) return null;
  if (trackingUrl.length > 2048) {
    throw new Error("Tracking link must be 2048 characters or fewer");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trackingUrl);
  } catch {
    throw new Error("Enter a valid HTTP or HTTPS tracking link");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Tracking link must use HTTP or HTTPS");
  }

  return parsedUrl.toString();
}

export function getShippedNotificationTrackingUrl(
  notificationType,
  message,
  trackingUrl,
) {
  if (
    notificationType !== "shipping" ||
    !/has shipped and is on the way\./i.test(String(message || ""))
  ) {
    return null;
  }
  return trackingUrl || null;
}

export function getPackedNotificationParcelPhotos(
  notificationType,
  message,
  photos,
) {
  if (
    notificationType !== "order_status" ||
    !/has been packed and is ready for shipment\./i.test(String(message || ""))
  ) {
    return [];
  }
  return photos;
}
