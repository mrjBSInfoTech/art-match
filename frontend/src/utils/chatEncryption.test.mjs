import test from "node:test";
import assert from "node:assert/strict";
import {
  createChatKeyPair,
  encryptChatKeyBackup,
  restoreChatKeyPair,
} from "./chatEncryption.js";

test("chat recovery backup restores an E2EE key only with its six-digit PIN", async () => {
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };

  try {
    const storageKey = "test_chat_key_pair";
    const original = await createChatKeyPair(storageKey);
    const backup = await encryptChatKeyBackup(original, "391704");
    values.delete(storageKey);

    await assert.rejects(
      restoreChatKeyPair(storageKey, backup, "000000"),
      /could not unlock/i,
    );
    assert.equal(values.has(storageKey), false);

    const restored = await restoreChatKeyPair(storageKey, backup, "391704");
    assert.equal(restored.publicKeyJwk, original.publicKeyJwk);
    const restoredPrivate = await crypto.subtle.exportKey("jwk", restored.privateKey);
    const originalPrivate = await crypto.subtle.exportKey("jwk", original.privateKey);
    assert.equal(restoredPrivate.d, originalPrivate.d);
    assert.equal(values.has(storageKey), true);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
