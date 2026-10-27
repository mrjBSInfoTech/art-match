import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import test from "node:test";
import { authenticateAdmin } from "./adminAuthMiddleware.js";

const signingSecret = process.env.JWT_SECRET || "your_secret_key";

const authenticateClaims = (claims) => {
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
  let nextCalled = false;

  authenticateAdmin(request, response, () => {
    nextCalled = true;
  });

  return { request, response, nextCalled };
};

test("admin authentication rejects seller and customer tokens", () => {
  for (const claims of [
    { id: 17, student_id: 17, student_number: "STU-17" },
    { id: 23, username: "customer" },
  ]) {
    const { response, nextCalled } = authenticateClaims(claims);
    assert.equal(response.statusCode, 403);
    assert.equal(nextCalled, false);
  }
});

test("admin authentication accepts tokens with an admin identity", () => {
  const { request, nextCalled } = authenticateClaims({
    id: 8,
    admin_id: 8,
    role: "admin",
  });
  assert.equal(nextCalled, true);
  assert.equal(request.user.admin_id, 8);
});
