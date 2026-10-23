import { createHmac, timingSafeEqual } from "node:crypto";

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

const createSignature = (filename, code, expiresAt, secret) =>
  createHmac("sha256", secret)
    .update(`${filename}\n${code}\n${expiresAt}`)
    .digest("hex");

export const signArtworkImageUrl = (
  filename,
  code,
  expiresAt,
  secret = getSigningSecret(),
) => createSignature(filename, code, expiresAt, secret);

export const verifyArtworkImageUrl = (
  filename,
  code,
  expiresAt,
  signature,
  {
    now = Math.floor(Date.now() / 1000),
    secret = getSigningSecret(),
  } = {},
) => {
  const expiry = Number(expiresAt);
  if (
    !filename ||
    !/^(?:GUEST|[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5})$/.test(code) ||
    !Number.isSafeInteger(expiry) ||
    expiry <= now ||
    expiry > now + ARTWORK_IMAGE_URL_TTL_SECONDS ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }

  const expected = Buffer.from(
    createSignature(filename, code, expiry, secret),
    "hex",
  );
  const provided = Buffer.from(signature, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
};
