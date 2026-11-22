import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAuthData,
  getToken,
  isAuthenticated,
  resolveAuthSectionFromUrl,
  setToken,
} from "./auth.js";

const createMemoryStorage = () => {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
};

const encodeJwtWithExp = (expSeconds) => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ student_id: 7, role: "seller", exp: expSeconds })).toString("base64url");
  return `${header}.${payload}.sig`;
};

test("setToken persists role token for cross-origin Bearer fallback and clears on clearAuthData", () => {
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = createMemoryStorage();
  try {
    const validToken = encodeJwtWithExp(Math.floor(Date.now() / 1000) + 3600);
    setToken("seller", validToken);

    assert.equal(isAuthenticated("seller"), true);
    assert.equal(getToken("seller"), validToken);
    assert.equal(getToken(), validToken);

    clearAuthData("seller");
    assert.equal(isAuthenticated("seller"), false);
    assert.equal(getToken("seller"), null);
  } finally {
    globalThis.localStorage = prevStorage;
  }
});

test("getToken discards expired tokens and keeps valid tokens per role", () => {
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = createMemoryStorage();
  try {
    const expiredToken = encodeJwtWithExp(Math.floor(Date.now() / 1000) - 60);
    const buyerToken = encodeJwtWithExp(Math.floor(Date.now() / 1000) + 3600);

    setToken("seller", expiredToken);
    setToken("buyer", buyerToken);

    assert.equal(getToken("seller"), null);
    assert.equal(getToken("buyer"), buyerToken);
  } finally {
    globalThis.localStorage = prevStorage;
  }
});

test("resolveAuthSectionFromUrl maps role endpoints accurately without cross-role leakage", () => {
  assert.equal(resolveAuthSectionFromUrl("https://api.example.com/api/seller/orders"), "seller");
  assert.equal(resolveAuthSectionFromUrl("https://api.example.com/api/chat/seller/conversations"), "seller");
  assert.equal(resolveAuthSectionFromUrl("https://api.example.com/api/buyer/artists/seller-12"), "buyer");
  assert.equal(resolveAuthSectionFromUrl("https://api.example.com/api/admin/payouts"), "admin");
  assert.equal(resolveAuthSectionFromUrl("/api/artwork-images/sign", "/seller/dashboard"), "seller");
});
