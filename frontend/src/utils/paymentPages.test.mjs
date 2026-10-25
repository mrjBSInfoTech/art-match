import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "@swc/core";
import * as paymentHelpers from "./orderPayments.js";

// Exercise the actual JSX handlers/effects without adding a browser or test framework dependency.
const pageHarness = (relativePath, { api = {}, orders = [], search = "", cart = [], addresses = [] } = {}) => {
  let hookIndex = 0;
  let dirty = true;
  const hooks = [];
  const effects = [];
  const cleanups = [];
  const timers = new Map();
  const events = [];
  const eventDetails = [];
  const redirects = [];
  const saved = new Map();
  const listeners = new Map();
  const renderedComponents = new Set();
  let timerId = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (initial) => {
      const index = hookIndex++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], (next) => { hooks[index] = typeof next === "function" ? next(hooks[index]) : next; dirty = true; }];
    },
    useRef: (initial) => { const index = hookIndex++; return hooks[index] ||= { current: initial }; },
    useEffect: (callback, dependencies) => {
      const index = hookIndex++;
      const previous = hooks[index];
      if (!previous || dependencies.some((dependency, item) => !Object.is(dependency, previous[item]))) {
        hooks[index] = dependencies;
        effects.push(() => { cleanups[index]?.(); cleanups[index] = callback(); });
      }
    },
    useMemo: (callback, dependencies) => {
      const index = hookIndex++;
      const previous = hooks[index];
      if (!previous || dependencies.some((dependency, item) => !Object.is(dependency, previous.dependencies[item]))) {
        hooks[index] = { dependencies, value: callback() };
      }
      return hooks[index].value;
    },
  };
  const navigate = (...args) => redirects.push(args);
  const router = { useLocation: () => ({ search }), useNavigate: () => navigate, Link: "RouterLink" };
  const mockApi = { fetchBuyerOrders: async () => orders, fetchSellerOrders: async () => orders,
    fetchPaymentMethods: async () => ({ payment_method_types: ["gcash", "paymaya", "card", "qrph"] }),
    fetchBuyerPayment: async () => ({ payment_status: orders[0]?.paymentStatus || "Pending", orders }),
    fetchCart: async () => cart, fetchAddresses: async () => addresses, ...api };
  const context = vm.createContext({
    React: react, exports: {}, console, URLSearchParams, Intl, Date, Number, String, Set, Map,
    AbortController, FormData, URL, Event,
    CustomEvent: class extends Event { constructor(type, options) { super(type); this.detail = options?.detail; } },
    localStorage: { getItem: () => "test-buyer" },
    sessionStorage: { getItem: (key) => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) },
    document: { visibilityState: "visible", addEventListener() {}, removeEventListener() {} },
    window: {
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name) => listeners.delete(name),
      dispatchEvent: (event) => { events.push(event.type); eventDetails.push(event.detail); },
      location: { assign: (url) => redirects.push(url) },
    },
    setTimeout: (callback) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id) => timers.delete(id),
    require: (specifier) => {
      if (specifier === "react") return react;
      if (specifier === "react-router-dom") return router;
      if (specifier.endsWith("orderPayments.js")) return paymentHelpers;
      if (specifier.endsWith("/buyer/Order/OrderGrid")) {
        const module = loadJsxModule("../components/buyer/Order/OrderGrid.jsx");
        renderedComponents.add(module.default);
        return module;
      }
      if (specifier.includes("/api/")) return mockApi;
      if (specifier === "@mui/material/styles") return { useTheme: () => ({ palette: { background: { paper: "white" }, text: { primary: "black", secondary: "grey" }, divider: "grey" } }) };
      if (specifier === "@mui/material") return new Proxy({}, { get: (_, name) => name });
      if (specifier === "react-helmet-async") return { Helmet: "Helmet" };
      if (specifier.includes("/buyer/Cart/")) return { __esModule: true, default: specifier };
      return { default: specifier };
    },
  });
  const loadJsxModule = (modulePath) => {
    const source = readFileSync(new URL(modulePath, import.meta.url), "utf8");
    const transformed = transformSync(source, {
      jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
      module: { type: "commonjs" },
    });
    const exports = {};
    vm.runInContext(`(function(exports) {\n${transformed.code}\n})`, context)(exports);
    return exports;
  };
  const Page = loadJsxModule(relativePath).default;
  let tree;
  const render = () => {
    hookIndex = 0;
    dirty = false;
    tree = Page();
    for (const effect of effects.splice(0)) effect();
  };
  const flush = async () => {
    for (let step = 0; step < 8; step++) {
      await new Promise((resolve) => setImmediate(resolve));
      if (dirty) render();
    }
  };
  const flatten = (node) => {
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (node === null || node === undefined || node === false) return [];
    if (renderedComponents.has(node.type)) return [node, ...flatten(node.type(node.props))];
    return typeof node === "object" ? [node, ...flatten(node.props?.children), ...flatten(node.props?.action)] : [node];
  };
  const nodes = () => flatten(tree);
  const text = (node = tree) => flatten(node).filter((item) => typeof item === "string" || typeof item === "number").join(" ");
  render();
  return {
    flush, nodes, text, timers, events, eventDetails, redirects, saved, listeners,
    button: (label) => nodes().find((node) => node?.type === "Button" && text(node) === label),
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
};

const pending = { orderId: 1, id: "ORDER-1", payment: "paymongo", paymentStatus: "Pending", paymentReference: "AM-first", status: "Pending", total: 1150, subtotal: 1000, date: "2026-10-25", address: "Test address", items: [] };

test("Checkout selects a saved address, prevents double submission and redirects top-level without client prices", async () => {
  let resolvePayment;
  const calls = [];
  const page = pageHarness("../pages/buyer/Checkout.jsx", {
    cart: [{ artwork_id: 10, seller_id: 1, price: 1000 }, { artwork_id: 20, seller_id: 2, price: 2000 }],
    addresses: [{ address_id: 1, is_current: 1 }, { address_id: 2, street_name: "Other address" }],
    api: { placeBuyerOrder: (...args) => { calls.push(args); return new Promise((resolve) => { resolvePayment = resolve; }); }, fetchBuyerPayment: async () => ({ payment_status: "Pending", orders: [pending] }) },
  });
  await page.flush();
  const address = page.nodes().find((node) => node?.type === "Select");
  address.props.onChange({ target: { value: 2 } });
  await page.flush();
  const submit = page.button("Continue to Secure Payment");
  const first = submit.props.onClick();
  await submit.props.onClick();
  assert.equal(calls.length, 1);
  assert.deepEqual([...calls[0]].slice(0, 2), [2, "paymongo"]);
  assert.deepEqual([...calls[0][2]], [10, 20]);
  assert.equal(calls[0].length, 3, "Online channel selection belongs on PayMongo");
  resolvePayment({ checkout_url: "https://checkout.test/one", payment_reference: "AM-first" });
  await first;
  assert.deepEqual(page.redirects, ["https://checkout.test/one"]);
  assert.equal(page.saved.get("paymongo_payment_reference"), "AM-first");
  page.listeners.get("pageshow")({ persisted: true });
  await page.flush();
  assert.equal(page.button("Continue payment")?.props.disabled, false);
  page.unmount();
});

test("checkout return waits for server Paid before opening Orders and refreshing the cart", async () => {
  let current = { payment_status: "Pending", orders: [pending] };
  const page = pageHarness("../pages/buyer/Checkout.jsx", { search: "?payment=success&reference=AM-first", api: { fetchBuyerPayment: async () => current } });
  await page.flush();
  assert.match(page.text(), /Payment has not been confirmed/);
  assert.doesNotMatch(page.text(), /Payment received/);
  assert.equal(page.button("Continue payment")?.props.disabled, false);
  assert.deepEqual(page.redirects, [], "A forged success query cannot create a purchase");
  assert.deepEqual(page.events, []);
  current = { payment_status: "Paid", orders: [{ ...pending, paymentStatus: "Paid", paymentChannel: "card" }] };
  const poll = [...page.timers.values()][0];
  await poll();
  await page.flush();
  assert.match(page.text(), /Payment received/);
  assert.equal(page.button("Continue payment"), undefined);
  assert.equal(page.button("Cancel checkout"), undefined);
  assert.deepEqual(page.events, ["cart-updated"]);
  assert.equal(page.redirects[0][0], "/buyer/profile/orders?payment=success&reference=AM-first");
  assert.equal(page.timers.size, 0);
  page.unmount();
});

test("checkout never confirms a partly paid or inaccessible payment group", async () => {
  const page = pageHarness("../pages/buyer/Checkout.jsx", {
    search: "?payment=success&reference=AM-first&artwork_ids=10",
    api: {
      fetchBuyerPayment: async () => ({ payment_status: "Paid", orders: [{ ...pending, paymentStatus: "Paid" }, { ...pending, orderId: 2 }] }),
      fetchCart: async () => { throw new Error("Paid items are already removed from the cart"); },
    },
  });
  await page.flush();
  assert.deepEqual(page.redirects, []);
  assert.deepEqual(page.events, []);
  assert.doesNotMatch(page.text(), /Payment received|Opening your orders/);
  assert.doesNotMatch(page.text(), /no longer in your cart|Paid items are already removed/);
  page.unmount();
  const forbidden = pageHarness("../pages/buyer/Checkout.jsx", {
    search: "?payment=success&reference=AM-other-buyer",
    api: { fetchBuyerPayment: async () => { throw new Error("Checkout not found"); } },
  });
  await forbidden.flush();
  assert.match(forbidden.text(), /Checkout not found/);
  assert.equal(forbidden.button("Continue payment"), undefined);
  assert.deepEqual(forbidden.redirects, []);
  forbidden.unmount();
});

test("initial checkout has only online payment and COD and leaves channel choice to PayMongo", async () => {
  const calls = [];
  let methodsCalls = 0;
  const page = pageHarness("../pages/buyer/Checkout.jsx", {
    cart: [{ artwork_id: 10, price: 1000 }], addresses: [{ address_id: 1 }],
    api: {
      fetchPaymentMethods: async () => { methodsCalls++; throw new Error("Must not preselect a channel"); },
      placeBuyerOrder: async (...args) => { calls.push(args); return { checkout_url: "https://checkout.test/all-methods" }; },
    },
  });
  await page.flush();
  const cards = page.nodes().filter((node) => node?.type?.name === "PaymentOptionCard");
  assert.deepEqual(cards.map((node) => node.props.title), ["Secure Online Payment", "Cash on Delivery"]);
  assert.equal(page.nodes().filter((node) => node?.type === "RadioGroup").length, 1);
  assert.equal(methodsCalls, 0);
  await page.button("Continue to Secure Payment").props.onClick();
  assert.equal(calls[0].length, 3);
  assert.deepEqual([...calls[0][2]], [10]);
  assert.deepEqual(page.redirects, ["https://checkout.test/all-methods"]);
  page.unmount();
});

test("online checkout errors remain understandable and COD stays usable", async () => {
  const calls = [];
  const page = pageHarness("../pages/buyer/Checkout.jsx", {
    cart: [{ artwork_id: 10, price: 1000 }], addresses: [{ address_id: 1 }],
    api: { placeBuyerOrder: async (...args) => {
      calls.push(args);
      if (args[1] === "paymongo") throw new Error("Online payment is unavailable");
      return { orders: [] };
    } },
  });
  await page.flush();
  await page.button("Continue to Secure Payment").props.onClick();
  await page.flush();
  assert.match(page.text(), /Online payment is unavailable/);
  page.nodes().find((node) => node?.type === "RadioGroup").props.onChange({ target: { value: "cod" } });
  await page.flush();
  assert.equal(page.button("Place COD Order").props.disabled, false);
  await page.button("Place COD Order").props.onClick();
  assert.equal(calls.at(-1)[1], "cod");
  page.unmount();
});

test("Checkout keeps the COD confirmation flow and allows retry after an understandable payment error", async () => {
  const calls = [];
  let fail = true;
  const page = pageHarness("../pages/buyer/Checkout.jsx", {
    cart: [{ artwork_id: 10, seller_id: 1, price: 1000 }],
    addresses: [{ address_id: 1, is_current: 1 }],
    api: { placeBuyerOrder: async (...args) => {
      calls.push(args);
      if (fail) throw new Error("Secure checkout is temporarily unavailable");
      return { orders: [{ id: "ORDER-1", total: 1150 }] };
    } },
  });
  await page.flush();
  await page.button("Continue to Secure Payment").props.onClick();
  await page.flush();
  assert.match(page.text(), /Secure checkout is temporarily unavailable/);
  assert.equal(page.button("Continue to Secure Payment")?.props.disabled, false);
  fail = false;
  page.nodes().find((node) => node?.type === "RadioGroup").props.onChange({ target: { value: "cod" } });
  await page.flush();
  await page.button("Place COD Order").props.onClick();
  assert.deepEqual([...calls[1]].slice(0, 2), [1, "cod"]);
  assert.deepEqual([...calls[1][2]], [10]);
  assert.equal(page.redirects[0][0], "/buyer/order-finish");
  assert.equal(page.redirects[0][1].state.paymentMethod, "cod");
  assert.equal(page.saved.size, 0);
  page.unmount();
});

test("a cancel URL alone does not mutate payment; manual resume and cancel use the shared reference", async () => {
  let current = [pending];
  const calls = [];
  const page = pageHarness("../pages/buyer/Checkout.jsx", {
    search: "?payment=cancelled&reference=AM-first",
    api: {
      fetchBuyerPayment: async () => ({ payment_status: current[0].paymentStatus, orders: current }),
      retryBuyerPayment: async (reference) => { calls.push(["retry", reference]); return { checkout_url: "https://checkout.test/one" }; },
      cancelBuyerPayment: async (reference) => { calls.push(["cancel", reference]); current = [{ ...pending, status: "Cancelled", paymentStatus: "Expired" }]; return { message: "Checkout cancelled" }; },
    },
  });
  await page.flush();
  assert.match(page.text(), /Payment has not been confirmed/);
  assert.deepEqual(calls, []);
  await page.button("Continue payment").props.onClick();
  assert.deepEqual(calls, [["retry", "AM-first"]]);
  assert.deepEqual(page.redirects, ["https://checkout.test/one"]);
  await page.button("Cancel checkout").props.onClick();
  await page.flush();
  assert.deepEqual(calls, [["retry", "AM-first"], ["cancel", "AM-first"]]);
  assert.equal(page.button("Continue payment"), undefined);
  assert.doesNotMatch(page.text(), /Payment confirmed/);
  assert.deepEqual(page.events, []);
  page.unmount();
});

test("PayMongo Cancel return for the checkout launched in this tab expires the group and preserves the cart", async () => {
  let current = [pending];
  const calls = [];
  const page = pageHarness("../pages/buyer/Checkout.jsx", {
    search: "?payment=cancelled&reference=AM-first",
    api: {
      fetchBuyerPayment: async () => ({ payment_status: current[0].paymentStatus, orders: current }),
      cancelBuyerPayment: async (reference) => {
        calls.push(reference);
        current = [{ ...pending, status: "Cancelled", paymentStatus: "Expired" }];
        return { message: "Checkout cancelled. Your cart items were kept." };
      },
    },
  });
  page.saved.set("paymongo_payment_reference", "AM-first");
  await page.flush();
  assert.deepEqual(calls, ["AM-first"]);
  assert.match(page.text(), /unpaid checkout was not added to Orders/i);
  assert.match(page.text(), /cart items were kept/i);
  assert.equal(page.button("Continue payment"), undefined);
  assert.equal(page.saved.get("paymongo_payment_reference"), undefined);
  assert.deepEqual(page.events, [], "Cancellation must not announce purchased cart removal");
  page.listeners.get("focus")();
  await page.flush();
  assert.deepEqual(calls, ["AM-first"], "Focus/polling must not repeat automatic cancellation");
  page.unmount();
});

test("cancel return cannot cancel an already Paid checkout", async () => {
  const calls = [];
  const page = pageHarness("../pages/buyer/Checkout.jsx", {
    orders: [{ ...pending, paymentStatus: "Paid" }],
    search: "?payment=cancelled&reference=AM-first",
    api: { cancelBuyerPayment: async () => { calls.push("cancel"); } },
  });
  page.saved.set("paymongo_payment_reference", "AM-first");
  await page.flush();
  assert.deepEqual(calls, []);
  assert.match(page.text(), /Payment received/);
  assert.equal(page.redirects[0][0], "/buyer/profile/orders?payment=success&reference=AM-first");
  page.unmount();
});

test("provider processing/refusal keeps an unpaid checkout unchanged and reports the cancellation problem", async () => {
  const calls = [];
  const page = pageHarness("../pages/buyer/Checkout.jsx", {
    orders: [pending], search: "?payment=cancelled&reference=AM-first",
    api: { cancelBuyerPayment: async (reference) => { calls.push(reference); throw new Error("A payment is still processing. Please wait."); } },
  });
  page.saved.set("paymongo_payment_reference", "AM-first");
  await page.flush();
  assert.deepEqual(calls, ["AM-first"]);
  assert.match(page.text(), /payment is still processing/);
  assert.ok(page.button("Cancel checkout"));
  assert.equal(page.saved.get("paymongo_payment_reference"), "AM-first");
  page.listeners.get("focus")();
  await page.flush();
  assert.deepEqual(calls, ["AM-first"]);
  page.unmount();
});

test("Checkout shows the original payment snapshot for overlapping attempts without adding an order", async () => {
  const page = pageHarness("../pages/buyer/Checkout.jsx", {
    search: "?artwork_ids=10",
    cart: [{ artwork_id: 10, seller_id: 1, price: 1000 }],
    addresses: [{ address_id: 1, is_current: 1 }],
    api: { fetchBuyerPayment: async () => ({ payment_status: "Pending", orders: [{ ...pending, items: [
      { id: 1, title: "Original artwork A", price: 1000 }, { id: 2, title: "Original artwork B", price: 2000 },
    ] }] }), placeBuyerOrder: async () => {
      throw Object.assign(new Error("Resume or cancel your unpaid checkout"), { status: 409, canResume: true, paymentReference: "AM-first" });
    } },
  });
  await page.flush();
  await page.button("Continue to Secure Payment").props.onClick();
  await page.flush();
  assert.match(page.text(), /Original artwork A/);
  assert.match(page.text(), /Original artwork B/);
  assert.equal(page.button("Continue to Secure Payment"), undefined);
  assert.equal(page.button("Continue payment")?.props.disabled, false);
  assert.deepEqual(page.redirects, []);
  page.unmount();
});

test("buyer sees refund review warning for Paid+Cancelled even without a redirect query", async () => {
  const page = pageHarness("../pages/buyer/Order.jsx", { orders: [{ ...pending, paymentStatus: "Paid", status: "Cancelled" }] });
  await page.flush();
  assert.match(page.text(), /Payment received, but this checkout needs support review for a refund/);
  assert.doesNotMatch(page.text(), /Payment confirmed/);
  assert.equal(page.button("Resume payment"), undefined);
  assert.deepEqual(page.events, []);
  page.unmount();
});

test("buyer Orders lists paid purchases and COD without incomplete payment attempts or payment actions", async () => {
  const page = pageHarness("../pages/buyer/Order.jsx", {
    orders: [
      pending,
      { ...pending, orderId: 2, id: "PAID-PURCHASE", paymentStatus: "Paid" },
      { ...pending, orderId: 3, id: "COD-PURCHASE", payment: "cod" },
      { ...pending, orderId: 4, id: "EXPIRED-ATTEMPT", paymentStatus: "Expired", status: "Cancelled" },
    ],
  });
  await page.flush();
  assert.match(page.text(), /PAID-PURCHASE/);
  assert.match(page.text(), /COD-PURCHASE/);
  assert.doesNotMatch(page.text(), /ORDER-1|EXPIRED-ATTEMPT/);
  assert.equal(page.button("Resume payment"), undefined);
  assert.equal(page.button("Cancel checkout"), undefined);
  assert.ok(page.button("Cancel order"));
  page.unmount();
});

test("old PayMongo return URLs are verified in Checkout while normal Orders navigation stays put", async () => {
  for (const payment of ["success", "cancelled"]) {
    const page = pageHarness("../pages/buyer/Order.jsx", {
      search: `?payment=${payment}&reference=AM-first&artwork_ids=10`, orders: [pending],
    });
    await page.flush();
    assert.equal(page.redirects[0][0], `/buyer/checkout?payment=${payment}&reference=AM-first&artwork_ids=10`);
    assert.equal(page.redirects[0][1].replace, true);
    assert.deepEqual(page.events, []);
    page.unmount();
  }
  for (const search of ["", "?reference=AM-first", "?payment=success"]) {
    const page = pageHarness("../pages/buyer/Order.jsx", { search, orders: [pending] });
    await page.flush();
    assert.deepEqual(page.redirects, []);
    page.unmount();
  }
  const paid = pageHarness("../pages/buyer/Order.jsx", {
    search: "?payment=success&reference=AM-first", orders: [{ ...pending, paymentStatus: "Paid" }],
  });
  await paid.flush();
  assert.deepEqual(paid.redirects, []);
  assert.match(paid.text(), /Payment confirmed/);
  paid.unmount();
});

test("Cart checkout carries only checked artwork IDs and disables checkout when none are checked", async () => {
  const page = pageHarness("../pages/buyer/Cart.jsx", { cart: [
    { artwork_id: 10, price: 1000, seller_id: 1 },
    { artwork_id: 20, price: 2000, seller_id: 2 },
    { artwork_id: 30, price: 3000, is_sold_out: 1 },
  ] });
  const table = () => page.nodes().find((node) => node?.type?.endsWith?.("/Cart/CartTable"));
  await page.flush();
  assert.deepEqual([...table().props.selectedIds], ["10", "20"]);
  table().props.onSelectionChange(["20"]);
  await page.flush();
  assert.match(page.text(), /1\s+of\s+3\s+artworks selected/);
  page.button("Checkout").props.onClick();
  assert.equal(page.redirects[0][0], "/buyer/checkout?artwork_ids=20");
  table().props.onSelectionChange([]);
  await page.flush();
  assert.equal(page.button("Checkout").props.disabled, true);
  page.unmount();
});

test("Checkout displays and submits only selected artwork, including after loading the URL directly", async () => {
  const calls = [];
  const page = pageHarness("../pages/buyer/Checkout.jsx", {
    search: "?artwork_ids=20",
    cart: [{ artwork_id: 10, title: "Unchecked artwork", price: 1000 }, { artwork_id: 20, title: "Checked artwork", price: 2000 }],
    addresses: [{ address_id: 1 }],
    api: { placeBuyerOrder: async (...args) => { calls.push(args); return { checkout_url: "https://checkout.test/selected" }; } },
  });
  await page.flush();
  assert.match(page.text(), /Checked artwork/);
  assert.doesNotMatch(page.text(), /Unchecked artwork/);
  await page.button("Continue to Secure Payment").props.onClick();
  assert.deepEqual([...calls[0]].slice(0, 2), [1, "paymongo"]);
  assert.deepEqual([...calls[0][2]], [20]);
  page.unmount();
});

test("Checkout rejects missing or empty selections instead of silently purchasing the remaining cart", async () => {
  for (const search of ["?artwork_ids=", "?artwork_ids=999", "?artwork_ids=10,999"]) {
    let calls = 0;
    const page = pageHarness("../pages/buyer/Checkout.jsx", {
      search, cart: [{ artwork_id: 10, price: 1000 }], addresses: [{ address_id: 1 }],
      api: { placeBuyerOrder: async () => { calls++; } },
    });
    await page.flush();
    assert.match(page.text(), /no longer in your cart/);
    const submit = page.button("Continue to Secure Payment");
    if (submit) {
      assert.equal(submit.props.disabled, true);
      await submit.props.onClick();
    }
    assert.equal(calls, 0);
    page.unmount();
  }
});

test("Cart removal waits for confirmation, supports cancel and blocks duplicate requests", async () => {
  const item = { artwork_id: 10, title: "Painting", price: 1000 };
  const calls = [];
  let finish;
  const page = pageHarness("../pages/buyer/Cart.jsx", {
    cart: [item],
    api: { removeFromCart: (id) => { calls.push(id); return new Promise((resolve) => { finish = resolve; }); } },
  });
  const table = () => page.nodes().find((node) => node?.type?.endsWith?.("/Cart/CartTable"));
  const dialog = () => page.nodes().find((node) => node?.type?.endsWith?.("/Cart/CartDelete"));
  await page.flush();
  table().props.onRemove(item);
  await page.flush();
  assert.equal(dialog().props.open, true);
  assert.equal(calls.length, 0);
  dialog().props.handleClose();
  await page.flush();
  assert.equal(dialog().props.open, false);
  assert.equal(table().props.items.length, 1);
  table().props.onRemove(item);
  await page.flush();
  const submit = dialog().props.onSubmit;
  const request = submit(10);
  await submit(10);
  await page.flush();
  assert.deepEqual(calls, [10]);
  assert.equal(dialog().props.deleting, true);
  dialog().props.handleClose();
  await page.flush();
  assert.equal(dialog().props.open, true);
  finish();
  await request;
  await page.flush();
  assert.equal(dialog().props.open, false);
  assert.match(page.text(), /Your cart is empty/);
  page.unmount();
});

test("Cart removal failure retains the selected artwork and allows retry", async () => {
  let fail = true;
  const item = { artwork_id: 10, title: "Painting", price: 1000 };
  const page = pageHarness("../pages/buyer/Cart.jsx", {
    cart: [item],
    api: { removeFromCart: async () => { if (fail) throw new Error("Connection failed"); } },
  });
  const dialog = () => page.nodes().find((node) => node?.type?.endsWith?.("/Cart/CartDelete"));
  await page.flush();
  page.nodes().find((node) => node?.type?.endsWith?.("/Cart/CartTable")).props.onRemove(item);
  await page.flush();
  await dialog().props.onSubmit(10);
  await page.flush();
  assert.equal(dialog().props.open, true);
  assert.equal(dialog().props.error, "Connection failed");
  assert.equal(dialog().props.deleting, false);
  assert.equal(dialog().props.selectedCart.artwork_id, 10);
  fail = false;
  await dialog().props.onSubmit(10);
  await page.flush();
  assert.equal(dialog().props.open, false);
  assert.match(page.text(), /Your cart is empty/);
  page.unmount();
});

test("Cart publishes its initial authoritative count, including a newly empty cart after payment", async () => {
  const page = pageHarness("../pages/buyer/Cart.jsx", { cart: [] });
  await page.flush();
  assert.match(page.text(), /Your cart is empty/);
  assert.deepEqual(page.events, ["cart-updated"]);
  assert.equal(page.eventDetails[0].source, "cart-page");
  assert.equal(page.eventDetails[0].count, 0);
  assert.equal(page.timers.size, 0);
  page.unmount();
});
