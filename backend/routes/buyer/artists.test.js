import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";

const routeSource = readFileSync(new URL("./artists.js", import.meta.url), "utf8")
  .replace(/^import .*?;\s*/gm, "")
  .replace("export default router;", "");

const createRouteHarness = () => {
  const routes = new Map();
  const students = new Set([11, 12]);
  const follows = new Set();
  const handlers = {};
  const queries = [];
  const db = {
    query(sql, params, callback) {
      queries.push({ sql, params });
      if (typeof params === "function") callback = params;
      if (/SELECT artist_ratings\.student_id/.test(sql)) {
        const buyerId = params[0];
        const followerCount = (studentId) =>
          [...follows].filter((follow) => Number(follow.split(":")[1]) === studentId).length;
        callback(null, [
          { student_id: 11, averageRating: "4.3", followerCount: String(followerCount(11)), isFollowing: follows.has(`${buyerId}:11`) ? 1 : 0 },
          { student_id: 12, averageRating: null, followerCount: String(followerCount(12)), isFollowing: follows.has(`${buyerId}:12`) ? 1 : 0 },
        ]);
      } else if (/SELECT student_id FROM student/.test(sql)) {
        callback(null, students.has(Number(params[0])) ? [{ student_id: Number(params[0]) }] : []);
      } else if (/INSERT IGNORE INTO customer_artist_follow/.test(sql)) {
        follows.add(`${params[0]}:${params[1]}`);
        callback(null, { affectedRows: 1 });
      } else if (/DELETE FROM customer_artist_follow/.test(sql)) {
        follows.delete(`${params[0]}:${params[1]}`);
        callback(null, { affectedRows: 1 });
      } else if (/SELECT COUNT\(\*\) AS followerCount/.test(sql)) {
        const studentId = Number(params[0]);
        const count = [...follows].filter((follow) => Number(follow.split(":")[1]) === studentId).length;
        callback(null, [{ followerCount: count }]);
      } else {
        throw new Error(`Unexpected query: ${sql}`);
      }
    },
  };
  const auth = () => {};
  const express = { Router: () => ({
    get: (path, ...callbacks) => routes.set(`GET ${path}`, callbacks),
    post: (path, ...callbacks) => routes.set(`POST ${path}`, callbacks),
    delete: (path, ...callbacks) => routes.set(`DELETE ${path}`, callbacks),
  }) };
  const context = vm.createContext({ express, db, authenticateBuyer: auth, console });
  vm.runInContext(routeSource, context);

  const invoke = (method, path, {
    customerId = 1, studentId, params = {}, body = {},
  } = {}) => {
    let responseBody;
    let statusCode = 200;
    let cacheControl;
    const response = {
      set: (name, value) => { if (name === "Cache-Control") cacheControl = value; return response; },
      status: (status) => { statusCode = status; return response; },
      json: (body) => { responseBody = body; return response; },
    };
    const route = routes.get(`${method} ${path}`);
    assert.ok(route, `Route ${method} ${path} should exist`);
    const handler = route[route.length - 1];
    handler({
      params: { ...(studentId === undefined ? {} : { studentId: String(studentId) }), ...params },
      body,
      user: customerId === undefined ? {} : { customer_id: customerId },
    }, response);
    return { statusCode, body: responseBody, cacheControl };
  };

  const normalize = (value) => JSON.parse(JSON.stringify(value));
  return { invoke, follows, queries, auth, routes, normalize };
};

test("artist ratings average per-artwork scores, ignore unrated artworks, and return no-review artists as zero", () => {
  const { invoke, queries, normalize } = createRouteHarness();
  const result = invoke("GET", "/");
  assert.deepEqual(normalize(result.body), [
    { student_id: 11, averageRating: 4.3, followerCount: 0, isFollowing: false },
    { student_id: 12, averageRating: 0, followerCount: 0, isFollowing: false },
  ]);
  const query = queries[0].sql;
  assert.match(query, /FROM artwork_reviews[\s\S]*GROUP BY artwork_id/);
  assert.match(query, /AVG\(review_averages\.average_rating\) AS average_rating/);
  assert.match(query, /ROUND\(artist_ratings\.average_rating, 1\)/);
  assert.match(query, /AND buyer_follows\.customer_id = \?/);
  assert.match(query, /WHERE artwork_id IS NOT NULL AND rating BETWEEN 1 AND 5/);
  assert.equal(result.cacheControl, "no-store");
});

test("following is unique, buyer-scoped, counts update, and unfollow is idempotent", () => {
  const { invoke, follows, routes, auth, normalize } = createRouteHarness();
  for (const route of routes.values()) {
    assert.equal(route[route.length - (route.length === 2 ? 2 : 3)], auth);
  }

  assert.deepEqual(normalize(invoke("POST", "/:studentId/follow", {
    customerId: 1, studentId: 11, body: { customer_id: 999, followerCount: 900 },
  }).body),
    { student_id: 11, followerCount: 1, isFollowing: true });
  assert.deepEqual(normalize(invoke("POST", "/:studentId/follow", { customerId: 1, studentId: 11 }).body),
    { student_id: 11, followerCount: 1, isFollowing: true });
  assert.equal(invoke("GET", "/", { customerId: 2 }).body[0].isFollowing, false);
  assert.deepEqual(normalize(invoke("POST", "/:studentId/follow", { customerId: 2, studentId: 11 }).body),
    { student_id: 11, followerCount: 2, isFollowing: true });
  assert.equal(follows.size, 2);

  const buyerOneSummary = invoke("GET", "/", { customerId: 1 }).body;
  const buyerTwoSummary = invoke("GET", "/", { customerId: 2 }).body;
  assert.equal(buyerOneSummary[0].isFollowing, true);
  assert.equal(buyerTwoSummary[0].isFollowing, true);
  assert.equal(buyerOneSummary[1].isFollowing, false);

  assert.deepEqual(normalize(invoke("POST", "/:studentId/follow", { customerId: 1, studentId: 12 }).body),
    { student_id: 12, followerCount: 1, isFollowing: true });
  assert.deepEqual(normalize(invoke("DELETE", "/:studentId/follow", { customerId: 1, studentId: 11 }).body),
    { student_id: 11, followerCount: 1, isFollowing: false });
  assert.deepEqual(normalize(invoke("DELETE", "/:studentId/follow", { customerId: 1, studentId: 11 }).body),
    { student_id: 11, followerCount: 1, isFollowing: false });
  assert.equal(follows.has("2:11"), true);
  assert.equal(follows.has("1:12"), true);
  const refreshedBuyerOne = invoke("GET", "/", { customerId: 1 }).body;
  assert.equal(refreshedBuyerOne[0].isFollowing, false);
  assert.equal(refreshedBuyerOne[1].isFollowing, true);
  assert.equal(refreshedBuyerOne[1].followerCount, 1);
});

test("unauthenticated buyers receive 401 before a follow handler runs", () => {
  let statusCode = 200;
  const response = {
    status(status) { statusCode = status; return this; },
    json() { return this; },
  };
  authenticateBuyer({ headers: {} }, response, () => {
    assert.fail("Unauthenticated request must not continue");
  });
  assert.equal(statusCode, 401);
});

test("invalid artist ids are rejected and missing students cannot be followed", () => {
  const { invoke, queries } = createRouteHarness();
  assert.equal(invoke("POST", "/:studentId/follow", { studentId: "nope" }).statusCode, 400);
  assert.equal(invoke("POST", "/:studentId/follow", { studentId: 999 }).statusCode, 404);
  assert.equal(queries.filter(({ sql }) => /INSERT IGNORE/.test(sql)).length, 0);
});
