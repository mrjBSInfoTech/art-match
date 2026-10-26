import { createHmac, timingSafeEqual } from "node:crypto";
import { DEFAULT_ARTWORK_VARIANT, isArtworkVariant } from "./artworkDerivatives.js";

export const ARTWORK_IMAGE_URL_TTL_SECONDS = 10 * 60;

const getSigningSecret = () => {
  const secret =
    process.env.ARTWORK_URL_SIGNING_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "Set ARTWORK_URL_SIGNING_SECRET or JWT_SECRET to sign artwork image URLs.",
    );
  }
  return secret;
};

// The variant is part of the signed payload, so a signed thumbnail URL cannot
// be edited into the larger `web` URL.
const createSignature = (filename, code, variant, expiresAt, secret) =>
  createHmac("sha256", secret)
    .update(`${filename}\n${code}\n${variant}\n${expiresAt}`)
    .digest("hex");

export const signArtworkImageUrl = (
  filename,
  code,
  expiresAt,
  { variant = DEFAULT_ARTWORK_VARIANT, secret = getSigningSecret() } = {},
) => createSignature(filename, code, variant, expiresAt, secret);

export const verifyArtworkImageUrl = (
  filename,
  code,
  expiresAt,
  signature,
  {
    variant = DEFAULT_ARTWORK_VARIANT,
    now = Math.floor(Date.now() / 1000),
    secret = getSigningSecret(),
  } = {},
) => {
  const expiry = Number(expiresAt);
  if (
    !filename ||
    !/^(?:GUEST|[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5})$/.test(code) ||
    !isArtworkVariant(variant) ||
    !Number.isSafeInteger(expiry) ||
    expiry <= now ||
    expiry > now + ARTWORK_IMAGE_URL_TTL_SECONDS ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }

  const expected = Buffer.from(
    createSignature(filename, code, variant, expiry, secret),
    "hex",
  );
  const provided = Buffer.from(signature, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
};
