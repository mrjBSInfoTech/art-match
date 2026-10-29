import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "@swc/core";
import * as orderPayments from "../../../utils/orderPayments.js";

// Exercise the real checkout handlers with isolated API responses, no payments.
function renderCheckout(apiOverrides = {}) {
  const hooks = [], effects = [], cleanups = [], placed = [], validations = [], navigations = [];
  const windowListeners = new Map();
  let cursor = 0, dirty = false, tree;
  const items = [
    { artwork_id: 21, seller_id: 7, price: 600, title: "Painting" },
    { artwork_id: 22, seller_id: 8, price: 400, title: "Sculpture" },
  ];
  const quote = { voucher: { code: "ART-SAVE", student_id: 7 }, subtotal: 1000,
    eligible_subtotal: 600, minimum_purchase: 500, discount_amount: 60, total: 940 };
  const api = {
    fetchCart: async () => items,
    fetchAddresses: async () => [{ address_id: 3, is_current: true, city: "Test city" }],
    validateCheckoutVoucher: async (...args) => { validations.push(args); return quote; },
    placeBuyerOrder: async (...args) => { placed.push(args); return { orders: [] }; },
    ...apiOverrides,
  };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], next => { hooks[index] = typeof next === "function" ? next(hooks[index]) : next; dirty = true; }];
    },
    useRef(initial) { return hooks[cursor++] ||= { current: initial }; },
    useMemo(callback, deps) {
      const index = cursor++;
      if (!hooks[index] || deps.some((dep, i) => !Object.is(dep, hooks[index].deps[i]))) hooks[index] = { deps, value: callback() };
      return hooks[index].value;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!hooks[index] || deps.some((dep, i) => !Object.is(dep, hooks[index][i]))) {
        hooks[index] = deps;
        effects.push(() => { cleanups[index]?.(); cleanups[index] = callback(); });
      }
    },
  };
  const context = vm.createContext({
    React: react, exports: {}, console, Intl, Date, Number, String, Boolean, Promise,
    URLSearchParams, AbortController, setTimeout, clearTimeout,
    localStorage: { getItem: () => "" }, sessionStorage: { getItem: () => null },
    window: { addEventListener: (name, handler) => windowListeners.set(name, handler),
      removeEventListener: name => windowListeners.delete(name), location: { assign() {} }, dispatchEvent() {} },
    document: { visibilityState: "visible", addEventListener() {}, removeEventListener() {} },
    require(specifier) {
      if (specifier === "react") return react;
      if (specifier === "@mui/material") return new Proxy({}, { get: (_, key) => key });
      if (specifier === "react-helmet-async") return { Helmet: "Helmet" };
      if (specifier === "react-router-dom") return { useNavigate: () => navigate, useLocation: () => ({ search: "" }) };
      if (specifier.includes("orderPayments")) return orderPayments;
      if (specifier.includes("/api/")) return api;
      return { __esModule: true, default: specifier.split("/").pop() };
    },
  });
  const navigate = (...args) => navigations.push(args);
  const source = readFileSync(new URL("../../../pages/buyer/Checkout.jsx", import.meta.url), "utf8");
  const result = transformSync(source, { jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } }, module: { type: "commonjs" } });
  vm.runInContext(result.code, context);
  const render = () => { cursor = 0; dirty = false; tree = context.exports.default(); for (const effect of effects.splice(0)) effect(); };
  const nodesOf = node => Array.isArray(node) ? node.flatMap(nodesOf) : node == null || node === false ? [] :
    typeof node === "object" ? [node, ...nodesOf(node.props?.children)] : [node];
  const textOf = node => nodesOf(node).filter(item => ["string", "number"].includes(typeof item)).join(" ");
  render();
  return {
    items, placed, validations, navigations,
    async flush() { for (let i = 0; i < 5; i++) { await new Promise(resolve => setImmediate(resolve)); if (dirty) render(); } },
    voucher: () => nodesOf(tree).find(node => node?.type === "CheckoutVoucher"),
    button: label => nodesOf(tree).find(node => node?.type === "Button" && textOf(node) === label),
    summary: label => nodesOf(tree).find(node => node?.props?.label === label),
    selectCOD: () => nodesOf(tree).find(node => node?.type === "RadioGroup").props.onChange({ target: { value: "cod" } }),
    reloadCart: () => windowListeners.get("pageshow")({ persisted: true }),
    unmount: () => { for (const cleanup of cleanups) cleanup?.(); },
  };
}

test("a valid voucher updates totals and submits only the validated code", async () => {
  const page = renderCheckout();
  await page.flush();
  page.voucher().props.onCodeChange(" art-save ");
  await page.flush();
  await page.voucher().props.onApply();
  await page.flush();
  assert.deepEqual(JSON.parse(JSON.stringify(page.validations)), [["ART-SAVE", [21, 22]]]);
  assert.equal(page.voucher().props.voucher.total, 940);
  assert.match(page.summary("Voucher (ART-SAVE)").props.value, /60\.00/);
  assert.match(page.summary("Total Amount").props.value, /940/);
  page.selectCOD();
  await page.flush();
  await page.button("Place COD Order").props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(page.placed)), [[3, "cod", [21, 22], { voucherCode: "ART-SAVE", expectedTotalCentavos: 94000 }]]);
  page.unmount();
});

test("minimum-spend warnings prevent silently checking out without the entered voucher", async () => {
  const page = renderCheckout({ validateCheckoutVoucher: async () => { throw new Error("Invalid voucher: spend at least ₱800.00 on qualifying artworks."); } });
  await page.flush();
  page.voucher().props.onCodeChange("ART-SAVE");
  await page.flush();
  await page.voucher().props.onApply();
  await page.flush();
  assert.match(page.voucher().props.warning, /at least ₱800/);
  assert.equal(page.voucher().props.voucher, null);
  await page.button("Continue to Secure Payment").props.onClick();
  assert.equal(page.placed.length, 0);
  page.voucher().props.onRemove();
  await page.flush();
  assert.equal(page.voucher().props.warning, "");
  assert.match(page.summary("Total Amount").props.value, /1,000/);
  page.unmount();
});

test("editing the code or changing selected cart data clears the applied discount", async () => {
  const page = renderCheckout();
  await page.flush();
  page.voucher().props.onCodeChange("ART-SAVE");
  await page.flush();
  await page.voucher().props.onApply();
  await page.flush();
  page.items[0].price = 300;
  page.reloadCart();
  await page.flush();
  assert.equal(page.voucher().props.voucher, null);
  assert.match(page.voucher().props.warning, /items changed/);
  assert.match(page.summary("Total Amount").props.value, /700/);
  page.voucher().props.onCodeChange("OTHER");
  await page.flush();
  assert.equal(page.voucher().props.warning, "");
  page.unmount();
});

test("pending voucher validation blocks checkout and stale responses cannot restore a removed code", async () => {
  let finish;
  const page = renderCheckout({ validateCheckoutVoucher: () => new Promise(resolve => { finish = resolve; }) });
  await page.flush();
  page.voucher().props.onCodeChange("ART-SAVE");
  await page.flush();
  const checking = page.voucher().props.onApply();
  await page.flush();
  assert.equal(page.button("Continue to Secure Payment").props.disabled, true);
  await page.button("Continue to Secure Payment").props.onClick();
  assert.equal(page.placed.length, 0);
  page.voucher().props.onRemove();
  await page.flush();
  finish({ voucher: { code: "ART-SAVE" }, subtotal: 1000, discount_amount: 60, total: 940 });
  await checking;
  await page.flush();
  assert.equal(page.voucher().props.code, "");
  assert.equal(page.voucher().props.voucher, null);
  page.unmount();
});

test("checkout revalidation failure removes the old discount and shows the updated requirement", async () => {
  const page = renderCheckout({ placeBuyerOrder: async () => {
    throw Object.assign(new Error("Voucher requires at least ₱1,200.00 of eligible artworks."), { code: "voucher_invalid" });
  } });
  await page.flush();
  page.voucher().props.onCodeChange("ART-SAVE");
  await page.flush();
  await page.voucher().props.onApply();
  await page.flush();
  await page.button("Continue to Secure Payment").props.onClick();
  await page.flush();
  assert.equal(page.voucher().props.voucher, null);
  assert.match(page.voucher().props.warning, /at least ₱1,200/);
  assert.match(page.summary("Total Amount").props.value, /1,000/);
  page.unmount();
});
