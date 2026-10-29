import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transformSync } from "@swc/core";

const today = "2026-10-29";
const clock = Date.parse("2026-10-28T16:30:00.000Z");
class FixtureDate extends Date {
  constructor(...args) { super(...(args.length ? args : [clock])); }
  static now() { return clock; }
}

const voucher = (voucher_id, code, overrides = {}) => ({
  voucher_id, code, discount_type: "percentage", discount_value: 10,
  minimum_purchase: 0, starts_on: today, expires_on: "2026-11-30",
  applies_to_all: true, artwork: [], ...overrides,
});

// Exercise the real page's state and HTTP callbacks; extracted views remain
// boundaries so these checks do not duplicate their independent dialog tests.
function voucherPage({ vouchers = [], api = {}, clipboard } = {}) {
  let hookIndex = 0;
  let dirty = false;
  let tree;
  const hooks = [];
  const effects = [];
  const cleanups = [];
  const calls = { fetch: 0, create: [], update: [], delete: [], copy: [] };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = hookIndex++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [hooks[index], (next) => {
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
    useMemo(callback, dependencies) {
      const index = hookIndex++;
      const previous = hooks[index];
      if (!previous || dependencies.some((item, offset) => !Object.is(item, previous.dependencies[offset]))) {
        hooks[index] = { dependencies, value: callback() };
      }
      return hooks[index].value;
    },
  };
  react.useCallback = (callback, dependencies) => react.useMemo(() => callback, dependencies);
  const services = {
    async fetchSellerVouchers() {
      calls.fetch++;
      return api.fetchSellerVouchers ? api.fetchSellerVouchers() : vouchers;
    },
    async createSellerVoucher(...args) {
      calls.create.push(args);
      assert.ok(api.createSellerVoucher, "Creation needs an explicit isolated fixture");
      return api.createSellerVoucher(...args);
    },
    async updateSellerVoucher(...args) {
      calls.update.push(args);
      assert.ok(api.updateSellerVoucher, "Editing needs an explicit isolated fixture");
      return api.updateSellerVoucher(...args);
    },
    async deleteSellerVoucher(...args) {
      calls.delete.push(args);
      return api.deleteSellerVoucher?.(...args);
    },
    fetchStorefront: async () => ({ shop_name: "Fixture Shop" }),
    getSellerProfile: async () => ({ username: "Fixture Seller" }),
  };
  const theme = { palette: {
    mode: "light", background: { paper: "white", default: "white" },
    text: { primary: "black", secondary: "grey" }, divider: "grey", error: { main: "red" },
  } };
  const context = vm.createContext({
    React: react, console, Intl, Date: FixtureDate,
    localStorage: { getItem: () => null },
    navigator: { clipboard: clipboard ?? { writeText: async (code) => { calls.copy.push(code); } } },
  });
  const source = transformSync(readFileSync(new URL("../pages/seller/Voucher.jsx", import.meta.url), "utf8"), {
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
    module: { type: "commonjs" },
  }).code;
  const module = { exports: {} };
  const require = (specifier) => {
    if (specifier === "react") return react;
    if (specifier === "@mui/material") return new Proxy({}, { get: (_, name) => name });
    if (specifier === "@mui/material/styles") return { useTheme: () => theme };
    if (specifier === "react-helmet-async") return { Helmet: "Helmet" };
    if (specifier.includes("/api/")) return services;
    return { __esModule: true, default: specifier.split("/").pop() };
  };
  vm.runInContext(`(function(exports, require, module) { ${source}\n})`, context)(module.exports, require, module);
  const render = () => {
    hookIndex = 0;
    dirty = false;
    tree = module.exports.default();
    effects.splice(0).forEach((effect) => effect());
  };
  const flatten = (node) => {
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (node === null || node === undefined || node === false) return [];
    if (typeof node !== "object") return [node];
    return [node, ...flatten(node.props?.children), ...flatten(node.props?.action)];
  };
  const nodes = () => flatten(tree);
  const text = (node = tree) => flatten(node).filter((part) => ["string", "number"].includes(typeof part)).join(" ");
  const component = (name) => nodes().find((node) => node?.type === name);
  render();
  return {
    calls, nodes, text, component,
    async flush() {
      for (let step = 0; step < 6; step++) {
        await new Promise((resolve) => setImmediate(resolve));
        if (dirty) render();
      }
    },
    cards: () => nodes().filter((node) => node?.type === "VoucherCard"),
    codes: () => nodes().filter((node) => node?.type === "VoucherCard").map((node) => node.props.voucher.code),
    field: (label) => nodes().find((node) => ["TextField", "Select"].includes(node?.type)
      && (node.props.label === label || node.props.inputProps?.["aria-label"] === label)),
    button: (label) => nodes().find((node) => node?.type === "Button" && text(node) === label),
    notice: () => component("Snackbar"),
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
  };
}

async function change(page, label, value) {
  page.field(label).props.onChange({ target: { value } });
  await page.flush();
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("Edit opens the existing voucher and saves changes without creating another card", async () => {
  const existing = voucher(1, "OLD-CODE");
  const other = voucher(2, "OTHER");
  let records = [existing, other];
  const page = voucherPage({ api: {
    fetchSellerVouchers: async () => records,
    updateSellerVoucher: async (id, payload) => {
      assert.equal(id, 1);
      records = [{ ...existing, ...payload }, other];
      return records[0];
    },
  } });
  await page.flush();
  page.cards().find((card) => card.props.voucher.voucher_id === 1).props.onEdit(existing);
  await page.flush();
  assert.equal(page.component("VouvherForm").props.open, true);
  assert.equal(page.component("VouvherForm").props.selectedVoucher, existing);
  const changes = { ...existing, code: "EDITED", discount_value: 25 };
  await page.component("VouvherForm").props.onSubmit(changes);
  await page.flush();
  assert.equal(page.calls.create.length, 0);
  assert.equal(page.calls.update.length, 1);
  assert.deepEqual(page.codes(), ["OTHER", "EDITED"]);
  assert.equal(page.cards().find((card) => card.props.voucher.voucher_id === 1).props.voucher.discount_value, 25);
  assert.match(page.text(page.notice()), /updated successfully/);
  page.component("VouvherForm").props.handleClose();
  await page.flush();
  page.button("Add Voucher").props.onClick();
  await page.flush();
  assert.equal(page.component("VouvherForm").props.selectedVoucher, null);
  page.unmount();
});

test("failed edits remain retryable and a successful save survives a failed list refresh", async () => {
  const existing = voucher(1, "OWN-CODE");
  let failSave = true;
  let fetchCount = 0;
  const page = voucherPage({ api: {
    fetchSellerVouchers: async () => { if (fetchCount++) throw new Error("Refresh unavailable"); return [existing]; },
    updateSellerVoucher: async (_id, changes) => { if (failSave) throw new Error("Update rejected"); return { ...existing, ...changes }; },
  } });
  await page.flush();
  page.cards()[0].props.onEdit(existing);
  await page.flush();
  await assert.rejects(page.component("VouvherForm").props.onSubmit({ discount_value: 20 }), /Update rejected/);
  await page.flush();
  assert.equal(page.component("VouvherForm").props.open, true);
  assert.equal(page.cards()[0].props.voucher.discount_value, 10);
  failSave = false;
  await page.component("VouvherForm").props.onSubmit({ discount_value: 20 });
  await page.flush();
  assert.equal(page.cards().length, 1);
  assert.equal(page.cards()[0].props.voucher.discount_value, 20);
  assert.equal(page.calls.create.length, 0);
  assert.match(page.text(page.notice()), /updated successfully/);
  page.unmount();
});

test("voucher cards place Edit next to Delete and pass the selected voucher to the edit handler", () => {
  const selected = voucher(7, "EDIT-ME");
  const edited = [];
  const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
  const module = { exports: {} };
  const source = transformSync(readFileSync(new URL("../components/seller/Voucher/VoucherCard.jsx", import.meta.url), "utf8"), {
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
    module: { type: "commonjs" },
  }).code;
  const require = (specifier) => specifier === "@mui/material"
    ? new Proxy({}, { get: (_target, name) => name }) : { __esModule: true, default: specifier };
  vm.runInNewContext(`(function(exports, require, module) { ${source}\n})`, { React: react, Intl, Date })(module.exports, require, module);
  const tree = module.exports.default({ voucher: selected, storeName: "Test Shop", onEdit: (value) => edited.push(value) });
  const flatten = (node) => Array.isArray(node) ? node.flatMap(flatten)
    : node && typeof node === "object" ? [node, ...flatten(node.props?.children)] : [node];
  const buttons = flatten(tree).filter((node) => node?.type === "Button");
  const text = (node) => flatten(node).filter((part) => typeof part === "string").join(" ").trim();
  const index = buttons.findIndex((button) => text(button) === "Edit");
  assert.ok(index >= 0);
  assert.equal(text(buttons[index + 1]), "Delete");
  buttons[index].props.onClick();
  assert.equal(edited[0], selected);
});

test("voucher status includes Manila start/expiry dates and composes with search and discount type", async () => {
  const page = voucherPage({ vouchers: [
    voucher(1, "STARTTODAY", { artwork: [{ title: "Blue Landscape" }] }),
    voucher(2, "ENDTODAY", { starts_on: "2026-10-01", expires_on: today, discount_type: "fixed" }),
    voucher(3, "EXPIRED", { starts_on: "2026-10-01", expires_on: "2026-10-28" }),
    voucher(4, "UPCOMING", { starts_on: "2026-10-30", discount_type: "freebie" }),
  ] });
  await page.flush();
  assert.deepEqual(page.codes(), ["UPCOMING", "EXPIRED", "ENDTODAY", "STARTTODAY"]);
  await change(page, "Status", "active");
  assert.deepEqual(page.codes(), ["ENDTODAY", "STARTTODAY"], "start and end dates are inclusive in Manila");
  await change(page, "Search vouchers", "  LANDSCAPE  ");
  assert.deepEqual(page.codes(), ["STARTTODAY"], "listing titles are searchable");
  await change(page, "Search vouchers", "endtoday");
  assert.deepEqual(page.codes(), ["ENDTODAY"], "codes are searchable without case sensitivity");
  await change(page, "Discount type", "percentage");
  assert.deepEqual(page.codes(), []);
  assert.match(page.text(), /No vouchers match your search and filters/);
  await change(page, "Search vouchers", "");
  await change(page, "Discount type", "fixed");
  assert.deepEqual(page.codes(), ["ENDTODAY"]);
  await change(page, "Discount type", "all");
  await change(page, "Status", "expired");
  assert.deepEqual(page.codes(), ["EXPIRED"]);
  await change(page, "Status", "upcoming");
  await change(page, "Discount type", "freebie");
  assert.deepEqual(page.codes(), ["UPCOMING"]);
  page.unmount();
});

test("voucher sort options preserve list data and render one voucher per row", async () => {
  const page = voucherPage({ vouchers: [voucher(10, "ZEBRA"), voucher(20, "ALPHA"), voucher(30, "MIDDLE")] });
  await page.flush();
  assert.deepEqual(page.codes(), ["MIDDLE", "ALPHA", "ZEBRA"]);
  await change(page, "Sort by", "oldest");
  assert.deepEqual(page.codes(), ["ZEBRA", "ALPHA", "MIDDLE"]);
  await change(page, "Sort by", "az");
  assert.deepEqual(page.codes(), ["ALPHA", "MIDDLE", "ZEBRA"]);
  await change(page, "Sort by", "za");
  assert.deepEqual(page.codes(), ["ZEBRA", "MIDDLE", "ALPHA"]);
  await change(page, "Sort by", "newest");
  assert.deepEqual(page.codes(), ["MIDDLE", "ALPHA", "ZEBRA"]);
  const list = page.nodes().find((node) => node?.type === "Box"
    && Array.isArray(node.props.children?.[0])
    && node.props.children[0].some((child) => child?.type === "VoucherCard"));
  assert.ok(list);
  assert.match(list.props.sx.gridTemplateColumns, /^(?:1fr|minmax\(0,\s*1fr\))$/);
  assert.ok(page.cards().every((card) => card.props.storeName === "Fixture Shop"));
  page.unmount();
});

test("Add Voucher opens the form and successful creation reloads canonical titles and resets filters", async () => {
  const existing = voucher(1, "OLD");
  const created = voucher(2, "NEW", { applies_to_all: false, artwork: [77] });
  const canonical = { ...created, artwork: [{ artwork_id: 77, title: "Canonical listing title" }] };
  let fetches = 0;
  const page = voucherPage({ api: {
    fetchSellerVouchers: async () => ++fetches === 1 ? [existing] : [existing, canonical],
    createSellerVoucher: async () => created,
  } });
  await page.flush();
  await change(page, "Search vouchers", "nothing matches");
  await change(page, "Status", "expired");
  await change(page, "Discount type", "freebie");
  await change(page, "Sort by", "az");
  assert.equal(page.component("VouvherForm").props.open, false);
  page.button("Add Voucher").props.onClick();
  await page.flush();
  assert.equal(page.component("VouvherForm").props.open, true);
  const payload = { code: "NEW", discount_type: "percentage", discount_value: 10, artwork_ids: [77] };
  assert.equal(await page.component("VouvherForm").props.onSubmit(payload), created);
  await page.flush();
  assert.equal(page.calls.create.length, 1);
  assert.equal(page.calls.create[0][0], payload);
  assert.equal(page.calls.fetch, 2);
  assert.deepEqual(page.codes(), ["NEW", "OLD"]);
  assert.equal(page.cards()[0].props.voucher.artwork[0].title, "Canonical listing title");
  assert.equal(page.field("Search vouchers").props.value, "");
  assert.equal(page.field("Status").props.value, "all");
  assert.equal(page.field("Discount type").props.value, "all");
  assert.equal(page.field("Sort by").props.value, "newest");
  assert.equal(page.notice().props.severity, "success");
  assert.match(page.text(page.notice()), /Voucher NEW created successfully/);
  page.component("VouvherForm").props.handleClose();
  await page.flush();
  assert.equal(page.component("VouvherForm").props.open, false);
  page.unmount();
});

test("successful creation remains successful and visible when the display refresh fails", async () => {
  const existing = voucher(1, "EXISTING");
  const created = voucher(2, "SAVED", { applies_to_all: false, artwork: [77] });
  let fetches = 0;
  const page = voucherPage({ api: {
    fetchSellerVouchers: async () => {
      if (++fetches > 1) throw new Error("Display refresh unavailable");
      return [existing];
    },
    createSellerVoucher: async () => created,
  } });
  await page.flush();
  const result = await page.component("VouvherForm").props.onSubmit({ code: "SAVED" });
  await page.flush();
  assert.equal(result, created, "the form can finish and close rather than retry a saved creation");
  assert.deepEqual(page.codes(), ["SAVED", "EXISTING"]);
  assert.equal(page.calls.create.length, 1);
  assert.equal(page.notice().props.severity, "success");
  assert.match(page.text(page.notice()), /Voucher SAVED created successfully/);
  assert.doesNotMatch(page.text(), /Display refresh unavailable/);
  page.unmount();
});

test("failed creation rejects for form retry and shows an error notification without adding records", async () => {
  const failure = new Error("Voucher code is already active");
  const page = voucherPage({ vouchers: [voucher(1, "EXISTING")], api: {
    createSellerVoucher: async () => { throw failure; },
  } });
  await page.flush();
  await assert.rejects(page.component("VouvherForm").props.onSubmit({ code: "DUPLICATE" }), (error) => error === failure);
  await page.flush();
  assert.equal(page.calls.fetch, 1);
  assert.deepEqual(page.codes(), ["EXISTING"]);
  assert.equal(page.notice().props.open, true);
  assert.equal(page.notice().props.severity, "error");
  assert.match(page.text(page.notice()), /Voucher code is already active/);
  page.unmount();
});

test("deletion submits only the selected voucher ID once and prevents pending dismissal", async () => {
  const pending = deferred();
  const selected = voucher(11, "REMOVE");
  const retained = voucher(22, "KEEP");
  const page = voucherPage({ vouchers: [selected, retained], api: {
    deleteSellerVoucher: () => pending.promise,
  } });
  await page.flush();
  page.cards().find((card) => card.props.voucher.code === "REMOVE").props.onDelete(selected);
  await page.flush();
  assert.equal(page.component("VoucherDelete").props.voucher, selected);
  const submit = page.component("VoucherDelete").props.onSubmit;
  const first = submit();
  await submit();
  await page.flush();
  assert.deepEqual(page.calls.delete, [[11]], "no seller ID or another record is submitted");
  assert.equal(page.component("VoucherDelete").props.deleting, true);
  page.component("VoucherDelete").props.onClose();
  await page.flush();
  assert.equal(page.component("VoucherDelete").props.open, true);
  pending.resolve();
  await first;
  await page.flush();
  assert.equal(page.component("VoucherDelete").props.open, false);
  assert.equal(page.component("VoucherDelete").props.deleting, false);
  assert.deepEqual(page.codes(), ["KEEP"]);
  assert.equal(page.notice().props.severity, "success");
  assert.match(page.text(page.notice()), /Voucher REMOVE deleted/);
  page.unmount();
});

test("failed deletion retains the selected voucher and permits a successful retry", async () => {
  const selected = voucher(5, "RETRY");
  let attempts = 0;
  const page = voucherPage({ vouchers: [selected], api: {
    deleteSellerVoucher: async () => { if (++attempts === 1) throw new Error("Delete unavailable"); },
  } });
  await page.flush();
  page.cards()[0].props.onDelete(selected);
  await page.flush();
  await page.component("VoucherDelete").props.onSubmit();
  await page.flush();
  assert.equal(page.component("VoucherDelete").props.open, true);
  assert.equal(page.component("VoucherDelete").props.deleting, false);
  assert.deepEqual(page.codes(), ["RETRY"]);
  assert.equal(page.notice().props.severity, "error");
  assert.match(page.text(page.notice()), /Delete unavailable/);
  await page.component("VoucherDelete").props.onSubmit();
  await page.flush();
  assert.deepEqual(page.calls.delete, [[5], [5]]);
  assert.equal(page.component("VoucherDelete").props.open, false);
  assert.deepEqual(page.codes(), []);
  assert.match(page.text(), /No vouchers found/);
  page.unmount();
});

test("voucher copying reports success or clipboard failure and keeps snackbar clickaway behavior", async () => {
  const page = voucherPage({ vouchers: [voucher(1, "COPYME")] });
  await page.flush();
  await page.cards()[0].props.onCopy("COPYME");
  await page.flush();
  assert.deepEqual(page.calls.copy, ["COPYME"]);
  assert.equal(page.notice().props.severity, "success");
  assert.match(page.text(page.notice()), /Copied COPYME to clipboard/);
  page.notice().props.onClose({}, "clickaway");
  await page.flush();
  assert.equal(page.notice().props.open, true);
  page.notice().props.onClose({}, "timeout");
  await page.flush();
  assert.equal(page.notice().props.open, false);
  page.unmount();

  const blocked = voucherPage({ vouchers: [voucher(2, "BLOCKED")], clipboard: {
    writeText: async () => { throw new Error("Clipboard denied"); },
  } });
  await blocked.flush();
  await blocked.cards()[0].props.onCopy("BLOCKED");
  await blocked.flush();
  assert.equal(blocked.notice().props.severity, "error");
  assert.match(blocked.text(blocked.notice()), /Unable to copy the code/);
  blocked.unmount();
});
