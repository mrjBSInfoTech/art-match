import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import test from "node:test";
import { authenticateAdmin } from "./adminAuthMiddleware.js";
import db from "../database/db.js";
import { getJwtSecret } from "../utils/jwtSecret.js";

const signingSecret = getJwtSecret();

const authenticateClaims = (claims, databaseRows) =>
  new Promise((resolve) => {
    const response = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
      clearCookie() {},
    };
    const request = {
      headers: {
        authorization: `Bearer ${jwt.sign(claims, signingSecret)}`,
      },
    };
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      db.query = originalQuery;
      resolve({ request, response, nextCalled });
    };
    let nextCalled = false;
    const originalQuery = db.query;
    db.query = (_sql, _params, callback) => {
      callback(null, databaseRows);
    };

    authenticateAdmin(request, response, () => {
      nextCalled = true;
      finish();
    });

    if (response.statusCode) finish();
  });

test("admin authentication rejects a deleted admin", async () => {
  const { response, nextCalled } = await authenticateClaims({ admin_id: 8 }, []);
  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("admin authentication rejects a banned admin", async () => {
  const { response, nextCalled } = await authenticateClaims(
    { admin_id: 8 },
    [{ password_changed: 1, role: "admin", is_banned: 1 }],
  );
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("admin authentication rejects an admin whose role is no longer allowed", async () => {
  const { response, nextCalled } = await authenticateClaims(
    { admin_id: 8 },
    [{ password_changed: 1, role: "viewer", is_banned: 0 }],
  );
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("admin authentication rejects a stale password token", async () => {
  const { response, nextCalled } = await authenticateClaims(
    { admin_id: 8, password_changed: 1 },
    [{ password_changed: 2, role: "admin", is_banned: 0 }],
  );
  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("admin authentication accepts a valid admin", async () => {
  const { request, nextCalled } = await authenticateClaims(
    { admin_id: 8, password_changed: 1 },
    [{ password_changed: 1, role: "admin", is_banned: 0 }],
  );
  assert.equal(nextCalled, true);
  assert.equal(request.user.admin_id, 8);
});
