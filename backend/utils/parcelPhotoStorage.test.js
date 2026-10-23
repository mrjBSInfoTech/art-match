import assert from "node:assert/strict";
import test from "node:test";
import { resolveLocalParcelPhotoPath } from "./parcelPhotoStorage.js";

test("resolves a parcel photo path under the local uploads directory", () => {
  const photoPath = resolveLocalParcelPhotoPath(
    42,
    "orders/42/parcel/123e4567-e89b-12d3-a456-426614174000.jpg",
  );
  assert.match(photoPath, /uploads\\orders\\42\\parcel\\123e4567-e89b-12d3-a456-426614174000\.jpg$/);
});

test("rejects parcel paths outside the expected order and filename format", () => {
  assert.throws(
    () => resolveLocalParcelPhotoPath(42, "orders/43/parcel/123e4567-e89b-12d3-a456-426614174000.jpg"),
    /Invalid parcel photo key/,
  );
  assert.throws(
    () => resolveLocalParcelPhotoPath(42, "../secret.jpg"),
    /Invalid parcel photo key/,
  );
  assert.throws(
    () => resolveLocalParcelPhotoPath(0, "orders/0/parcel/123e4567-e89b-12d3-a456-426614174000.jpg"),
    /Invalid parcel photo key/,
  );
});
