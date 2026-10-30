import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "@swc/core";
import * as display from "./payoutDisplay.js";

// Run real component effects and event handlers with controlled HTTP responses.
const renderComponent = (file, api, props = {}) => {
  const hooks = [];
  const effects = [];
  let cursor = 0;
  let dirty = false;
  let tree;
  const react = {
    createElement: (type, props, ...children) => typeof type === "function" ? type({ ...props, children }) : ({ type, props: { ...props, children } }),
    forwardRef: (component) => component,
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], (next) => { hooks[index] = typeof next === "function" ? next(hooks[index]) : next; dirty = true; }];
    },
    useRef(initial) { const index = cursor++; return hooks[index] ||= { current: initial }; },
    useEffect(callback, dependencies) {
      const index = cursor++;
      if (!hooks[index] || dependencies.some((value, i) => !Object.is(value, hooks[index][i]))) {
        hooks[index] = dependencies;
        effects.push(callback);
      }
    },
  };
  const context = vm.createContext({
    React: react, exports: {}, console, Intl, Date, Number, String, Boolean, Promise,
    localStorage: { setItem() { throw new Error("Payout details must not be persisted in localStorage"); } },
    require(specifier) {
      if (specifier === "react") return react;
      if (specifier === "@mui/material") return new Proxy({}, { get: (_, key) => key });
      if (specifier === "@mui/material/styles") return { useTheme: () => ({ palette: { background: {}, text: {} } }) };
      if (specifier.includes("PayoutForm")) {
        const formSource = readFileSync(new URL("../../admin/Payout/PayoutForm.jsx", import.meta.url), "utf8");
        const formResult = transformSync(formSource, { jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } }, module: { type: "commonjs" } });
        const formCtx = vm.createContext({ React: react, exports: {}, require: context.require });
        vm.runInContext(formResult.code, formCtx);
        return formCtx.exports;
      }
      if (specifier === "react-helmet-async") return { Helmet: "Helmet" };
      if (specifier.includes("payoutDisplay")) return display;
      if (specifier.includes("/api/")) return api;
      return { __esModule: true, default: specifier.split("/").pop() };
    },
  });
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const result = transformSync(source, { jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } }, module: { type: "commonjs" } });
  vm.runInContext(result.code, context);
  const Component = context.exports.default;
  const render = () => { cursor = 0; dirty = false; tree = Component(props); for (const effect of effects.splice(0)) effect(); };
  const nodesOf = (node) => Array.isArray(node) ? node.flatMap(nodesOf) : node === null || node === undefined || node === false ? [] :
    typeof node === "object" ? [node, ...nodesOf(node.props?.children)] : [node];
  const textOf = (node) => nodesOf(node).filter((item) => ["string", "number"].includes(typeof item)).join(" ").replace(/\s+/g, " ");
  render();
  return {
    async flush() { for (let i = 0; i < 6; i++) { await new Promise((resolve) => setImmediate(resolve)); if (dirty) render(); } },
    nodes: () => nodesOf(tree), text: () => textOf(tree),
    button: (label) => nodesOf(tree).find((item) => item?.type === "Button" && textOf(item) === label),
    field: (label) => nodesOf(tree).find((item) => item?.type === "TextField" && item.props.label === label),
  };
};

const capability = { enabled: true, mode: "TEST", message: "TEST payout provider enabled" };
const institution = { code: "canonical-test-code", name: "Test E-wallet", provider: "instapay", destinationType: "ewallet" };
const account = { destinationType: "ewallet", institutionCode: institution.code, institutionName: institution.name, provider: institution.provider,
  accountName: "Test Seller", accountNumber: "09123451234", maskedAccountNumber: "09******1234" };
const payout = { payoutId: 9, orderId: 12, orderNumber: "AM-000012", sellerId: 7, sellerName: "Test Seller", paymentStatus: "Paid",
  gross: 1000, refundAmount: 0, payoutAmount: 1000, payoutStatus: "Eligible", destination: account,
  approval: { status: "Not Requested", approvalCount: 0, requiredApprovals: 3, decisions: [] }, actions: { canRequest: true } };
const accountApi = {
  fetchPayoutAccount: async () => ({ account, capability }),
  fetchPayoutInstitutions: async () => ({ institutions: [institution], capability }),
};

test("Seller destination uses provider institutions and clears the full account number after saving", async () => {
  const calls = [];
  const page = renderComponent("./PayoutAccount.jsx", { ...accountApi, savePayoutAccount: async (body) => { calls.push(body); return { account, capability }; } });
  await page.flush();
  assert.match(page.text(), /09\*{6}1234/);
  page.button("Update payout destination").props.onClick();
  await page.flush();
  assert.equal(page.field("Account number").props.value, "09123451234");
  page.field("Account number").props.onChange({ target: { value: "09123451234" } });
  await page.flush();
  await page.nodes().find((item) => item?.props?.component === "form").props.onSubmit({ preventDefault() {} });
  await page.flush();
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ institutionCode: institution.code, provider: "instapay", accountName: "Test Seller", accountNumber: "09123451234" }]);
  assert.equal(page.field("Account number"), undefined);
  assert.equal(page.text().includes("09123451234"), false);
  page.button("Update payout destination").props.onClick();
  await page.flush();
  assert.equal(page.field("Account number").props.value, "09123451234");
});

test("Institution API failure preserves the saved masked destination and prevents fabricated institution entry", async () => {
  const page = renderComponent("./PayoutAccount.jsx", { ...accountApi, fetchPayoutInstitutions: async () => { throw new Error("Provider institutions unavailable"); } });
  await page.flush();
  assert.match(page.text(), /09\*{6}1234/);
  assert.match(page.text(), /Provider institutions unavailable/);
  assert.equal(page.button("Update payout destination").props.disabled, true);
});

test("Admin release remains blocked by provider capability even after approvals", async () => {
  let releases = 0;
  const approved = { ...payout, approval: { ...payout.approval, status: "Approved", approvalCount: 3 }, actions: { canRelease: true } };
  const page = renderComponent("../../../pages/admin/Payout.jsx", { fetchAdminPayouts: async () => ({ orders: [approved], totals: {}, providerCapability: { enabled: false, message: "Wallet enablement required" } }), releaseSellerPayout: async () => { releases++; } });
  await page.flush();
  page.nodes().find((item) => item?.type === "PayoutTable").props.onReview(approved);
  await page.flush();
  assert.equal(page.button("Release Payout").props.disabled, true);
  await page.button("Release Payout").props.onClick();
  assert.equal(releases, 0);
  assert.match(page.text(), /Wallet enablement required/);
});

test("Request is guarded against double clicks, sends only ID and never releases without independent approvals", async () => {
  let resolveRequest;
  const calls = [];
  let current = payout;
  const page = renderComponent("../../../pages/admin/Payout.jsx", {
    fetchAdminPayouts: async () => ({ orders: [current], totals: {}, providerCapability: capability }),
    requestSellerPayout: (...args) => { calls.push(args); return new Promise((resolve) => { resolveRequest = resolve; }); },
  });
  await page.flush();
  page.nodes().find((item) => item?.type === "PayoutTable").props.onReview(payout);
  await page.flush();
  const button = page.button("Request Payout");
  const first = button.props.onClick();
  await button.props.onClick();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls, [[9]]);
  current = { ...payout, approval: { status: "Pending Approval", requestedByAdminId: 11, requestedByName: "Requester", approvalCount: 0, requiredApprovals: 3, decisions: [] }, actions: {} };
  resolveRequest({ payout: current });
  await first;
  await page.flush();
  assert.equal(page.button("Request Payout"), undefined);
  assert.equal(page.button("Release Payout"), undefined);
  assert.equal(page.button("Approve"), undefined);
  assert.match(page.text(), /0 \/ 3/);
  assert.match(page.text(), /Requester \(ID 11\)/);
});

test("Provider reconciliation uses persisted Paid result rather than setting success locally", async () => {
  let current = { ...payout, payoutStatus: "Processing", actions: { canReconcile: true } };
  const page = renderComponent("../../../pages/admin/Payout.jsx", {
    fetchAdminPayouts: async () => ({ orders: [current], totals: {}, providerCapability: capability }),
    reconcileSellerPayout: async (id) => { assert.equal(id, 9); current = { ...payout, payoutStatus: "Paid", actions: {} }; return { payout: current }; },
  });
  await page.flush();
  page.nodes().find((item) => item?.type === "PayoutTable").props.onReview(current);
  await page.flush();
  await page.button("Check provider status").props.onClick();
  await page.flush();
  assert.equal(page.nodes().filter((item) => item?.type === "Chip").at(-1).props.label, "Paid");
  assert.equal(page.button("Send Payout"), undefined);
});

test("Refund verification requires the completed return and submits provider evidence without a client amount", async () => {
  let current = { ...payout, payoutStatus: "Held", returnRequests: [{ returnRequestId: 4, status: "Completed", returnedAmount: 250, refundedAmount: 0 }] };
  const calls = [];
  const page = renderComponent("../../../pages/admin/Payout.jsx", {
    fetchAdminPayouts: async () => ({ orders: [current], totals: {}, providerCapability: capability }),
    verifySellerPayoutRefund: async (...args) => { calls.push(args); current = { ...current, refundAmount: 250, payoutAmount: 750 }; return { payout: current }; },
  });
  await page.flush();
  page.nodes().find((item) => item?.type === "PayoutTable").props.onReview(current);
  await page.flush();
  assert.match(page.text(), /does not send a refund/);
  page.field("PayMongo refund ID").props.onChange({ target: { value: "re_test_evidence" } });
  await page.flush();
  assert.equal(page.button("Verify existing refund").props.disabled, true);
  await page.button("Verify existing refund").props.onClick();
  assert.equal(calls.length, 0);
  page.field("Completed return request").props.onChange({ target: { value: 4 } });
  await page.flush();
  assert.equal(page.button("Verify existing refund").props.disabled, false);
  await page.button("Verify existing refund").props.onClick();
  await page.flush();
  assert.deepEqual(calls, [[9, "re_test_evidence", 4]]);
  assert.equal(page.field("PayMongo refund ID").props.value, "");
});

test("Each independent approval shows its server count, and the third approval still needs explicit release", async () => {
  for (const previousCount of [0, 1, 2]) {
    const calls = [];
    let current = { ...payout, approval: { ...payout.approval, status: "Pending Approval", requestedByAdminId: 11, requestedByName: "Requester", approvalCount: previousCount }, actions: { canApprove: true, canReject: true } };
    const page = renderComponent("../../../pages/admin/Payout.jsx", {
      fetchAdminPayouts: async () => ({ orders: [current], totals: {}, providerCapability: capability }),
      approveSellerPayout: async (...args) => {
        calls.push(args);
        current = { ...current, approval: { ...current.approval, approvalCount: previousCount + 1, status: previousCount === 2 ? "Approved" : "Pending Approval" }, actions: previousCount === 2 ? { canRelease: true } : {} };
        return { payout: current };
      },
      releaseSellerPayout: () => { throw new Error("Approval must not automatically execute provider release"); },
    });
    await page.flush();
    page.nodes().find((item) => item?.type === "PayoutTable").props.onReview(current);
    await page.flush();
    await page.button("Approve").props.onClick();
    await page.flush();
    assert.deepEqual(calls, [[9, ""]]);
    assert.match(page.text(), new RegExp(`${previousCount + 1} / 3`));
    assert.equal(page.button("Approve"), undefined, "already-voted actor loses the approval action");
    assert.equal(Boolean(page.button("Release Payout")), previousCount === 2);
    if (previousCount === 2) assert.match(page.text(), /Approved for Release/);
  }
});

test("Server permissions prevent requester or read-only admins from voting or releasing", async () => {
  const current = { ...payout, approval: { ...payout.approval, status: "Pending Approval", requestedByAdminId: 11, approvalCount: 2 }, actions: {} };
  const page = renderComponent("../../../pages/admin/Payout.jsx", { fetchAdminPayouts: async () => ({ orders: [current], totals: {}, providerCapability: capability }) });
  await page.flush();
  page.nodes().find((item) => item?.type === "PayoutTable").props.onReview(current);
  await page.flush();
  for (const action of ["Approve", "Reject", "Request Payout", "Release Payout"]) assert.equal(page.button(action), undefined);
  assert.match(page.text(), /requester cannot approve/);
});

test("Reject requires a comment and sends no client approval count, identity, amount or provider", async () => {
  const calls = [];
  let current = { ...payout, approval: { ...payout.approval, status: "Pending Approval", requestedByAdminId: 11 }, actions: { canApprove: true, canReject: true } };
  const page = renderComponent("../../../pages/admin/Payout.jsx", {
    fetchAdminPayouts: async () => ({ orders: [current], totals: {}, providerCapability: capability }),
    rejectSellerPayout: async (...args) => { calls.push(args); current = { ...current, approval: { ...current.approval, status: "Rejected" }, actions: { canRequest: true } }; return { payout: current }; },
  });
  await page.flush();
  page.nodes().find((item) => item?.type === "PayoutTable").props.onReview(current);
  await page.flush();
  assert.equal(page.button("Reject").props.disabled, true);
  await page.button("Reject").props.onClick();
  assert.equal(calls.length, 0);
  page.field("Approval comment").props.onChange({ target: { value: "  Correct the payout destination.  " } });
  await page.flush();
  await page.button("Reject").props.onClick();
  await page.flush();
  assert.deepEqual(calls, [[9, "Correct the payout destination."]]);
  assert.match(page.text(), /Approval rejected/);
  assert.equal(page.button("Release Payout"), undefined);
  assert.ok(page.button("Request Payout"), "new cycle can be requested only when authorized by the server");
});

test("Explicit release is double-click guarded and only displays Paid after persisted provider result", async () => {
  let resolveRelease;
  const calls = [];
  let current = { ...payout, approval: { ...payout.approval, status: "Approved", approvalCount: 3 }, actions: { canRelease: true } };
  const page = renderComponent("../../../pages/admin/Payout.jsx", {
    fetchAdminPayouts: async () => ({ orders: [current], totals: {}, providerCapability: capability }),
    releaseSellerPayout: (...args) => { calls.push(args); return new Promise((resolve) => { resolveRelease = resolve; }); },
  });
  await page.flush();
  page.nodes().find((item) => item?.type === "PayoutTable").props.onReview(current);
  await page.flush();
  const release = page.button("Release Payout");
  const first = release.props.onClick();
  await release.props.onClick();
  assert.deepEqual(calls, [[9]]);
  current = { ...current, payoutStatus: "Paid", payoutProvider: "paymongo", providerTransferId: "tr_test_123", actions: {} };
  resolveRelease({ payout: current });
  await first;
  await page.flush();
  assert.equal(page.nodes().find((item) => item?.type === "Chip" && item.props.label === "Paid")?.props.label, "Paid");
  assert.match(page.text(), /tr_test_123/);
  assert.equal(page.button("Release Payout"), undefined);
});

test("Seller ledger and metrics display only actual payout statuses without demo labels", async () => {
  const paidRow = { ...payout, payoutStatus: "Paid", payoutProvider: "paymongo", providerTransferId: "tr_test_history" };
  const ledger = renderComponent("./PayoutTable.jsx", {}, { orders: [paidRow] });
  await ledger.flush();
  assert.equal(ledger.nodes().find((item) => item?.type === "Chip" && item.props.label === "Paid")?.props.label, "Paid");
  assert.equal(ledger.text().includes("Paid (Demo)"), false);
  assert.equal(ledger.text().includes("No money moved"), false);
  assert.match(ledger.text(), /Your payout has been completed\./);
  const metrics = renderComponent("./PayoutMetrics.jsx", {}, { totals: { paid: 1000 } });
  await metrics.flush();
  assert.equal(metrics.text().includes("Paid (Demo)"), false);
  assert.equal(metrics.text().includes("excludes demo payouts"), false);
});

test("Seller ledger shows approval progression without offering admin actions", async () => {
  for (const [status, count, label] of [["Pending Approval", 1, "Awaiting admin approval"], ["Pending Approval", 2, "Awaiting admin approval"], ["Approved", 3, "Approved for payout"]]) {
    const ledger = renderComponent("./PayoutTable.jsx", {}, { orders: [{ ...payout, approval: { ...payout.approval, status, approvalCount: count } }] });
    await ledger.flush();
    assert.match(ledger.text(), new RegExp(label));
    assert.match(ledger.text(), new RegExp(`${count} / 3 approvals`));
    assert.equal(ledger.button("Approve"), undefined);
    assert.equal(ledger.button("Release Payout"), undefined);
  }
});
