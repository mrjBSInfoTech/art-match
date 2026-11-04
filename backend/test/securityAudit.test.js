import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
import jwt from "jsonwebtoken";
import cors from "cors";
import {
  cookieMiddleware,
  csrfProtection,
  parseCookies,
  getAuthCookieOptions,
  clearAuthCookieOptions,
} from "../utils/authCookies.js";
import { authenticateAdmin } from "../middleware/adminAuthMiddleware.js";
import { authenticateSeller } from "../middleware/sellerAuthMiddleware.js";
import { authenticateBuyer } from "../middleware/buyerAuthMiddleware.js";
import { getJwtSecret } from "../utils/jwtSecret.js";
import db from "../database/db.js";

const JWT_SECRET = getJwtSecret();

const createMockRes = () => {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
};

test("Cookie parsing and utilities", async (t) => {
  await t.test("parseCookies correctly parses Cookie headers into req.cookies", () => {
    const req = {
      headers: {
        cookie: "admin_token=admin_jwt_value; buyer_token=buyer_jwt_value; other=123",
      },
    };
    const cookies = parseCookies(req);
    assert.equal(cookies.admin_token, "admin_jwt_value");
    assert.equal(cookies.buyer_token, "buyer_jwt_value");
    assert.equal(cookies.other, "123");
  });

  await t.test("getAuthCookieOptions enforces httpOnly, path=/, and 7-day maxAge", () => {
    const options = getAuthCookieOptions();
    assert.equal(options.httpOnly, true);
    assert.equal(options.path, "/");
    assert.equal(options.maxAge, 7 * 24 * 60 * 60 * 1000);
    assert.ok(options.sameSite === "lax" || options.sameSite === "strict");
  });

  await t.test("clearAuthCookieOptions sets matching path and httpOnly", () => {
    const options = clearAuthCookieOptions();
    assert.equal(options.httpOnly, true);
    assert.equal(options.path, "/");
  });
});

test("JWT Verification and Algorithm Restriction", async (t) => {
  await t.test("Rejects algorithm 'none' token", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ admin_id: 1, role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
    const unsignedToken = `${header}.${payload}.`;

    assert.throws(
      () => {
        jwt.verify(unsignedToken, JWT_SECRET, { algorithms: ["HS256"] });
      },
      /invalid algorithm|jwt/i,
    );
  });

  await t.test("Rejects tampered token signature", () => {
    const validToken = jwt.sign({ admin_id: 1, role: "admin" }, JWT_SECRET, { algorithm: "HS256" });
    const tampered = validToken.slice(0, -5) + "abcde";

    assert.throws(
      () => {
        jwt.verify(tampered, JWT_SECRET, { algorithms: ["HS256"] });
      },
      /invalid signature/i,
    );
  });
});

test("Admin Authentication Middleware", async (t) => {
  await t.test("rejects request without cookie or header (401)", async () => {
    const req = { cookies: {}, headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await authenticateAdmin(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
    assert.match(res.body.message, /no token provided/i);
  });

  await t.test("accepts valid admin_token from cookie", async () => {
    const adminToken = jwt.sign(
      { admin_id: 10, username: "superadmin", role: "admin" },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h" },
    );
    const req = { cookies: { admin_token: adminToken }, headers: {} };
    const res = createMockRes();
    let nextCalled = false;
    const originalQuery = db.query;
    db.query = (sql, params, cb) => {
      if (typeof sql === "string" && sql.includes("FROM admin a")) {
        return cb(null, [{ password_changed: 0, role: "admin", is_banned: 0 }]);
      }
      return originalQuery.call(db, sql, params, cb);
    };

    try {
      await authenticateAdmin(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
      assert.equal(req.user.admin_id, 10);
      assert.equal(req.user.role, "admin");
    } finally {
      db.query = originalQuery;
    }
  });

  await t.test("accepts valid Super Admin token from cookie", async () => {
    const superAdminToken = jwt.sign(
      { admin_id: 1, username: "main_superadmin", role: "Super Admin" },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h" },
    );
    const req = { cookies: { admin_token: superAdminToken }, headers: {} };
    const res = createMockRes();
    let nextCalled = false;
    const originalQuery = db.query;
    db.query = (sql, params, cb) => {
      if (typeof sql === "string" && sql.includes("FROM admin a")) {
        return cb(null, [{ password_changed: 0, role: "super admin", is_banned: 0 }]);
      }
      return originalQuery.call(db, sql, params, cb);
    };

    try {
      await authenticateAdmin(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
      assert.equal(req.user.admin_id, 1);
      assert.equal(req.user.role, "super admin");
    } finally {
      db.query = originalQuery;
    }
  });

  await t.test("rejects token when role in token does not match DB role (403)", async () => {
    const forgedRoleToken = jwt.sign(
      { admin_id: 10, username: "mod_user", role: "super admin" },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h" },
    );
    const req = { cookies: { admin_token: forgedRoleToken }, headers: {} };
    const res = createMockRes();
    let nextCalled = false;
    const originalQuery = db.query;
    db.query = (sql, params, cb) => {
      if (typeof sql === "string" && sql.includes("FROM admin a")) {
        return cb(null, [{ password_changed: 0, role: "moderator", is_banned: 0 }]);
      }
      return originalQuery.call(db, sql, params, cb);
    };

    try {
      await authenticateAdmin(req, res, () => { nextCalled = true; });
      assert.equal(res.statusCode, 403);
      assert.equal(nextCalled, false);
      assert.match(res.body.message, /role mismatch/i);
    } finally {
      db.query = originalQuery;
    }
  });

  await t.test("rejects buyer token accessing admin route (403)", async () => {
    const buyerToken = jwt.sign(
      { customer_id: 55, role: "buyer" },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h" },
    );
    const req = { cookies: { admin_token: buyerToken }, headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await authenticateAdmin(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.match(res.body.message, /admin/i);
  });

  await t.test("rejects seller token accessing admin route (403)", async () => {
    const sellerToken = jwt.sign(
      { student_id: 22, role: "seller" },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h" },
    );
    const req = { cookies: { admin_token: sellerToken }, headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await authenticateAdmin(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.match(res.body.message, /admin/i);
  });
});

test("Cross-Role and Cookie Isolation", async (t) => {
  await t.test("Buyer token sent in seller_token cookie is rejected by authenticateSeller (403)", async () => {
    const buyerToken = jwt.sign(
      { customer_id: 101, role: "buyer" },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h" },
    );
    const req = { cookies: { seller_token: buyerToken }, headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await authenticateSeller(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.match(res.body.message, /seller privileges required/i);
  });

  await t.test("Seller token sent in buyer_token cookie is rejected by authenticateBuyer (403)", async () => {
    const sellerToken = jwt.sign(
      { student_id: 202, role: "seller" },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h" },
    );
    const req = { cookies: { buyer_token: sellerToken }, headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await authenticateBuyer(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.match(res.body.message, /buyer privileges required/i);
  });
});

test("CSRF Protection Middleware", async (t) => {
  await t.test("Safe HTTP methods (GET, HEAD, OPTIONS) pass through without CSRF headers", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      let nextCalled = false;
      const req = { method, originalUrl: "/api/buyer/artworks", headers: {} };
      const res = createMockRes();
      csrfProtection(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, true, `Method ${method} should pass through`);
    }
  });

  await t.test("PayMongo webhook is exempted from CSRF checks", () => {
    let nextCalled = false;
    const req = {
      method: "POST",
      originalUrl: "/api/payments/paymongo/webhook",
      headers: {},
    };
    const res = createMockRes();
    csrfProtection(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true, "Webhook route should bypass CSRF check");
  });

  await t.test("State-changing request with valid X-Requested-With header passes", () => {
    let nextCalled = false;
    const req = {
      method: "POST",
      originalUrl: "/api/buyer/cart/add",
      headers: {
        "x-requested-with": "XMLHttpRequest",
        origin: "http://localhost:5173",
      },
    };
    const res = createMockRes();
    csrfProtection(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  });

  await t.test("State-changing request from unauthorized cross-origin is blocked (403)", () => {
    const res = createMockRes();
    let nextCalled = false;
    const req = {
      method: "POST",
      originalUrl: "/api/seller/orders/status",
      headers: {
        origin: "https://malicious-evil-site.com",
        "x-requested-with": "XMLHttpRequest",
      },
    };
    csrfProtection(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    assert.match(res.body.message, /csrf/i);
  });
});

test("CORS Preflight Configuration", async (t) => {
  await t.test("Allows requested headers including cache-control and x-requested-with", () => {
    const corsMiddleware = cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    });
    const headers = {};
    const req = {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-headers": "cache-control, x-requested-with, x-recommendation-session",
      },
    };
    const res = {
      setHeader(k, v) { headers[k.toLowerCase()] = v; },
      getHeader(k) { return headers[k.toLowerCase()]; },
      end() {},
      statusCode: 200,
    };
    corsMiddleware(req, res, () => {});
    assert.equal(headers["access-control-allow-origin"], "http://localhost:5173");
    assert.equal(headers["access-control-allow-credentials"], "true");
    assert.match(headers["access-control-allow-headers"], /cache-control/i);
    assert.match(headers["access-control-allow-headers"], /x-requested-with/i);
    assert.match(headers["access-control-allow-headers"], /x-recommendation-session/i);
  });
});

test("JWT Revocation on Password Change & Logout", async (t) => {
  await t.test("rejects token when password_changed in token does not match DB", async () => {
    const staleToken = jwt.sign(
      { admin_id: 99, username: "admin_revoked", role: "admin", password_changed: 1 },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h" },
    );
    const req = { cookies: { admin_token: staleToken }, headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    const originalQuery = db.query;
    db.query = (sql, params, cb) => {
      if (typeof sql === "string" && sql.includes("FROM admin a")) {
        return cb(null, [{ password_changed: 2, role: "admin", is_banned: 0 }]);
      }
      return originalQuery.call(db, sql, params, cb);
    };

    try {
      await authenticateAdmin(req, res, () => { nextCalled = true; });
      assert.equal(res.statusCode, 401);
      assert.equal(nextCalled, false);
      assert.match(res.body.message, /expired due to a password change or logout/i);
    } finally {
      db.query = originalQuery;
    }
  });

  await t.test("accepts token when password_changed matches DB", async () => {
    const validToken = jwt.sign(
      { admin_id: 99, username: "admin_valid", role: "admin", password_changed: 2 },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1h" },
    );
    const req = { cookies: { admin_token: validToken }, headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    const originalQuery = db.query;
    db.query = (sql, params, cb) => {
      if (typeof sql === "string" && sql.includes("FROM admin a")) {
        return cb(null, [{ password_changed: 2, role: "admin", is_banned: 0 }]);
      }
      return originalQuery.call(db, sql, params, cb);
    };

    try {
      await authenticateAdmin(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
      assert.equal(req.user.admin_id, 99);
    } finally {
      db.query = originalQuery;
    }
  });
});

test("Centralized JWT Secret Safety", async (t) => {
  await t.test("throws error across all environments when JWT_SECRET is unset, too short, or weak", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;
    try {
      for (const env of ["development", "production", "test"]) {
        process.env.NODE_ENV = env;
        for (const weak of ["", "short", "my_super_secret_key", "secret", "changeme", "default_secret", "your_secret_key"]) {
          process.env.JWT_SECRET = weak;
          assert.throws(
            () => getJwtSecret(),
            /JWT_SECRET must be a high-entropy secret of at least 256 bits/,
            `Should fail in ${env} with secret: "${weak}"`
          );
        }
      }
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.JWT_SECRET = prevSecret;
    }
  });
});

test("Environment Configuration Validator (validateEnv)", async (t) => {
  const { validateEnv } = await import("../utils/validateEnv.js");

  await t.test("passes with valid runtime environment", () => {
    const result = validateEnv();
    assert.equal(result.valid, true);
  });

  await t.test("fails in production when third-party placeholders are present", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevB2 = process.env.B2_KEY_ID;
    try {
      process.env.NODE_ENV = "production";
      process.env.B2_KEY_ID = "dev_placeholder_b2_key_id";
      assert.throws(() => validateEnv(), /Environment configuration validation failed/);
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.B2_KEY_ID = prevB2;
    }
  });

  await t.test("fails when PAYOUT_ACCOUNT_ENCRYPTION_KEY is not a 64-hex key", () => {
    const prevKey = process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY;
    try {
      process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = "not-a-valid-hex-key";
      assert.throws(() => validateEnv(), /PAYOUT_ACCOUNT_ENCRYPTION_KEY must be a valid 64-character/);
    } finally {
      process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = prevKey;
    }
  });
});
