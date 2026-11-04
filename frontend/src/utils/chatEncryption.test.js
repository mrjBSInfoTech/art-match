import assert from "node:assert/strict";
import test from "node:test";
import {
  createChatKeyPair,
  encryptChatKeyBackup,
  encryptLegacyChatKeyBackup,
  generateRecoveryKey,
  restoreChatKeyPair,
} from "./chatEncryption.js";

globalThis.btoa = (value) => Buffer.from(value, "binary").toString("base64");
globalThis.atob = (value) => Buffer.from(value, "base64").toString("binary");
globalThis.localStorage = {
  values: new Map(),
  getItem(key) {
    return this.values.get(key) || null;
  },
  setItem(key, value) {
    this.values.set(key, value);
  },
};

const createPair = async () => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return {
    privateKey: keyPair.privateKey,
    publicKeyJwk: JSON.stringify(publicKey),
  };
};

test("version 2 recovery key backup round trips", async () => {
  const pair = await createPair();
  const recoveryKey = generateRecoveryKey();
  const backup = await encryptChatKeyBackup(pair, recoveryKey);
  const restored = await restoreChatKeyPair("test-v2", backup, recoveryKey);
  assert.equal(restored.publicKey.x, JSON.parse(pair.publicKeyJwk).x);
  assert.equal(backup.backupVersion, 2);
});

test("wrong version 2 recovery key fails", async () => {
  const pair = await createPair();
  const backup = await encryptChatKeyBackup(pair, generateRecoveryKey());
  await assert.rejects(
    restoreChatKeyPair("test-wrong-key", backup, generateRecoveryKey()),
    /could not unlock/i,
  );
});

test("legacy version 1 PIN backup still decrypts", async () => {
  const pair = await createPair();
  const backup = await encryptLegacyChatKeyBackup(pair, "123456");
  const restored = await restoreChatKeyPair("test-v1", backup, "123456");
  assert.equal(restored.publicKey.x, JSON.parse(pair.publicKeyJwk).x);
  assert.equal(backup.backupVersion, 1);
});

test("generated recovery keys contain 120 unbiased bits", () => {
  const recoveryKey = generateRecoveryKey();
  assert.match(recoveryKey, /^[A-Z2-7]{24}$/);
});

test("createChatKeyPair remains compatible with local key storage", async () => {
  const pair = await createChatKeyPair("test-storage");
  assert.equal(pair.publicKeyJwk, JSON.stringify(JSON.parse(localStorage.getItem("test-storage")).publicKey));
});
