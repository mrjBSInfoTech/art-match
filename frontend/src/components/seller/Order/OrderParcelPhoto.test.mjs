import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transformSync } from "@swc/core";

const source = readFileSync(new URL("./OrderParcelPhoto.jsx", import.meta.url), "utf8");
const transformed = transformSync(source, {
  jsc: {
    parser: { syntax: "ecmascript", jsx: true },
    transform: { react: { runtime: "classic" } },
  },
  module: { type: "commonjs" },
});

const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  forwardRef: (component) => component,
};
const theme = {
  palette: {
    background: { paper: "white" },
    divider: "gray",
    action: { hover: "lightgray" },
    text: { primary: "black", secondary: "gray" },
  },
};
const context = vm.createContext({});
const module = { exports: {} };
const require = (specifier) => {
  if (specifier === "react") return { __esModule: true, default: react };
  if (specifier === "@mui/material/styles") return { useTheme: () => theme };
  if (specifier.startsWith("@mui/icons-material/")) {
    return { __esModule: true, default: specifier };
  }
  if (specifier === "@mui/material") {
    return new Proxy({}, { get: (_, name) => name });
  }
  throw new Error(`Unexpected import: ${specifier}`);
};

vm.runInContext(
  `(function(exports, require, module) { ${transformed.code}\n})`,
  context,
)(module.exports, require, module);

function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!node || typeof node !== "object") return [];
  return [node, ...flatten(node.props?.children)];
}

test("parcel photo removal removes only the selected upload", () => {
  const firstPhoto = { name: "first.jpg" };
  const secondPhoto = { name: "second.jpg" };
  let updatePhotos;
  const tree = module.exports.default({
    open: true,
    parcelPhotos: [firstPhoto, secondPhoto],
    setParcelPhotos: (update) => { updatePhotos = update; },
    photoPreviews: ["blob:first", "blob:second"],
    setStatusError() {},
    handlingOptions: [],
    handlingInstructions: [],
    setHandlingInstructions() {},
    saving: false,
    onClose() {},
    onSubmit() {},
  });
  const removeButton = flatten(tree).find((node) =>
    node.type === "IconButton" && node.props["aria-label"] === "Remove parcel photo 2");

  assert.ok(removeButton);
  removeButton.props.onClick();
  assert.deepEqual(updatePhotos([firstPhoto, secondPhoto]), [firstPhoto]);
});
