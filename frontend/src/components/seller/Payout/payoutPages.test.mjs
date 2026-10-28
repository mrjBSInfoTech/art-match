import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "@swc/core";
import * as display from "./payoutDisplay.js";

// Run real component effects and event handlers with controlled HTTP responses.
const renderComponent = (file, api) => {
  const hooks = [];
  const effects = [];
  let cursor = 0;
  let dirty = false;
  let tree;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
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
  const render = () => { cursor = 0; dirty = false; tree = Component({}); for (const effect of effects.splice(0)) effect(); };
  const nodesOf = (node) => Array.isArray(node) ? node.flatMap(nodesOf) : node === null || node === undefined || node === false ? [] :
    typeof node === "object" ? [node, ...nodesOf(node.props?.children)] : [node];
  const textOf = (node) => nodesOf(node).filter((item) => ["string", "number"].includes(typeof item)).join(" ");
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
  accountName: "Test Seller", maskedAccountNumber: "09******1234" };
const payout = { payoutId: 9, orderId: 12, orderNumber: "AM-000012", sellerId: 7, sellerName: "Test Seller", paymentStatus: "Paid",
  gross: 1000, refundAmount: 0, payoutAmount: 1000, payoutStatus: "Eligible", destination: account };
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
  assert.equal(page.field("Account number").props.value, "");
  page.field("Account number").props.onChange({ target: { value: "09123451234" } });
  await page.flush();
  await page.nodes().find((item) => item?.props?.component === "form").props.onSubmit({ preventDefault() {} });
  await page.flush();
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ institutionCode: institution.code, provider: "instapay", accountName: "Test Seller", accountNumber: "09123451234" }]);
  assert.equal(page.field("Account number"), undefined);
  assert.equal(page.text().includes("09123451234"), false);
  page.button("Update payout destination").props.onClick();
  await page.flush();
  assert.equal(page.field("Account number").props.value, "");
});

test("Institution API failure preserves the saved masked destination and prevents fabricated institution entry", async () => {
  const page = renderComponent("./PayoutAccount.jsx", { ...accountApi, fetchPayoutInstitutions: async () => { throw new Error("Provider institutions unavailable"); } });
  await page.flush();
  assert.match(page.text(), /09\*{6}1234/);
  assert.match(page.text(), /Provider institutions unavailable/);
  assert.equal(page.button("Update payout destination").props.disabled, true);
});

test("Admin cannot send an Eligible payout when provider capability is blocked", async () => {
  let sends = 0;
  const page = renderComponent("../../../pages/admin/Payout.jsx", { fetchAdminPayouts: async () => ({ orders: [payout], totals: {}, providerCapability: { enabled: false, message: "Wallet enablement required" } }), sendSellerPayout: async () => { sends++; } });
  await page.flush();
  page.nodes().find((item) => item?.type === "PayoutTable").props.onReview(payout);
  await page.flush();
  assert.equal(page.button("Send Payout").props.disabled, true);
  await page.button("Send Payout").props.onClick();
  assert.equal(sends, 0);
  assert.match(page.text(), /Wallet enablement required/);
});

test("Admin Send is guarded against double clicks, sends only payout ID and waits for provider state", async () => {
  let resolveSend;
  const calls = [];
  let current = payout;
  const page = renderComponent("../../../pages/admin/Payout.jsx", {
    fetchAdminPayouts: async () => ({ orders: [current], totals: {}, providerCapability: capability }),
    sendSellerPayout: (...args) => { calls.push(args); return new Promise((resolve) => { resolveSend = resolve; }); },
  });
  await page.flush();
  page.nodes().find((item) => item?.type === "PayoutTable").props.onReview(payout);
  await page.flush();
  const button = page.button("Send Payout");
  const first = button.props.onClick();
  await button.props.onClick();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls, [[9]]);
  current = { ...payout, payoutStatus: "Processing" };
  resolveSend({ payout: current });
  await first;
  await page.flush();
  assert.equal(page.button("Send Payout"), undefined);
  assert.ok(page.button("Check provider status"));
  const chips = page.nodes().filter((item) => item?.type === "Chip");
  assert.equal(chips.at(-1).props.label, "Processing");
});

test("Provider reconciliation uses persisted Paid result rather than setting success locally", async () => {
  let current = { ...payout, payoutStatus: "Processing" };
  const page = renderComponent("../../../pages/admin/Payout.jsx", {
    fetchAdminPayouts: async () => ({ orders: [current], totals: {}, providerCapability: capability }),
    reconcileSellerPayout: async (id) => { assert.equal(id, 9); current = { ...payout, payoutStatus: "Paid" }; return { payout: current }; },
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
