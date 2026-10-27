import assert from "node:assert/strict";
import test from "node:test";
import {
  getPackedNotificationParcelPhotos,
  getShippedNotificationTrackingUrl,
  normalizeTrackingUrl,
  validateParcelPhotoCount,
} from "./parcelShipment.js";

test("requires between one and five parcel photos", () => {
  assert.throws(() => validateParcelPhotoCount([]), /1 to 5/);
  assert.doesNotThrow(() => validateParcelPhotoCount([{}]));
  assert.doesNotThrow(() => validateParcelPhotoCount(Array(5).fill({})));
  assert.throws(() => validateParcelPhotoCount(Array(6).fill({})), /1 to 5/);
});

test("accepts optional HTTP and HTTPS tracking links", () => {
  assert.equal(normalizeTrackingUrl(""), null);
  assert.equal(
    normalizeTrackingUrl("https://tracking.example/parcel/123"),
    "https://tracking.example/parcel/123",
  );
  assert.equal(
    normalizeTrackingUrl("http://tracking.example/parcel/123"),
    "http://tracking.example/parcel/123",
  );
});

test("requires HTTPS courier links while preserving the exact submitted link", () => {
  const lalamoveLink = "https://share.lalamove.com/order?id=abc%2F123";
  assert.equal(
    normalizeTrackingUrl(lalamoveLink, { required: true, httpsOnly: true, preserveInput: true }),
    lalamoveLink,
  );
  assert.equal(
    normalizeTrackingUrl("https://track.example.com/parcel/123", {
      required: true, httpsOnly: true, preserveInput: true,
    }),
    "https://track.example.com/parcel/123",
  );
});

test("rejects empty and unsafe courier links when secure tracking is required", () => {
  for (const value of ["", "hello", "javascript(1)", "javascript:alert(1)", "file:///test", "ftp://example.com", "http://tracking.example/test"]) {
    assert.throws(
      () => normalizeTrackingUrl(value, { required: true, httpsOnly: true, preserveInput: true }),
      undefined,
      value,
    );
  }
  assert.throws(
    () => normalizeTrackingUrl(`https://tracking.example/${"a".repeat(2048)}`, {
      required: true, httpsOnly: true,
    }),
    /2048/,
  );
});

test("rejects invalid or unsafe tracking links", () => {
  assert.throws(() => normalizeTrackingUrl("not a URL"), /valid HTTP or HTTPS/);
  assert.throws(() => normalizeTrackingUrl("javascript:alert(1)"), /HTTP or HTTPS/);
});

test("shows the tracking link only on the shipped notification", () => {
  const trackingUrl = "https://tracking.example/parcel/123";
  assert.equal(
    getShippedNotificationTrackingUrl(
      "order_status",
      "Your order AM-000005 has been packed and is ready for shipment.",
      trackingUrl,
    ),
    null,
  );
  assert.equal(
    getShippedNotificationTrackingUrl(
      "shipping",
      "Your order AM-000005 has shipped and is on the way.",
      trackingUrl,
    ),
    trackingUrl,
  );
  assert.equal(
    getShippedNotificationTrackingUrl(
      "shipping",
      "Your order AM-000005 has shipped. Tracking is now available in My Orders.",
      trackingUrl,
    ),
    trackingUrl,
  );
  assert.equal(
    getShippedNotificationTrackingUrl(
      "shipping",
      "Your order AM-000005 has been delivered.",
      trackingUrl,
    ),
    null,
  );
});

test("shows parcel photos only on the packed and ready-to-ship notification", () => {
  const photos = [{ key: "parcel-photo" }];
  assert.deepEqual(
    getPackedNotificationParcelPhotos(
      "order_status",
      "Your order AM-000005 has been packed and is ready for shipment.",
      photos,
    ),
    photos,
  );
  assert.deepEqual(
    getPackedNotificationParcelPhotos(
      "shipping",
      "Your order AM-000005 has shipped and is on the way.",
      photos,
    ),
    [],
  );
  assert.deepEqual(
    getPackedNotificationParcelPhotos(
      "shipping",
      "Your order AM-000005 has been delivered.",
      photos,
    ),
    [],
  );
});
