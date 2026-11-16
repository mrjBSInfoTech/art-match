import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAuthCookieOptions,
  getAllowedOrigins,
  getAuthCookieOptions,
} from "../utils/authCookies.js";
import { validateEnv } from "../utils/validateEnv.js";

test("production auth cookie options default to sameSite='none' and secure=true for cross-origin Vercel + backend hosting", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSameSite = process.env.COOKIE_SAME_SITE;
  process.env.NODE_ENV = "production";
  delete process.env.COOKIE_SAME_SITE;
  try {
    const authCookie = getAuthCookieOptions();
    assert.equal(authCookie.httpOnly, true);
    assert.equal(authCookie.secure, true);
    assert.equal(authCookie.sameSite, "none");

    const clearedCookie = clearAuthCookieOptions();
    assert.equal(clearedCookie.httpOnly, true);
    assert.equal(clearedCookie.secure, true);
    assert.equal(clearedCookie.sameSite, "none");

    process.env.COOKIE_SAME_SITE = "strict";
    assert.equal(getAuthCookieOptions().sameSite, "strict");
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousSameSite === undefined) delete process.env.COOKIE_SAME_SITE;
    else process.env.COOKIE_SAME_SITE = previousSameSite;
  }
});

test("getAllowedOrigins includes FRONTEND_URL, PUBLIC_APP_URL, and comma-separated CORS_ALLOWED_ORIGINS", () => {
  const prevFrontend = process.env.FRONTEND_URL;
  const prevPublic = process.env.PUBLIC_APP_URL;
  const prevCors = process.env.CORS_ALLOWED_ORIGINS;
  process.env.FRONTEND_URL = "https://artmatch.vercel.app/";
  process.env.PUBLIC_APP_URL = "https://www.artmatch.example/";
  process.env.CORS_ALLOWED_ORIGINS = "https://preview-artmatch.vercel.app, https://staging.example.com/";
  try {
    const allowed = getAllowedOrigins();
    assert.equal(allowed.has("https://artmatch.vercel.app"), true);
    assert.equal(allowed.has("https://www.artmatch.example"), true);
    assert.equal(allowed.has("https://preview-artmatch.vercel.app"), true);
    assert.equal(allowed.has("https://staging.example.com"), true);
  } finally {
    if (prevFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = prevFrontend;
    if (prevPublic === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = prevPublic;
    if (prevCors === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
    else process.env.CORS_ALLOWED_ORIGINS = prevCors;
  }
});

test("validateEnv in production rejects PayMongo test keys unless PAYMONGO_ALLOW_TEST_MODE=true", () => {
  const keys = [
    "NODE_ENV",
    "JWT_SECRET",
    "ARTWORK_URL_SIGNING_SECRET",
    "PAYOUT_ACCOUNT_ENCRYPTION_KEY",
    "B2_KEY_ID",
    "B2_APPLICATION_KEY",
    "PAYMONGO_SECRET_KEY",
    "PAYMONGO_WEBHOOK_SECRET",
    "PAYMONGO_ALLOW_TEST_MODE",
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));

  process.env.NODE_ENV = "production";
  process.env.JWT_SECRET = "a".repeat(64);
  process.env.ARTWORK_URL_SIGNING_SECRET = "b".repeat(64);
  process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = "c".repeat(64);
  process.env.B2_KEY_ID = "real_b2_key_id";
  process.env.B2_APPLICATION_KEY = "real_b2_app_key";
  process.env.PAYMONGO_WEBHOOK_SECRET = "whsk_real_test_webhook_secret";

  try {
    process.env.PAYMONGO_SECRET_KEY = "sk_test_123456";
    delete process.env.PAYMONGO_ALLOW_TEST_MODE;
    assert.throws(() => validateEnv(), /PAYMONGO_SECRET_KEY must be a valid live key in production/);

    process.env.PAYMONGO_ALLOW_TEST_MODE = "true";
    const result = validateEnv();
    assert.equal(result.valid, true);
    assert.equal(result.warnings.some((w) => w.includes("PAYMONGO_ALLOW_TEST_MODE=true")), true);

    process.env.PAYMONGO_SECRET_KEY = "sk_test_placeholder_key";
    assert.throws(() => validateEnv(), /PAYMONGO_SECRET_KEY cannot use placeholder values in production/);
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});


