export function validateParcelPhotoCount(photos) {
  if (!Array.isArray(photos) || photos.length < 1 || photos.length > 5) {
    throw new Error("Upload 1 to 5 parcel photos before marking the order Packed");
  }
}

export function normalizeTrackingUrl(
  value,
  { required = false, httpsOnly = false, preserveInput = false } = {},
) {
  const trackingUrl = String(value || "").trim();
  if (!trackingUrl) {
    if (required) throw new Error("Add a courier tracking link before marking this order as shipped");
    return null;
  }
  if (trackingUrl.length > 2048) {
    throw new Error("Tracking link must be 2048 characters or fewer");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trackingUrl);
  } catch {
    throw new Error("Enter a valid HTTP or HTTPS tracking link");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol) || (httpsOnly && parsedUrl.protocol !== "https:") ||
      !parsedUrl.hostname || parsedUrl.username || parsedUrl.password) {
    throw new Error(httpsOnly
      ? "Enter a valid HTTPS courier tracking link"
      : "Tracking link must use HTTP or HTTPS");
  }

  return preserveInput ? trackingUrl : parsedUrl.toString();
}

export function getShippedNotificationTrackingUrl(
  notificationType,
  message,
  trackingUrl,
) {
  if (
    notificationType !== "shipping" ||
    !/has shipped(?: and is on the way|\. Tracking is now available in My Orders)\./i.test(String(message || ""))
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
