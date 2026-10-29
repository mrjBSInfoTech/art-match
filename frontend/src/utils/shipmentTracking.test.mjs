import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transformSync } from "@swc/core";
import * as payments from "./orderPayments.js";
import * as tracking from "./trackingUrl.js";
import { SHIPMENT_COURIERS, getShipmentCourier } from "./shipmentCouriers.js";

// Exercise the existing order card and clipboard events without a browser or API.
function renderOrders(orders, clipboard = { writeText: async () => {} }) {
  const hooks = [];
  let hookIndex = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = hookIndex++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], (value) => { hooks[index] = value; }];
    },
  };
  const palette = Object.fromEntries(
    ["error", "info", "primary", "success", "warning"].map((name) => [name, { main: name, dark: name }]),
  );
  const theme = { palette: { mode: "light", grey: { 600: "grey", 700: "grey" }, ...palette } };
  const source = transformSync(readFileSync(new URL("../components/buyer/Order/OrderGrid.jsx", import.meta.url), "utf8"), {
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
    module: { type: "commonjs" },
  }).code;
  const module = { exports: {} };
  const context = vm.createContext({ React: react, navigator: { clipboard }, Date, Intl });
  const require = (specifier) => {
    if (specifier === "react") return react;
    if (specifier === "@mui/material") return new Proxy({ useTheme: () => theme, alpha: (color) => color }, {
      get: (values, name) => values[name] || name,
    });
    if (specifier.endsWith("/orderPayments.js")) return payments;
    if (specifier.endsWith("/trackingUrl.js")) return tracking;
    if (specifier.endsWith("/shipmentCouriers.js")) return { getShipmentCourier };
    return { __esModule: true, default: specifier };
  };
  vm.runInContext(`(function(exports, require, module) { ${source}\n})`, context)(module.exports, require, module);
  let tree;
  const render = () => {
    hookIndex = 0;
    tree = module.exports.default({ orders });
  };
  const flatten = (node) => {
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (node == null || node === false) return [];
    if (typeof node !== "object") return [node];
    return [node, ...flatten(node.props?.children), ...flatten(node.props?.action)];
  };
  const text = () => flatten(tree).filter((node) => typeof node === "string" || typeof node === "number").join(" ");
  const nodes = () => flatten(tree);
  render();
  return { render, text, nodes };
}

const shipped = {
  orderId: 31, id: "AM-000031", status: "Shipped", payment: "cod", paymentStatus: "Pending", items: [], total: 500,
};

test("buyer shipment details use all four courier labels and keep tracking in a separate tab", () => {
  assert.deepEqual(SHIPMENT_COURIERS.map((courier) => courier.value), ["lalamove", "lbc", "jnt", "ninjavan"]);
  for (const courier of SHIPMENT_COURIERS) {
    for (const status of ["Shipped", "Delivered"]) {
      const trackingUrl = courier.trackingUrl || "https://share.lalamove.com/order?id=abc%2F123";
      const trackingNumber = courier.value === "lalamove" ? null : "NVPH-A1234";
      const page = renderOrders([{ ...shipped, status, courier: courier.value, trackingNumber, trackingUrl }]);
      assert.ok(page.text().includes(`Courier:  ${courier.label}`));
      const link = page.nodes().find((node) => node?.type === "Button" && node.props.href);
      assert.equal(link.props.href, trackingUrl);
      assert.equal(link.props.target, "_blank");
      assert.equal(link.props.rel, "noopener noreferrer");
      if (trackingNumber) {
        assert.ok(page.text().includes(courier.trackingNumberLabel));
        assert.ok(page.text().includes(trackingNumber));
      } else {
        assert.ok(!page.nodes().some((node) => node?.props?.["aria-label"]?.startsWith("Copy tracking")));
      }
    }
  }
});

test("buyer can copy the exact tracking number and receives feedback", async () => {
  const copied = [];
  const page = renderOrders([{ ...shipped, courier: "ninjavan", trackingNumber: "NVP-123ABC" }], {
    writeText: async (value) => { copied.push(value); },
  });
  const button = page.nodes().find((node) => node?.props?.["aria-label"] === "Copy tracking number for AM-000031");
  await button.props.onClick();
  page.render();
  assert.deepEqual(copied, ["NVP-123ABC"]);
  assert.match(page.text(), /Tracking number copied/);
});

test("clipboard denial or unavailable clipboard leaves the number available to copy manually", async () => {
  for (const clipboard of [undefined, { writeText: async () => { throw new Error("Permission denied"); } }]) {
    const page = renderOrders([{ ...shipped, courier: "lbc", trackingNumber: "LBC123" }], clipboard || null);
    const button = page.nodes().find((node) => node?.props?.["aria-label"]?.startsWith("Copy tracking"));
    await button.props.onClick();
    page.render();
    assert.match(page.text(), /Select the tracking number to copy it manually/);
    assert.match(page.text(), /LBC123/);
  }
});

test("legacy shipped orders with only a tracking URL retain their tracking link", () => {
  const trackingUrl = "https://share.lalamove.com/legacy-order";
  const page = renderOrders([{ ...shipped, courier: null, trackingNumber: null, trackingUrl }]);
  assert.equal(page.nodes().find((node) => node?.props?.href)?.props.href, trackingUrl);
  assert.ok(!page.text().includes("Courier:"));
});

test("unsafe stored tracking links never become buyer links", () => {
  for (const trackingUrl of ["javascript:alert(1)", "http://example.com/track", "data:text/html,tracking", "file:///tracking", "ftp://example.com", "not a URL"]) {
    const page = renderOrders([{ ...shipped, courier: "jnt", trackingNumber: "JNT-123", trackingUrl }]);
    assert.ok(!page.nodes().some((node) => node?.props?.href));
    assert.match(page.text(), /JNT-123/);
  }
});

test("shipment details remain hidden before shipping", () => {
  const page = renderOrders([{ ...shipped, status: "Packed", courier: "lbc", trackingNumber: "LBC123", trackingUrl: "https://www.lbcexpress.com/track/" }]);
  assert.ok(!page.text().includes("Courier:"));
  assert.ok(!page.text().includes("LBC123"));
});
