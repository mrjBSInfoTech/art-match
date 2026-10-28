import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "@swc/core";
import { createCertificateQr } from "./certificateQr.js";

const url = `https://artmatch.example/buyer/certificate/verify/${"a".repeat(64)}`;
function renderMessage(image, api = {}) {
  const hooks = [];
  let cursor = 0, dirty = false, tree;
  const effects = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], value => { hooks[index] = value; dirty = true; }];
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      if (!hooks[index] || dependencies.some((value, i) => value !== hooks[index][i])) {
        hooks[index] = dependencies; effects.push(callback);
      }
    },
  };
  const context = vm.createContext({ React: react, exports: {}, console: { error() {} },
    require(specifier) {
      if (specifier === "react") return react;
      if (specifier === "@mui/material") return new Proxy({}, { get: (_, key) => key });
      if (specifier.includes("certificateQr")) return { createCertificateQr };
      return api;
    },
  });
  vm.runInContext(transformSync(readFileSync(new URL("../components/buyer/Message/CertificateMessage.jsx", import.meta.url), "utf8"), {
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "classic" } } }, module: { type: "commonjs" },
  }).code, context);
  const render = () => { cursor = 0; dirty = false; tree = context.exports.default({ message: { image, text: "Certificate ID: RN-TEST" } }); effects.splice(0).forEach(effect => effect()); };
  const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === "object" ? [node, ...flatten(node.props?.children)] : [node];
  render();
  return { async flush() { for (let i = 0; i < 8; i++) { await new Promise(resolve => setTimeout(resolve, 20)); if (dirty) render(); } }, nodes: () => flatten(tree) };
}

test("certificate message renders an actual responsive QR with accessible certificate ID and no redirect button", async () => {
  const card = renderMessage(url);
  await card.flush();
  const image = card.nodes().find(node => node?.props?.component === "img");
  assert.match(image.props.src, /^data:image\/png;base64,/);
  assert.match(image.props.alt, /Certificate of Authenticity RN-TEST/);
  assert.equal(image.props.sx.maxWidth, "100%");
  assert.equal(card.nodes().find(node => node?.type === "Link").props.href, url);
  assert.equal(card.nodes().some(node => node?.type === "Button"), false);
});

test("previously delivered private links resolve to the same public identity before rendering", async () => {
  let requested;
  const card = renderMessage("/buyer/certificate/51", { fetchCertificateIdentity: async id => {
    requested = id; return { certificateId: "RN-LEGACY", verificationUrl: url };
  } });
  await card.flush();
  assert.equal(requested, "51");
  assert.match(card.nodes().find(node => node?.props?.component === "img").props.alt, /RN-LEGACY/);
});

test("QR failure stays inside the certificate card", async () => {
  const card = renderMessage("javascript:alert(1)");
  await card.flush();
  assert.ok(card.nodes().includes("Certificate QR is temporarily unavailable."));
  assert.equal(card.nodes().some(node => node?.props?.component === "img"), false);
});
