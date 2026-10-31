import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { transformSync } from "@swc/core";

// Run the real JSX handlers and React state with the same native SWC approach as
// paymentPages.test.mjs. API calls remain observable without a browser dependency.
function returnComponent(name, initialProps, api = {}) {
  let hookIndex = 0;
  let dirty = true;
  let props = initialProps;
  let tree;
  const hooks = [];
  const effects = [];
  const cleanups = [];
  const react = {
    forwardRef: render => props => render(props, null),
    createElement: (type, attributes, ...children) => ({ type, props: { ...attributes, children } }),
    useState(initial) {
      const index = hookIndex++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], next => {
        hooks[index] = typeof next === "function" ? next(hooks[index]) : next;
        dirty = true;
      }];
    },
    useRef(initial) { const index = hookIndex++; return hooks[index] ||= { current: initial }; },
    useEffect(callback, dependencies) {
      const index = hookIndex++;
      const previous = hooks[index];
      if (!previous || dependencies.some((item, offset) => !Object.is(item, previous[offset]))) {
        hooks[index] = dependencies;
        effects.push(() => { cleanups[index]?.(); cleanups[index] = callback(); });
      }
    },
  };
  const componentFolder = fileURLToPath(new URL("../components/buyer/Message/", import.meta.url));
  const modules = new Map();
  const loadComponent = filename => {
    if (modules.has(filename)) return modules.get(filename);
    const context = vm.createContext({
      React: react, Date, Intl, URL, console,
      window: {
        location: { origin: "http://localhost:5173" },
        setInterval: () => 0,
        clearInterval: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      navigator: { clipboard: { writeText: async () => {} } },
      require(specifier) {
        if (specifier === "react") return react;
        if (specifier === "@mui/material" || specifier === "@mui/material/styles") {
          return new Proxy({
            useTheme: () => ({ palette: { mode: "light" } }),
          }, {
            get: (target, prop) => {
              if (prop in target) return target[prop];
              return prop;
            },
          });
        }
        if (specifier.includes("/api/")) return api;
        if (specifier.startsWith("./") || specifier.includes("OrderTrack") || specifier.includes("shipmentCouriers") || specifier.includes("trackingUrl")) {
          const base = resolve(dirname(filename), specifier);
          if (existsSync(base)) return loadComponent(base);
          if (existsSync(`${base}.jsx`)) return loadComponent(`${base}.jsx`);
          if (existsSync(`${base}.js`)) return loadComponent(`${base}.js`);
        }
        return { __esModule: true, default: specifier };
      },
      exports: {},
    });
    const transformed = transformSync(readFileSync(filename, "utf8"), {
      jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
      module: { type: "commonjs" },
    });
    vm.runInContext(transformed.code, context);
    modules.set(filename, context.exports);
    return context.exports;
  };
  const Component = loadComponent(resolve(componentFolder, `${name}.jsx`)).default;
  const render = () => {
    hookIndex = 0;
    dirty = false;
    tree = Component(props);
    effects.splice(0).forEach(effect => effect());
  };
  const flush = async () => {
    for (let step = 0; step < 6; step++) {
      await new Promise(resolve => setImmediate(resolve));
      if (dirty) render();
    }
  };
  const flatten = node => {
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (node === null || node === undefined || node === false) return [];
    if (typeof node !== "object") return [node];
    if (typeof node.type === "function") return flatten(node.type(node.props));
    if (node.type === "Dialog" && !node.props.open) return [node];
    return [node, ...flatten(node.props?.children), ...flatten(node.props?.control)];
  };
  const nodes = () => flatten(tree);
  const text = (node = tree) => flatten(node).filter(item => ["string", "number"].includes(typeof item)).join(" ");
  render();
  return {
    flush, nodes, text,
    button: label => nodes().find(node => node?.type === "Button" && text(node) === label),
    field: label => nodes().find(node => node?.type === "TextField" && node.props.label === label),
    setProps: next => { props = { ...props, ...next }; render(); },
    unmount: () => cleanups.forEach(cleanup => cleanup?.()),
  };
}

const plain = value => JSON.parse(JSON.stringify(value));
const order = {
  orderId: 31, id: "AM-000031", returnEligible: true,
  deliveredAt: "2026-10-25T10:00:00.000Z", returnDeadline: "2026-11-01T10:00:00.000Z",
  items: [
    { id: 10, title: "Landscape", qty: 1, returnEligible: true },
    { id: 11, title: "Portrait", qty: 2, returnEligible: true },
    { id: 12, title: "Already returned", qty: 1, returnEligible: false },
  ],
};
const request = {
  return_request_id: 8, order_id: 31, order_number: "AM-000031", conversation_id: 19,
  customer_id: 2, seller_id: 3, reason: "Damaged artwork", details: "The canvas arrived torn.",
  status: "Requested", requested_at: "2026-10-26T01:00:00.000Z", seller_response: null,
  items: [{ order_item_id: 11, artwork_id: 21, title: "Portrait", image: "portrait.webp", quantity: 2 }],
};
const setField = async (component, label, value) => {
  component.field(label).props.onChange({ target: { value } });
  await component.flush();
};
const openAction = async (component, label) => {
  component.button(label).props.onClick();
  await component.flush();
};

test("return dialog lists eligible items and all six reasons, trims details and submits only selected order-item IDs", async () => {
  const calls = [];
  let submitted;
  const dialog = returnComponent("ReturnRequestDialog", { order, onClose() {}, onSubmitted: result => { submitted = result; } }, {
    createReturnRequest: async payload => { calls.push(plain(payload)); return request; },
  });
  assert.equal(dialog.nodes().filter(node => node?.type === "Checkbox").length, 2);
  assert.equal(dialog.button("Submit return request").props.disabled, true);
  const reasons = dialog.nodes().filter(node => node?.type === "MenuItem").map(node => node.props.value);
  assert.deepEqual(reasons, ["Damaged artwork", "Wrong artwork received", "Artwork not as described", "Missing item / component", "Shipping damage", "Other"]);
  dialog.nodes().filter(node => node?.type === "Checkbox")[1].props.onChange(null, true);
  await dialog.flush();
  await setField(dialog, "Reason for return", "Damaged artwork");
  await setField(dialog, "Describe the issue", "   The canvas arrived torn.   ");
  assert.equal(dialog.button("Submit return request").props.disabled, false);
  await dialog.button("Submit return request").props.onClick();
  assert.deepEqual(calls, [{ order_id: 31, order_item_ids: [11], reason: "Damaged artwork", details: "The canvas arrived torn." }]);
  assert.equal(submitted, request);
});

test("return dialog rejects invalid reasons, short or excessive details and unavailable orders before requesting", async () => {
  let calls = 0;
  const dialog = returnComponent("ReturnRequestDialog", {
    order: { ...order, items: [order.items[0]] }, onSubmitted() {},
  }, { createReturnRequest: async () => { calls++; } });
  assert.equal(dialog.nodes().find(node => node?.type === "Checkbox").props.checked, true);
  for (const [reason, details] of [["Unknown reason", "Valid long description"], ["Other", "short"], ["Other", "x".repeat(1001)]]) {
    await setField(dialog, "Reason for return", reason);
    await setField(dialog, "Describe the issue", details);
    assert.equal(dialog.button("Submit return request").props.disabled, true);
    await dialog.button("Submit return request").props.onClick();
  }
  await setField(dialog, "Describe the issue", "Valid long description");
  dialog.setProps({ order: { ...order, returnEligible: false, items: [order.items[0]] } });
  assert.equal(dialog.button("Submit return request").props.disabled, true);
  await dialog.button("Submit return request").props.onClick();
  assert.equal(calls, 0);
});

test("return dialog ignores synchronous duplicate submission, disables dismissal pending, and allows retry after server rejection", async () => {
  const calls = [];
  let rejectRequest;
  const dialog = returnComponent("ReturnRequestDialog", {
    order: { ...order, items: [order.items[0]] }, onClose() {}, onSubmitted() {},
  }, { createReturnRequest: payload => { calls.push(payload); return new Promise((_, reject) => { rejectRequest = reject; }); } });
  await setField(dialog, "Reason for return", "Other");
  await setField(dialog, "Describe the issue", "The canvas arrived torn.");
  const submit = dialog.button("Submit return request").props.onClick;
  const first = submit();
  await submit();
  assert.equal(calls.length, 1);
  await dialog.flush();
  assert.equal(dialog.button("Submitting...").props.disabled, true);
  assert.equal(dialog.button("Cancel").props.disabled, true);
  assert.equal(dialog.nodes().find(node => node?.type === "Dialog").props.onClose, undefined);
  rejectRequest(new Error("The 4-day return period for this order has expired."));
  await first;
  await dialog.flush();
  assert.match(dialog.text(), /4-day return period.*expired/);
  assert.equal(dialog.button("Submit return request").props.disabled, false);
  const retry = dialog.button("Submit return request").props.onClick();
  assert.equal(calls.length, 2);
  rejectRequest(new Error("Network interrupted"));
  await retry;
});

test("return cards expose actions only to the matching actor at the server's exact status", () => {
  const actionLabels = ["Approve Return", "Reject return", "Cancel Request", "Mark return shipped", "Confirm items received"];
  const expected = {
    "buyer:Requested": ["Cancel Request"], "seller:Requested": ["Approve Return", "Reject return"],
    "buyer:Approved": ["Mark return shipped"], "seller:Return Shipped": ["Confirm items received"],
  };
  for (const role of ["buyer", "seller", "admin"]) {
    for (const status of ["Requested", "Approved", "Rejected", "Cancelled", "Return Shipped", "Received", "Completed"]) {
      const card = returnComponent("ReturnRequestCard", { request: { ...request, status }, role });
      const visible = actionLabels.filter(label => card.button(label));
      assert.deepEqual(visible, expected[`${role}:${status}`] || [], `${role}:${status}`);
    }
  }
});

test("return cards display trusted items, details, seller response, completion and safe tracking without issuing refunds", () => {
  const completed = { ...request, status: "Completed", seller_response: "Returned item received.",
    received_at: "2026-10-26T10:00:00.000Z", completed_at: "2026-10-26T10:00:00.000Z",
    return_tracking_url: "https://tracking.example/8" };
  const card = returnComponent("ReturnRequestCard", { request: completed, role: "buyer", highlighted: true });
  assert.match(card.text(), /Portrait.*Quantity:\s+2/s);
  assert.match(card.text(), /Damaged artwork.*The canvas arrived torn/s);
  assert.match(card.text(), /Returned item received.*Items received\s*:.*Completed\s*:/s);
  assert.match(card.text(), /do not issue a refund automatically/);
  assert.equal(card.nodes().find(node => node?.type === "Chip").props.label, "Completed");
  assert.equal(card.nodes().find(node => node?.type === "Paper").props.sx.borderColor, "error.main");
  assert.equal(card.nodes().find(node => node?.type === "../../common/ArtworkImage").props.image, "portrait.webp");
  assert.equal(card.nodes().find(node => node?.type === "Link").props.href, "https://tracking.example/8");
  card.setProps({ request: { ...completed, return_tracking_url: "javascript:alert(1)" } });
  assert.equal(card.nodes().find(node => node?.type === "Link"), undefined);
});

test("seller approval and rejection submit trimmed responses and refresh authoritative state", async () => {
  for (const action of ["approve", "reject"]) {
    const calls = [];
    let refreshes = 0;
    const card = returnComponent("ReturnRequestCard", { request, role: "seller", onUpdated: async () => { refreshes++; } }, {
      approveReturnRequest: async (...args) => calls.push(["approve", ...plain(args)]),
      rejectReturnRequest: async (...args) => calls.push(["reject", ...plain(args)]),
    });
    await openAction(card, action === "approve" ? "Approve Return" : "Reject return");
    if (action === "reject") {
      assert.equal(card.button("Confirm").props.disabled, true);
      await card.button("Confirm").props.onClick();
      assert.equal(calls.length, 0);
    }
    await setField(card, action === "approve" ? "Return instructions (optional)" : "Reason for rejection", "  Seller response text  ");
    await card.button("Confirm").props.onClick();
    await card.flush();
    assert.deepEqual(calls, [[action, 8, { seller_response: "Seller response text" }]]);
    assert.equal(refreshes, 1);
    assert.equal(card.nodes().find(node => node?.type === "Dialog").props.open, false);
  }
});

test("buyer return shipment permits optional tracking, rejects unsafe URLs, and sends no client status", async () => {
  for (const trackingUrl of ["", "  https://tracking.example/return/8  "]) {
    const calls = [];
    const card = returnComponent("ReturnRequestCard", { request: { ...request, status: "Approved" }, role: "buyer" }, {
      shipReturnRequest: async (...args) => calls.push(plain(args)),
    });
    await openAction(card, "Mark return shipped");
    await setField(card, "Return tracking URL (optional)", "javascript:alert(1)");
    assert.equal(card.button("Confirm").props.disabled, true);
    await card.button("Confirm").props.onClick();
    assert.equal(calls.length, 0);
    await setField(card, "Return tracking URL (optional)", trackingUrl);
    await card.button("Confirm").props.onClick();
    assert.deepEqual(calls, [[8, trackingUrl.trim() ? { return_tracking_url: trackingUrl.trim() } : {}]]);
  }
});

test("buyer cancellation and seller receipt call only their dedicated transaction APIs", async () => {
  const cases = [
    ["buyer", "Requested", "Cancel Request", "cancelReturnRequest"],
    ["seller", "Return Shipped", "Confirm items received", "receiveReturnRequest"],
  ];
  for (const [role, status, label, method] of cases) {
    const calls = [];
    const card = returnComponent("ReturnRequestCard", { request: { ...request, status }, role }, {
      [method]: async (...args) => calls.push(args),
    });
    await openAction(card, label);
    assert.equal(calls.length, 0, "Opening confirmation must not mutate the request");
    await card.button("Confirm").props.onClick();
    assert.deepEqual(calls, [[8]]);
  }
});

test("return card holds one in-flight mutation and leaves failed actions retryable without optimistic status changes", async () => {
  let rejectRequest;
  let calls = 0;
  let refreshes = 0;
  const card = returnComponent("ReturnRequestCard", { request, role: "seller", onUpdated: async () => { refreshes++; } }, {
    approveReturnRequest: () => { calls++; return new Promise((_, reject) => { rejectRequest = reject; }); },
  });
  await openAction(card, "Approve Return");
  const submit = card.button("Confirm").props.onClick;
  const first = submit();
  await submit();
  assert.equal(calls, 1);
  await card.flush();
  assert.equal(card.button("Updating...").props.disabled, true);
  assert.equal(card.button("Back").props.disabled, true);
  assert.equal(card.nodes().find(node => node?.type === "Chip").props.label, "Awaiting your decision");
  rejectRequest(new Error("Network interrupted"));
  await first;
  await card.flush();
  assert.match(card.text(), /Network interrupted/);
  assert.equal(card.button("Confirm").props.disabled, false);
  assert.equal(refreshes, 0);
  const retry = card.button("Confirm").props.onClick();
  assert.equal(calls, 2);
  rejectRequest(Object.assign(new Error("Only a requested return can be approved."), { status: 409 }));
  await retry;
  await card.flush();
  assert.equal(refreshes, 1, "A state conflict refetches server state rather than assuming approval");
  assert.match(card.text(), /Only a requested return can be approved/);
});
