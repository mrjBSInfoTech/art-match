import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "@swc/core";
import * as paymentHelpers from "./orderPayments.js";
import * as trackingHelpers from "./trackingUrl.js";

// Exercise the actual seller page's events and state without additional dependencies.
function sellerPage({ orders = [], api = {} } = {}) {
  let hookIndex = 0;
  let dirty = true;
  const hooks = [];
  const effects = [];
  const cleanups = [];
  const listeners = new Map();
  const redirects = [];
  let printCalls = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    forwardRef: (component) => component,
    useState(initial) {
      const index = hookIndex++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], (next) => {
        hooks[index] = typeof next === "function" ? next(hooks[index]) : next;
        dirty = true;
      }];
    },
    useRef(initial) {
      const index = hookIndex++;
      return hooks[index] ||= { current: initial };
    },
    useEffect(callback, dependencies) {
      const index = hookIndex++;
      const previous = hooks[index];
      if (!previous || dependencies.some((dependency, item) => !Object.is(dependency, previous[item]))) {
        hooks[index] = dependencies;
        effects.push(() => { cleanups[index]?.(); cleanups[index] = callback(); });
      }
    },
    useMemo(callback, dependencies) {
      const index = hookIndex++;
      const previous = hooks[index];
      if (!previous || dependencies.some((dependency, item) => !Object.is(dependency, previous.dependencies[item]))) {
        hooks[index] = { dependencies, value: callback() };
      }
      return hooks[index].value;
    },
  };
  react.useCallback = (callback, dependencies) => react.useMemo(() => callback, dependencies);
  const theme = {
    palette: {
      mode: "light",
      background: { paper: "white", default: "white" },
      text: { primary: "black", secondary: "grey" },
      divider: "grey",
      action: { hover: "#eee", selected: "#ddd", disabled: "grey", disabledBackground: "#eee" },
      primary: { main: "blue" },
      error: { main: "red" },
    },
  };
  const modules = new Map();
  const components = {};
  const context = vm.createContext({
    React: react, console, Date, Intl, FormData,
    URL: { createObjectURL: () => "blob:parcel-preview", revokeObjectURL() {} },
    window: {
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name) => listeners.delete(name), print() { printCalls++; },
    },
    document: { visibilityState: "visible", addEventListener() {}, removeEventListener() {} },
  });
  function loadModule(url) {
    if (modules.has(url.href)) return modules.get(url.href).exports;
    const module = { exports: {} };
    modules.set(url.href, module);
    const transformed = transformSync(readFileSync(url, "utf8"), {
      jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
      module: { type: "commonjs" },
    });
    const require = (specifier) => {
      if (specifier === "react") return react;
      if (specifier === "react-router-dom") return { useNavigate: () => (...args) => redirects.push(args) };
      if (specifier.endsWith("orderPayments.js")) return paymentHelpers;
      if (specifier.endsWith("trackingUrl.js")) return trackingHelpers;
      if (/\/(OrderCard|OrderInfo|OrderParcelPhoto)(\.jsx)?$/.test(specifier) || /orderPresentation(\.js)?$/.test(specifier)) {
        const extension = /\.(jsx|js)$/.test(specifier) ? "" : /orderPresentation$/.test(specifier) ? ".js" : ".jsx";
        const exports = loadModule(new URL(`${specifier}${extension}`, url));
        if (/\/(OrderCard|OrderInfo|OrderParcelPhoto)(\.jsx)?$/.test(specifier)) {
          components[specifier.match(/\/(OrderCard|OrderInfo|OrderParcelPhoto)/)[1]] = exports.default;
        }
        return exports;
      }
      if (specifier.endsWith("/common/ArtworkImage") || specifier.endsWith("/common/ArtworkImage.jsx")) {
        return { __esModule: true, default: "ArtworkImage" };
      }
      if (specifier.includes("/api/")) return { fetchSellerOrders: async () => orders, ...api };
      if (specifier === "@mui/material/styles") return { useTheme: () => theme };
      if (specifier === "@mui/material") return new Proxy({}, { get: (_, name) => name });
      if (specifier === "react-helmet-async") return { Helmet: "Helmet" };
      return { __esModule: true, default: specifier };
    };
    // Give every real module its own exports so imports cannot replace the page's default export.
    vm.runInContext(`(function(exports, require, module) { ${transformed.code}\n})`, context)(module.exports, require, module);
    return module.exports;
  }
  const SellerOrder = loadModule(new URL("../pages/seller/Order.jsx", import.meta.url)).default;
  let tree;
  function render() {
    hookIndex = 0;
    dirty = false;
    tree = SellerOrder();
    effects.splice(0).forEach((effect) => effect());
  }
  async function flush() {
    for (let step = 0; step < 8; step++) {
      await new Promise((resolve) => setImmediate(resolve));
      if (dirty) render();
    }
  }
  function flatten(node) {
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (node === null || node === undefined || node === false) return [];
    if (typeof node !== "object") return [node];
    if (node.type === "Dialog" && !node.props.open) return [node];
    // Render the extracted stateless views while preserving MUI and other component boundaries.
    if (typeof node.type === "function" &&
        [components.OrderCard, components.OrderInfo, components.OrderParcelPhoto].includes(node.type)) {
      return [node, ...flatten(node.type(node.props))];
    }
    return [node, ...flatten(node.props?.children)];
  }
  const nodes = (node = tree) => flatten(node);
  const text = (node = tree) => flatten(node).filter((item) => typeof item === "string" || typeof item === "number").join(" ");
  const status = (id) => nodes().find((node) => node?.type === "Select" && node.props.inputProps?.["aria-label"] === `Update status for ${id}`);
  render();
  return {
    flush, nodes, text, status, listeners, redirects,
    component: (name, matches = () => true) => nodes().find((node) => node?.type === components[name] && matches(node)),
    printCalls: () => printCalls,
    button: (label) => nodes().find((node) => node?.type === "Button" && text(node) === label),
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
}

const paidOrder = {
  orderId: 31, id: "AM-000031", payment: "paymongo", paymentStatus: "Paid",
  status: "Pending", total: 1150, date: "2026-10-25T17:12:10.000Z",
  customer: "Test buyer", items: [],
};

test("seller cards and details pass each item image through ArtworkImage and preserve detail actions", async () => {
  const firstOrder = {
    ...paidOrder,
    items: [{ id: 100, title: "First order artwork", qty: 1, price: 1150, image: "https://images.example/first.webp" }],
  };
  const detailOrder = {
    ...paidOrder,
    orderId: 32,
    id: "AM-000032",
    customer: "Second buyer",
    address: "123 Gallery Street",
    items: [
      { id: 101, title: "Landscape", qty: 1, price: 650, image: "https://images.example/landscape.webp" },
      { id: 102, title: "Portrait", qty: 2, price: 250, image: "https://images.example/portrait.webp" },
    ],
  };
  const statusUpdates = [];
  const page = sellerPage({ orders: [firstOrder, detailOrder], api: {
    updateSellerOrderStatus: async (...args) => {
      statusUpdates.push(args);
      return { paymentStatus: "Paid" };
    },
  } });
  await page.flush();
  const card = page.component("OrderCard", (node) => node.props.order.id === detailOrder.id);
  assert.ok(card);
  const artworkImages = (node) => page.nodes(node).filter((item) => item?.type === "ArtworkImage");
  assert.deepEqual(artworkImages(card).map((node) => node.props.image), detailOrder.items.map((item) => item.image));
  page.nodes(card).find((node) => node?.type === "Button" && page.text(node) === "View details").props.onClick();
  await page.flush();
  const info = page.component("OrderInfo");
  assert.equal(info.props.open, true);
  assert.equal(info.props.order, detailOrder);
  assert.match(page.text(info), /Second buyer/);
  assert.match(page.text(info), /123 Gallery Street/);
  const [heroImage, ...detailImages] = artworkImages(info);
  assert.equal(heroImage.props.image, detailOrder.items[0].image);
  assert.deepEqual(detailImages.map((node) => node.props.image), detailOrder.items.map((item) => item.image));
  const detailStatus = page.nodes(info).find((node) => node?.type === "Select"
    && node.props.inputProps?.["aria-label"] === `Update status for ${detailOrder.id} in details`);
  await detailStatus.props.onChange({ target: { value: "Confirmed" } });
  await page.flush();
  assert.equal(statusUpdates.length, 1);
  assert.equal(statusUpdates[0][0], detailOrder.orderId);
  assert.equal(statusUpdates[0][1], "Confirmed");
  assert.equal(page.component("OrderInfo").props.order.status, "Confirmed");
  assert.equal(page.status(detailOrder.id).props.value, "Confirmed");
  page.button("Print parcel label").props.onClick();
  assert.equal(page.printCalls(), 1);
  page.button("Close").props.onClick();
  await page.flush();
  assert.equal(page.component("OrderInfo")?.props.open ?? false, false);
  assert.equal(page.button("Print parcel label"), undefined);
  page.unmount();
});

test("seller sees paid purchases and COD orders, with unpaid attempts excluded from cards and counts", async () => {
  const page = sellerPage({ orders: [
    paidOrder,
    { ...paidOrder, orderId: 32, id: "COD-32", payment: "cod", paymentStatus: "Pending" },
    { ...paidOrder, orderId: 33, id: "UNPAID-33", paymentStatus: "Pending" },
    { ...paidOrder, orderId: 34, id: "FAILED-34", paymentStatus: "Failed" },
    { ...paidOrder, orderId: 35, id: "EXPIRED-35", status: "Cancelled", paymentStatus: "Expired" },
    { ...paidOrder, orderId: 36, id: "REFUND-36", status: "Cancelled", paymentStatus: "Refunded" },
    { ...paidOrder, orderId: 37, id: "REVIEW-37", status: "Cancelled" },
  ] });
  await page.flush();
  assert.doesNotMatch(page.text(), /UNPAID-33|FAILED-34|EXPIRED-35/);
  assert.match(page.text(), /TOTAL ORDERS 4/);
  assert.match(page.text(), /PENDING 2/);
  assert.match(page.text(), /REFUND-36/);
  assert.match(page.text(), /REVIEW-37/);
  assert.equal(page.status(paidOrder.id).props.disabled, false);
  assert.equal(page.status("COD-32").props.disabled, false);
  assert.equal(page.status("REFUND-36").props.disabled, true);
  assert.equal(page.status("REVIEW-37").props.disabled, true);
  assert.doesNotMatch(page.text(), /2026-10-25T17:12:10/);
  assert.equal(page.text(page.status(paidOrder.id)), "Pending Confirmed");
  assert.equal(page.text(page.status("COD-32")), "Pending Confirmed Cancelled");
  page.unmount();
});

test("seller status changes block duplicate submissions, reject skipped steps and keep the next step usable", async () => {
  const calls = [];
  let finish;
  const page = sellerPage({ orders: [paidOrder], api: {
    updateSellerOrderStatus: (...args) => {
      calls.push(args);
      return new Promise((resolve) => { finish = resolve; });
    },
  } });
  await page.flush();
  await page.status(paidOrder.id).props.onChange({ target: { value: "Shipped" } });
  await page.flush();
  assert.equal(calls.length, 0);
  const change = page.status(paidOrder.id).props.onChange;
  const first = change({ target: { value: "Confirmed" } });
  await change({ target: { value: "Confirmed" } });
  await page.flush();
  assert.equal(calls.length, 1);
  assert.equal(page.status(paidOrder.id).props.disabled, true);
  finish({ paymentStatus: "Paid" });
  await first;
  await page.flush();
  assert.equal(page.status(paidOrder.id).props.value, "Confirmed");
  assert.equal(page.status(paidOrder.id).props.disabled, false);
  assert.equal(page.text(page.status(paidOrder.id)), "Confirmed Packed");
  page.unmount();
});

test("seller paid order follows Confirmed, parcel photos, tracking and delivery without disabling valid steps", async () => {
  const calls = [];
  const page = sellerPage({ orders: [{ ...paidOrder, status: "Confirmed" }], api: {
    updateSellerOrderStatus: async (...args) => {
      calls.push(args);
      return { paymentStatus: "Paid", parcelPhotoCount: 1 };
    },
  } });
  await page.flush();
  await page.status(paidOrder.id).props.onChange({ target: { value: "Packed" } });
  await page.flush();
  assert.equal(calls.length, 0);
  await page.button("Mark Packed").props.onClick();
  await page.flush();
  assert.match(page.text(), /Choose 1 to 5 parcel photos/);
  assert.equal(calls.length, 0);
  const photoInput = () => page.nodes().find((node) => node?.type === "input" && node.props.type === "file");
  const firstBatch = [
    new Blob(["parcel-photo-1"], { type: "image/webp" }),
    new Blob(["parcel-photo-2"], { type: "image/jpeg" }),
  ];
  photoInput().props.onChange({ target: { files: firstBatch, value: "photos-a" } });
  await page.flush();
  const secondBatch = [
    new Blob(["parcel-photo-3"], { type: "image/png" }),
    new Blob(["parcel-photo-4"], { type: "image/webp" }),
    new Blob(["parcel-photo-5"], { type: "image/jpeg" }),
  ];
  photoInput().props.onChange({ target: { files: secondBatch, value: "photos-b" } });
  await page.flush();
  await page.button("Mark Packed").props.onClick();
  await page.flush();
  assert.equal(calls[0][1], "Packed");
  assert.equal(calls[0][2].getAll("parcel_photos").length, 5);
  assert.equal(page.status(paidOrder.id).props.value, "Packed");
  await page.status(paidOrder.id).props.onChange({ target: { value: "Shipped" } });
  await page.flush();
  const trackingField = page.nodes().find((node) => node?.type === "TextField" && node.props.label === "Courier tracking / share link");
  assert.ok(trackingField.props.required);
  assert.match(trackingField.props.helperText, /HTTPS tracking link is required/);
  const shippedButton = page.button("Mark Shipped");
  assert.equal(shippedButton.props.disabled, true);
  trackingField.props.onChange({ target: { value: "https://carrier.example/123" } });
  await page.flush();
  assert.equal(page.button("Mark Shipped").props.disabled, false);
  await page.button("Mark Shipped").props.onClick();
  await page.flush();
  assert.equal(calls[1][1], "Shipped");
  assert.equal(calls[1][2].get("tracking_url"), "https://carrier.example/123");
  await page.status(paidOrder.id).props.onChange({ target: { value: "Delivered" } });
  await page.flush();
  assert.equal(calls[2][1], "Delivered");
  assert.equal(page.status(paidOrder.id).props.value, "Delivered");
  assert.equal(page.status(paidOrder.id).props.disabled, true);
  page.unmount();
});

test("seller focus refresh picks up newly paid orders and failed updates remain retryable", async () => {
  let orders = [];
  let fail = true;
  const page = sellerPage({ api: {
    fetchSellerOrders: async () => orders,
    updateSellerOrderStatus: async () => {
      if (fail) throw new Error("Please refresh and try again");
      return { paymentStatus: "Paid" };
    },
  } });
  await page.flush();
  assert.equal(page.status(paidOrder.id), undefined);
  orders = [paidOrder];
  page.listeners.get("focus")();
  await page.flush();
  assert.equal(page.status(paidOrder.id).props.disabled, false);
  await page.status(paidOrder.id).props.onChange({ target: { value: "Confirmed" } });
  await page.flush();
  assert.match(page.text(), /Please refresh and try again/);
  assert.equal(page.status(paidOrder.id).props.value, "Pending");
  assert.equal(page.status(paidOrder.id).props.disabled, false);
  fail = false;
  await page.status(paidOrder.id).props.onChange({ target: { value: "Confirmed" } });
  await page.flush();
  assert.equal(page.status(paidOrder.id).props.value, "Confirmed");
  page.unmount();
});
