import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import test from "node:test";
import { authenticateBuyer } from "./buyerAuthMiddleware.js";
import db from "../database/db.js";
import { getJwtSecret } from "../utils/jwtSecret.js";

const signingSecret = getJwtSecret();

const authenticateClaims = (claims, accessRow) =>
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

    db.query = (_sql, _params, callback) => {
      callback(null, accessRow);
    };
    authenticateBuyer(request, response, () => {
      nextCalled = true;
      finish();
    });
    setImmediate(() => {
      if (response.statusCode) finish();
    });
  });

test("buyer authentication rejects a banned buyer", async () => {
  const { response, nextCalled } = await authenticateClaims(
    { customer_id: 8, role: "buyer" },
    [{ strikes: 3, is_banned: 1 }],
  );
  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("buyer authentication accepts a valid buyer", async () => {
  const { request, nextCalled } = await authenticateClaims(
    { customer_id: 8, role: "buyer" },
    [{ strikes: 0, is_banned: 0 }],
  );
  assert.equal(nextCalled, true);
  assert.equal(request.user.customer_id, 8);
  assert.equal(request.user.role, "buyer");
});
