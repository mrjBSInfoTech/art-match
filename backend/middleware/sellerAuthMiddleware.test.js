import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import test from "node:test";
import { authenticateSeller } from "./sellerAuthMiddleware.js";
import db from "../database/db.js";
import { getJwtSecret } from "../utils/jwtSecret.js";

const signingSecret = getJwtSecret();

const authenticateClaims = (claims, studentRow, accessRow) =>
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
    };
    const request = {
      headers: {
        authorization: `Bearer ${jwt.sign(claims, signingSecret)}`,
      },
    };
    const originalQuery = db.query;
    let nextCalled = false;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      db.query = originalQuery;
      resolve({ request, response, nextCalled });
    };

    db.query = (sql, _params, callback) => {
      if (sql.includes("account_access")) {
        callback(null, accessRow);
      } else {
        callback(null, studentRow);
      }
    };
    authenticateSeller(request, response, () => {
      nextCalled = true;
      finish();
    });
    setImmediate(() => {
      if (response.statusCode) finish();
    });
  });

test("seller authentication rejects a deleted seller", async () => {
  const { response, nextCalled } = await authenticateClaims(
    { student_id: 8, role: "seller" },
    [],
    [],
  );
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("seller authentication rejects a banned seller", async () => {
  const { response, nextCalled } = await authenticateClaims(
    { student_id: 8, role: "seller" },
    [{ expire_date: "2099-01-01", is_expired: 0 }],
    [{ strikes: 3, is_banned: 1 }],
  );
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("seller authentication rejects an expired seller account", async () => {
  const { response, nextCalled } = await authenticateClaims(
    { student_id: 8, role: "seller" },
    [{ expire_date: "2020-01-01", is_expired: 1 }],
    [{ strikes: 0, is_banned: 0 }],
  );
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("seller authentication accepts a valid seller", async () => {
  const { request, nextCalled } = await authenticateClaims(
    { student_id: 8, role: "seller" },
    [{ expire_date: "2099-01-01", is_expired: 0 }],
    [{ strikes: 0, is_banned: 0 }],
  );
  assert.equal(nextCalled, true);
  assert.equal(request.user.student_id, 8);
  assert.equal(request.user.role, "seller");
});
