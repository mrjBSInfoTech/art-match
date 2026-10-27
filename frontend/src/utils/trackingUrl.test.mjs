import assert from "node:assert/strict";
import test from "node:test";
import { getSecureTrackingUrl } from "./trackingUrl.js";

test("tracking link guard permits HTTPS courier URLs and preserves their exact value", () => {
  for (const url of [
    "https://share.lalamove.com/order?id=abc%2F123",
    "https://track.example.com/parcel/123",
  ]) {
    assert.equal(getSecureTrackingUrl(url), url);
  }
});

test("tracking link guard rejects unsafe or malformed stored URLs", () => {
  for (const url of [
    "http://track.example.com/123",
    "javascript:alert(1)",
    "file:///test",
    "ftp://example.com",
    "hello",
    `https://track.example.com/${"a".repeat(2048)}`,
  ]) {
    assert.equal(getSecureTrackingUrl(url), "");
  }
});
