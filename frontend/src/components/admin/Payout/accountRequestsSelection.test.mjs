import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "@swc/core";

const renderAccountRequestsTable = (requests) => {
  const hooks = [];
  let cursor = 0;
  let dirty = false;
  let tree;

  const react = {
    Fragment: "Fragment",
    createElement: (type, props, ...children) =>
      typeof type === "function"
        ? type({ ...props, children })
        : { type, props: { ...props, children } },
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [
        hooks[index],
        (next) => {
          hooks[index] = typeof next === "function" ? next(hooks[index]) : next;
          dirty = true;
        },
      ];
    },
  };

  const muiProxy = new Proxy({}, { get: (_, key) => key });
  const context = vm.createContext({
    React: react,
    exports: {},
    console,
    Set,
    Array,
    Boolean,
    require(specifier) {
      if (specifier === "react") return react;
      if (specifier === "@mui/material") return muiProxy;
      if (specifier === "@mui/material/styles") return { alpha: (c) => c, useTheme: () => ({ palette: { error: { main: "#f00", dark: "#900" }, divider: "#ccc", background: { paper: "#fff" }, text: { secondary: "#666" } } }) };
      if (specifier.includes("payoutDisplay")) return { formatPayoutDate: () => "11/15/2026" };
      if (specifier.includes("adminTableStyles")) return { adminTableButtonSx: {} };
      return { __esModule: true, default: specifier.split("/").pop() };
    },
  });

  const source = readFileSync(new URL("./AccountRequestsTable.jsx", import.meta.url), "utf8");
  const result = transformSync(source, {
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } },
    module: { type: "commonjs" },
  });
  vm.runInContext(result.code, context);

  const Component = context.exports.default;
  const render = () => {
    cursor = 0;
    dirty = false;
    tree = Component({ requests, onApprove: async () => {}, onApproveSelected: async () => [], onReject: async () => {} });
  };
  const nodesOf = (node) =>
    Array.isArray(node)
      ? node.flatMap(nodesOf)
      : node === null || node === undefined || node === false
        ? []
        : typeof node === "object"
          ? [node, ...nodesOf(node.props?.children)]
          : [node];

  render();
  return {
    rerenderIfDirty() {
      if (dirty) render();
    },
    checkboxes: () => nodesOf(tree).filter((node) => node?.type === "Checkbox"),
  };
};

test("Approved payout method requests have disabled checkboxes and are excluded from Select All", () => {
  const requests = [
    { requestId: 1, studentName: "Alice", status: "Pending", userVoted: false, institutionName: "G-Xchange", accountName: "Alice", maskedAccountNumber: "****1111" },
    { requestId: 2, studentName: "Bob", status: "Approved", userVoted: true, institutionName: "Maya", accountName: "Bob", maskedAccountNumber: "****2222" },
    { requestId: 3, studentName: "Carol", status: "Rejected", userVoted: true, institutionName: "BPI", accountName: "Carol", maskedAccountNumber: "****3333" },
  ];

  const view = renderAccountRequestsTable(requests);
  const [selectAllBox, aliceBox, bobBox, carolBox] = view.checkboxes();

  assert.equal(selectAllBox.props.disabled, false);
  assert.equal(aliceBox.props.disabled, false);
  assert.equal(bobBox.props.disabled, true);
  assert.equal(carolBox.props.disabled, false);

  // Clicking Select All selects Alice & Carol, but leaves Approved Bob unchecked
  selectAllBox.props.onChange({ target: { checked: true } });
  view.rerenderIfDirty();

  const [selectAllAfter, aliceAfter, bobAfter, carolAfter] = view.checkboxes();
  assert.equal(selectAllAfter.props.checked, true);
  assert.equal(aliceAfter.props.checked, true);
  assert.equal(bobAfter.props.checked, false);
  assert.equal(bobAfter.props.disabled, true);
  assert.equal(carolAfter.props.checked, true);

  // Attempting to toggle Bob directly keeps Bob unchecked
  bobAfter.props.onChange();
  view.rerenderIfDirty();
  assert.equal(view.checkboxes()[2].props.checked, false);
});

test("Select All checkbox is disabled when all visible requests are Approved", () => {
  const requests = [
    { requestId: 2, studentName: "Bob", status: "Approved", userVoted: true, institutionName: "Maya", accountName: "Bob", maskedAccountNumber: "****2222" },
  ];
  const view = renderAccountRequestsTable(requests);
  const [selectAllBox, bobBox] = view.checkboxes();

  assert.equal(selectAllBox.props.disabled, true);
  assert.equal(selectAllBox.props.checked, false);
  assert.equal(bobBox.props.disabled, true);
  assert.equal(bobBox.props.checked, false);
});

