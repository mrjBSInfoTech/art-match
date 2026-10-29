import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transformSync } from "@swc/core";

function voucherForm({ open = true, api = {}, selectedVoucher = null, onSubmit = async () => ({ code: "AUTO-CODE" }) } = {}) {
  const hooks = [];
  const effects = [];
  const cleanups = [];
  const timers = new Map();
  let timerId = 0;
  let hookIndex = 0;
  let dirty = false;
  let closeCalls = 0;
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
      if (!previous || dependencies.some((value, item) => !Object.is(value, previous[item]))) {
        hooks[index] = dependencies;
        effects.push(() => { cleanups[index]?.(); cleanups[index] = callback(); });
      }
    },
  };
  const theme = { palette: { background: { paper: "white" }, text: { primary: "black", secondary: "grey" }, divider: "grey" } };
  const modules = {
    fetchArtworks: async () => [{ artwork_id: 7, title: "First artwork" }, { artwork_id: 12, title: "Second artwork" }],
    checkSellerVoucherCode: async () => ({ available: true }),
    ...api,
  };
  const context = vm.createContext({
    React: react, exports: {}, console,
    window: {
      setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
      clearTimeout: (id) => timers.delete(id),
    },
    require: (specifier) => {
      if (specifier === "react") return react;
      if (specifier === "@mui/material") return new Proxy({}, { get: (_, name) => name });
      if (specifier === "@mui/material/styles") return { useTheme: () => theme };
      if (specifier.includes("/api/")) return modules;
      return { __esModule: true, default: specifier };
    },
  });
  const transformed = transformSync(readFileSync(new URL("./VouvherForm.jsx", import.meta.url), "utf8"), {
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
    module: { type: "commonjs" },
  });
  vm.runInContext(transformed.code, context);
  const Component = context.exports.default;
  let props = { open, selectedVoucher, handleClose: () => { closeCalls++; }, onSubmit };
  let tree;
  const render = () => {
    hookIndex = 0;
    dirty = false;
    tree = Component(props);
    effects.splice(0).forEach((effect) => effect());
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
    return typeof node === "object"
      ? [node, ...flatten(node.props?.children), ...flatten(node.props?.control)] : [node];
  };
  const nodes = () => flatten(tree);
  const text = (node = tree) => flatten(node).filter((item) => typeof item === "string").join(" ");
  render();
  return {
    flush, nodes, text, timers,
    dialog: () => tree,
    field: (label) => nodes().find((node) => node?.props?.label === label),
    button: (label) => nodes().find((node) => node?.type === "Button" && text(node) === label),
    submit: () => tree.props.PaperProps.onSubmit({ preventDefault() {} }),
    closeCalls: () => closeCalls,
    updateProps: (next) => { props = { ...props, ...next }; render(); },
    checkCode: async () => {
      const timer = [...timers.entries()][0];
      assert.ok(timer, "A custom-code check should be scheduled");
      assert.equal(timer[1].delay, 350);
      timers.delete(timer[0]);
      await timer[1].callback();
      await flush();
    },
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
}

async function change(page, label, value) {
  page.field(label).props.onChange({ target: { value } });
  await page.flush();
}

test("editing prefills the voucher and saves its unchanged code without checking it against itself", async () => {
  let checks = 0;
  const calls = [];
  const selectedVoucher = {
    voucher_id: 9, code: "MY-CODE", discount_type: "fixed", discount_value: "250.00",
    minimum_purchase: "500.00", starts_on: "2026-10-01", expires_on: "2026-11-30",
    applies_to_all: 0, artwork: [{ artwork_id: 7, title: "First artwork" }],
  };
  const page = voucherForm({ selectedVoucher,
    api: { checkSellerVoucherCode: async () => { checks++; return { available: false }; } },
    onSubmit: async (payload) => { calls.push(payload); },
  });
  await page.flush();
  assert.match(page.text(), /Edit Voucher/);
  assert.equal(page.field("Custom voucher code").props.value, "MY-CODE");
  assert.equal(page.field("Discount amount").props.value, "250.00");
  assert.equal(page.field("Minimum purchase").props.value, "500.00");
  assert.equal(page.field("Start date").props.value, "2026-10-01");
  assert.deepEqual(Array.from(page.field("Eligible listings").props.value), [7]);
  assert.equal(page.nodes().find((node) => node?.type === "RadioGroup"), undefined);
  assert.equal(page.timers.size, 0);
  await change(page, "Discount amount", "300");
  await page.submit();
  assert.equal(checks, 0);
  assert.equal(calls[0].code, "MY-CODE");
  assert.equal(calls[0].discount_value, 300);
  assert.equal(calls[0].minimum_purchase, 500);
  assert.equal(page.closeCalls(), 1);
  page.unmount();
});

test("edited codes are checked and failed saves keep the populated edit form available for retry", async () => {
  let fail = true;
  const calls = [];
  const page = voucherForm({
    selectedVoucher: { voucher_id: 9, code: "OLD-CODE", discount_type: "percentage", discount_value: 10,
      minimum_purchase: 0, starts_on: "2026-10-01", expires_on: "2026-11-30", applies_to_all: true, artwork: [] },
    onSubmit: async (payload) => { calls.push(payload); if (fail) throw new Error("Unable to update voucher."); },
  });
  await page.flush();
  await change(page, "Custom voucher code", "NEW-CODE");
  await page.submit();
  assert.equal(calls.length, 0);
  await page.checkCode();
  await page.submit();
  await page.flush();
  assert.match(page.text(), /Unable to update voucher/);
  assert.equal(page.field("Custom voucher code").props.value, "NEW-CODE");
  assert.equal(page.closeCalls(), 0);
  fail = false;
  await page.submit();
  assert.equal(page.closeCalls(), 1);
  page.updateProps({ open: false });
  page.updateProps({ open: true, selectedVoucher: null });
  await page.flush();
  assert.equal(page.field("Custom voucher code"), undefined);
  assert.equal(page.button("Add Voucher").props.type, "submit");
  page.unmount();
});

test("closed voucher dialog makes no requests, cancels code checks and resets each new draft", async () => {
  let listings = 0;
  let checks = 0;
  const page = voucherForm({ open: false, api: {
    fetchArtworks: async () => { listings++; return []; },
    checkSellerVoucherCode: async () => { checks++; return { available: true }; },
  } });
  await page.flush();
  assert.equal(listings, 0);
  assert.equal(checks, 0);
  page.updateProps({ open: true });
  await page.flush();
  assert.equal(listings, 1);
  page.nodes().find((node) => node?.type === "RadioGroup").props.onChange({ target: { value: "custom" } });
  await page.flush();
  await change(page, "Custom voucher code", "SAVE-10");
  assert.equal(page.timers.size, 1);
  page.updateProps({ open: false });
  await page.flush();
  assert.equal(page.timers.size, 0);
  assert.equal(checks, 0);
  page.updateProps({ open: true });
  await page.flush();
  assert.equal(listings, 2);
  assert.equal(page.field("Custom voucher code"), undefined);
  assert.equal(page.field("Discount percentage").props.value, "");
  assert.equal(page.field("Start date").props.value, "");
  assert.equal(page.nodes().find((node) => node?.type === "RadioGroup").props.value, "auto");
  page.unmount();
});

for (const [type, label, value] of [["percentage", "Discount percentage", "15.5"], ["fixed", "Discount amount", "125.5"]]) {
  test(`auto ${type} voucher preserves its payload and guards repeated submission and close`, async () => {
    const calls = [];
    let finish;
    const page = voucherForm({ onSubmit: (payload) => {
      calls.push(payload);
      return new Promise((resolve) => { finish = resolve; });
    } });
    await page.flush();
    await change(page, "Discount type", type);
    await change(page, label, value);
    await change(page, "Minimum purchase", "500.5");
    await change(page, "Start date", "2026-10-29");
    await change(page, "Expiry date", "2026-11-29");
    assert.equal(page.field(label).props.required, true);
    assert.equal(page.field("Expiry date").props.inputProps.min, "2026-10-29");
    assert.equal(page.button("Add Voucher").props.type, "submit");
    const first = page.submit();
    await page.submit();
    await page.flush();
    assert.equal(calls.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {
      discount_type: type, discount_value: Number(value), minimum_purchase: 500.5,
      starts_on: "2026-10-29", expires_on: "2026-11-29", applies_to_all: true, artwork_ids: [],
    });
    assert.equal(page.button("Cancel").props.disabled, true);
    assert.equal(page.dialog().props.disableEscapeKeyDown, true);
    page.button("Cancel").props.onClick();
    page.dialog().props.onClose();
    page.nodes().find((node) => node?.props?.["aria-label"] === "Close voucher form").props.onClick();
    assert.equal(page.closeCalls(), 0);
    finish({ code: "AUTO-CODE" });
    await first;
    await page.flush();
    assert.equal(page.closeCalls(), 1);
    page.unmount();
  });
}

test("custom freebie vouchers keep code validation, listing scope and the draft after server errors", async () => {
  const calls = [];
  let available = false;
  let checkFails = false;
  let submitFails = true;
  const page = voucherForm({
    api: { checkSellerVoucherCode: async () => {
      if (checkFails) throw new Error("Unavailable");
      return { available };
    } },
    onSubmit: async (payload) => {
      calls.push(payload);
      if (submitFails) throw new Error("Voucher code became unavailable");
      return { code: payload.code };
    },
  });
  await page.flush();
  page.nodes().find((node) => node?.type === "RadioGroup").props.onChange({ target: { value: "custom" } });
  await page.flush();
  await change(page, "Custom voucher code", "??");
  await page.submit();
  await page.flush();
  assert.equal(calls.length, 0);
  assert.match(page.text(), /Enter an available voucher code/);
  await change(page, "Custom voucher code", "TAKEN10");
  await page.checkCode();
  await page.submit();
  await page.flush();
  assert.equal(calls.length, 0);
  assert.equal(page.field("Custom voucher code").props.error, true);
  checkFails = true;
  available = true;
  await change(page, "Custom voucher code", "shop-10");
  await page.checkCode();
  assert.match(page.field("Custom voucher code").props.helperText, /server will check again/);
  await change(page, "Discount type", "freebie");
  assert.equal(page.field("Discount percentage"), undefined);
  assert.equal(page.field("Discount amount"), undefined);
  await change(page, "Minimum purchase", "100");
  await change(page, "Start date", "2026-10-29");
  await change(page, "Expiry date", "2026-11-29");
  page.nodes().find((node) => node?.type === "Checkbox").props.onChange({ target: { checked: false } });
  await page.flush();
  assert.equal(page.button("Add Voucher").props.disabled, true);
  await page.submit();
  await page.flush();
  assert.equal(calls.length, 0);
  await change(page, "Eligible listings", "7,12");
  await page.submit();
  await page.flush();
  assert.equal(page.closeCalls(), 0);
  assert.match(page.text(), /Voucher code became unavailable/);
  assert.equal(page.field("Custom voucher code").props.value, "SHOP-10");
  assert.equal(page.field("Discount type").props.value, "freebie");
  assert.deepEqual(JSON.parse(JSON.stringify(page.field("Eligible listings").props.value)), [7, 12]);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {
    code: "SHOP-10", discount_type: "freebie", discount_value: null, minimum_purchase: 100,
    starts_on: "2026-10-29", expires_on: "2026-11-29", applies_to_all: false, artwork_ids: [7, 12],
  });
  submitFails = false;
  await page.submit();
  await page.flush();
  assert.equal(page.closeCalls(), 1);
  page.unmount();
});

test("late listing responses from a closed voucher draft do not replace the new draft listings", async () => {
  let finishFirst;
  let requests = 0;
  const page = voucherForm({ api: {
    fetchArtworks: () => {
      requests++;
      return requests === 1 ? new Promise((resolve) => { finishFirst = resolve; })
        : Promise.resolve([{ artwork_id: 12, title: "Current listing" }]);
    },
  } });
  await page.flush();
  assert.match(page.text(), /Loading listings/);
  page.updateProps({ open: false });
  await page.flush();
  page.updateProps({ open: true });
  await page.flush();
  finishFirst([{ artwork_id: 7, title: "Old draft listing" }]);
  await page.flush();
  page.nodes().find((node) => node?.type === "Checkbox").props.onChange({ target: { checked: false } });
  await page.flush();
  assert.match(page.text(), /Current listing/);
  assert.doesNotMatch(page.text(), /Old draft listing/);
  page.unmount();
});
