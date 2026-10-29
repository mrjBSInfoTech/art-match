import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "").replace(/^export /gm, "")
  .replace(/default router;?/, "");

const response = () => ({
  statusCode: 200, headers: {},
  set(name, value) { this.headers[name] = value; return this; },
  status(statusCode) { this.statusCode = statusCode; return this; },
  json(body) { this.body = body; return this; },
});

function permissionFixture(role, error = null, is_banned = 0) {
  const calls = [];
  const context = { db: { query(sql, params, callback) {
    calls.push({ sql, params: [...params] });
    callback(error, role == null ? [] : [{ role, is_banned }]);
  } } };
  vm.runInNewContext(source("../middleware/payoutAdminMiddleware.js") + "\nglobalThis.middleware = requirePayoutAdmin;", context);
  return { middleware: context.middleware, calls };
}

for (const role of ["admin", "super admin"]) {
  test(`current ${role} database role can access payout management`, () => {
    const current = permissionFixture(role);
    let proceeded = false;
    current.middleware({ user: { admin_id: 11, role: "moderator" } }, response(), () => { proceeded = true; });
    assert.equal(proceeded, true);
    assert.deepEqual(current.calls[0].params, [11]);
    assert.match(current.calls[0].sql, /FROM admin_role r/);
    assert.match(current.calls[0].sql, /account_access/);
  });
}

for (const role of ["moderator", "customize", "buyer", "seller", null]) {
  test(`database role ${role ?? "missing"} cannot use stale or forged admin claims for payouts`, () => {
    const current = permissionFixture(role);
    const res = response();
    let proceeded = false;
    current.middleware({ user: { admin_id: 11, role: "super admin", can_edit: true, can_add: true } }, res, () => { proceeded = true; });
    assert.equal(proceeded, false);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /finance access/);
  });
}

test("a permission database failure denies payout actions", () => {
  const current = permissionFixture(null, new Error("internal connection details"));
  const res = response();
  current.middleware({ user: { admin_id: 11 } }, res, () => assert.fail("Must not proceed"));
  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(res.body.message, /internal connection/);
});

test("a banned finance admin cannot use an old authenticated session for payouts", () => {
  const current = permissionFixture("super admin", null, 1);
  const res = response();
  current.middleware({ user: { admin_id: 11 } }, res, () => assert.fail("A banned administrator must not proceed"));
  assert.equal(res.statusCode, 403);
});

function routesFixture(path, overrides = {}) {
  const middleware = [];
  const routes = new Map();
  const calls = [];
  const authenticateAdmin = (_req, _res, next) => next();
  const requirePayoutAdmin = (_req, _res, next) => next();
  const authenticateSeller = (_req, _res, next) => next();
  const router = { use(...handlers) { middleware.push(...handlers); } };
  for (const method of ["get", "put", "post"]) {
    router[method] = (url, handler) => routes.set(`${method}:${url}`, handler);
  }
  const payoutService = Object.fromEntries(["list", "request", "approve", "reject", "approvals", "release", "send", "reconcile", "verifyRefund", "getAccount", "saveAccount", "capability"]
    .map((method) => [method, async (...args) => { calls.push({ method, args }); return method === "list" ? { orders: [{ payoutId: 21 }] } : {}; }]));
  Object.assign(payoutService, overrides);
  const context = {
    express: { Router: () => router }, authenticateAdmin, requirePayoutAdmin, authenticateSeller,
    payoutService, listPayoutInstitutions: async () => [], console: { error() {} },
  };
  vm.runInNewContext(source(path), context);
  return { middleware, routes, calls, authenticateAdmin, requirePayoutAdmin, authenticateSeller };
}

test("every admin payout route installs authentication and the narrow finance guard", () => {
  const current = routesFixture("../routes/admin/payouts.js");
  assert.equal(current.middleware[0], current.authenticateAdmin);
  assert.equal(current.middleware[1], current.requirePayoutAdmin);
  assert.deepEqual([...current.routes.keys()], ["get:/", "get:/:id", "get:/:id/approvals", "post:/:id/request", "post:/:id/approve", "post:/:id/reject", "post:/:id/release", "post:/:id/send", "post:/:id/reconcile", "post:/:id/refunds/verify"]);
  const res = response();
  current.middleware[2]({}, res, () => {});
  assert.equal(res.headers["Cache-Control"], "no-store");
});

for (const [path, method] of [["/:id/request", "request"], ["/:id/approve", "approve"], ["/:id/reject", "reject"], ["/:id/release", "release"], ["/:id/send", "send"], ["/:id/reconcile", "reconcile"], ["/:id/refunds/verify", "verifyRefund"]]) {
  test(`admin ${method} uses authenticated actor and route payout identity`, async () => {
    const current = routesFixture("../routes/admin/payouts.js");
    const body = method === "verifyRefund" ? { providerRefundId: "ref_test_fixture", returnRequestId: 61 } : {};
    await current.routes.get(`post:${path}`)({ user: { admin_id: 11 }, params: { id: "21" }, body }, response());
    assert.equal(current.calls[0].method, method);
    assert.equal(current.calls[0].args[0], "21");
    assert.equal(current.calls[0].args[1], 11);
    assert.equal(current.calls[0].args[2], body);
  });
}

test("admin route preserves safe business HTTP responses and sanitizes unexpected errors", async () => {
  const business = new Error("Seller payout destination is not configured."); business.status = 422;
  const current = routesFixture("../routes/admin/payouts.js", { send: async () => { throw business; } });
  const request = { user: { admin_id: 11 }, params: { id: "21" }, body: {} };
  const res = response();
  await current.routes.get("post:/:id/send")(request, res);
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.message, business.message);
  const unexpected = routesFixture("../routes/admin/payouts.js", { send: async () => { throw new Error("unsafe provider details"); } });
  const failed = response();
  await unexpected.routes.get("post:/:id/send")(request, failed);
  assert.equal(failed.statusCode, 500);
  assert.doesNotMatch(failed.body.message, /unsafe provider/);
});

test("missing payout detail returns 404", async () => {
  const current = routesFixture("../routes/admin/payouts.js", { list: async () => ({ orders: [] }) });
  const res = response();
  await current.routes.get("get:/:id")({ user: { admin_id: 11 }, params: { id: "999" } }, res);
  assert.equal(res.statusCode, 404);
});

test("seller account settings are scoped to authenticated seller and expose no transfer controls", async () => {
  const current = routesFixture("../routes/seller/payouts.js");
  assert.equal(current.middleware[0], current.authenticateSeller);
  assert.deepEqual([...current.routes.keys()], ["get:/institutions", "get:/", "put:/"]);
  await current.routes.get("get:/")({ user: { student_id: 17 }, query: { student_id: 999 } }, response());
  assert.equal(current.calls[0].method, "getAccount");
  assert.equal(current.calls[0].args[0], 17);
  const body = { student_id: 999, accountName: "Test Recipient" };
  await current.routes.get("put:/")({ user: { student_id: 17 }, body }, response());
  assert.equal(current.calls[1].method, "saveAccount");
  assert.equal(current.calls[1].args[0], 17, "React body cannot select a different seller");
  assert.equal(current.calls[1].args[1], body, "service allowlist performs backend field validation");
});
