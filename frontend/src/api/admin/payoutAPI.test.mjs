import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "@swc/core";

test("Payout API uses authenticated quorum endpoints without accepting client financial or approval fields", async () => {
  const calls = [];
  let requestInterceptor;
  let errorInterceptor;
  let cleared = false;
  let redirected = "";
  const api = {
    interceptors: {
      request: { use(callback) { requestInterceptor = callback; } },
      response: { use(_, callback) { errorInterceptor = callback; } },
    },
    async get(url) { calls.push({ method: "get", url }); return { data: { approval: {} } }; },
    async post(url, body) { calls.push({ method: "post", url, body }); return { data: { payout: {} } }; },
  };
  const context = vm.createContext({
    exports: {}, Promise,
    localStorage: { getItem: (key) => key === "admin_token" ? "controlled-test-token" : null },
    window: { location: { assign(value) { redirected = value; } } },
    require(specifier) {
      if (specifier === "axios") return { __esModule: true, default: { create: () => api } };
      if (specifier.includes("utils/auth")) return { clearAuthData: (role) => { assert.equal(role, "admin"); cleared = true; } };
      throw new Error(`Unexpected module ${specifier}`);
    },
  });
  const code = transformSync(readFileSync(new URL("./payoutAPI.js", import.meta.url), "utf8"), { jsc: { parser: { syntax: "ecmascript" } }, module: { type: "commonjs" } }).code;
  vm.runInContext(code, context);
  const exports = context.exports;
  assert.equal(requestInterceptor({ headers: {} }).headers.Authorization, "Bearer controlled-test-token");
  await exports.fetchAdminPayouts();
  await exports.requestSellerPayout(9, { amount: 1, adminId: 1 });
  await exports.approveSellerPayout(9, "  Checked  ", { approved: true, approvalCount: 3 });
  await exports.rejectSellerPayout(9, "  Correct destination  ", { adminId: 12 });
  await exports.releaseSellerPayout(9, { provider: "paymongo", accountNumber: "fake", amount: 1, approvalCount: 3 });
  await exports.fetchSellerPayoutApprovals(9);
  await exports.reconcileSellerPayout(9);
  await exports.verifySellerPayoutRefund(9, "re_existing", 4);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    { method: "get", url: "/" },
    { method: "post", url: "/9/request", body: {} },
    { method: "post", url: "/9/approve", body: { comment: "Checked" } },
    { method: "post", url: "/9/reject", body: { comment: "Correct destination" } },
    { method: "post", url: "/9/release", body: {} },
    { method: "get", url: "/9/approvals" },
    { method: "post", url: "/9/reconcile", body: {} },
    { method: "post", url: "/9/refunds/verify", body: { providerRefundId: "re_existing", returnRequestId: 4 } },
  ]);
  const failure = { response: { status: 401 } };
  await assert.rejects(errorInterceptor(failure), (value) => value === failure);
  assert.equal(cleared, true);
  assert.equal(redirected, "/admin/login");
});
