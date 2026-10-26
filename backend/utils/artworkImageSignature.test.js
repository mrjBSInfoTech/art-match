import assert from "node:assert/strict";
import test from "node:test";
import {
  ARTWORK_IMAGE_URL_TTL_SECONDS,
  signArtworkImageUrl,
  verifyArtworkImageUrl,
} from "./artworkImageSignature.js";

const secret = "test-only-artwork-url-secret";
const now = 1_800_000_000;
const expiresAt = now + ARTWORK_IMAGE_URL_TTL_SECONDS;
const filename = "artwork-1.jpg";
const code = "AB23C";

test("accepts a valid signed artwork URL before expiry", () => {
  const signature = signArtworkImageUrl(filename, code, expiresAt, { secret });

  assert.equal(
    verifyArtworkImageUrl(filename, code, expiresAt, signature, { now, secret }),
    true,
  );
});

test("rejects signed artwork URLs with altered fields", () => {
  const signature = signArtworkImageUrl(filename, code, expiresAt, { secret });

  assert.equal(
    verifyArtworkImageUrl("other.jpg", code, expiresAt, signature, { now, secret }),
    false,
  );
  assert.equal(
    verifyArtworkImageUrl(filename, "GUEST", expiresAt, signature, { now, secret }),
    false,
  );
  assert.equal(
    verifyArtworkImageUrl(filename, code, expiresAt + 1, signature, { now, secret }),
    false,
  );
});

test("rejects expired, overlong, and malformed signed artwork URLs", () => {
  const signature = signArtworkImageUrl(filename, code, expiresAt, { secret });

  assert.equal(
    verifyArtworkImageUrl(filename, code, expiresAt, signature, {
      now: expiresAt,
      secret,
    }),
    false,
  );
  assert.equal(
    verifyArtworkImageUrl(filename, code, now + ARTWORK_IMAGE_URL_TTL_SECONDS + 1, signature, {
      now,
      secret,
    }),
    false,
  );
  assert.equal(
    verifyArtworkImageUrl(filename, code, expiresAt, "not-a-signature", { now, secret }),
    false,
  );
});

test("a signature is bound to its image variant", () => {
  const thumbSignature = signArtworkImageUrl(filename, code, expiresAt, {
    variant: "thumb",
    secret,
  });

  assert.equal(
    verifyArtworkImageUrl(filename, code, expiresAt, thumbSignature, {
      variant: "thumb",
      now,
      secret,
    }),
    true,
  );
  // A signed thumbnail URL cannot be edited into the larger gallery image.
  assert.equal(
    verifyArtworkImageUrl(filename, code, expiresAt, thumbSignature, {
      variant: "web",
      now,
      secret,
    }),
    false,
  );
  assert.equal(
    verifyArtworkImageUrl(filename, code, expiresAt, thumbSignature, {
      variant: "original",
      now,
      secret,
    }),
    false,
  );
});

test("defaults to the web variant for existing callers", () => {
  const signature = signArtworkImageUrl(filename, code, expiresAt, { secret });

  assert.equal(
    verifyArtworkImageUrl(filename, code, expiresAt, signature, {
      variant: "web",
      now,
      secret,
    }),
    true,
  );
});
