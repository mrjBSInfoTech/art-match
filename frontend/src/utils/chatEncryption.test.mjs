import test from "node:test";
import assert from "node:assert/strict";
import {
  createChatKeyPair,
  decryptChatMessage,
  encryptChatMessage,
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

test("a restored chat key decrypts messages encrypted before recovery", async () => {
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };

  try {
    const sender = await createChatKeyPair("test_sender_key_pair");
    const recipient = await createChatKeyPair("test_recipient_key_pair");
    const backup = await encryptChatKeyBackup(recipient, "391704");
    const encrypted = await encryptChatMessage({
      privateKey: sender.privateKey,
      recipientPublicKeyJwk: recipient.publicKeyJwk,
      text: "Message sent before restoring the key.",
    });

    values.delete("test_recipient_key_pair");
    const restored = await restoreChatKeyPair(
      "test_recipient_key_pair",
      backup,
      "391704",
    );
    const decrypted = await decryptChatMessage({
      privateKey: restored.privateKey,
      keyAgreementPublicKey: sender.publicKeyJwk,
      message: {
        message_data: encrypted.encryptedText,
        encryption_iv: encrypted.encryptionIv,
      },
    });

    assert.equal(decrypted.text, "Message sent before restoring the key.");
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test("encrypted message text remains readable when its attachment cannot be opened", async () => {
  const previousStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const sender = await createChatKeyPair("test_sender_key_pair");
  const recipient = await createChatKeyPair("test_recipient_key_pair");
  const encrypted = await encryptChatMessage({
    privateKey: sender.privateKey,
    recipientPublicKeyJwk: recipient.publicKeyJwk,
    text: "Please customize this artwork.",
  });
  const previousFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return new Response("attachment unavailable", { status: 404 });
  };

  try {
    const message = await decryptChatMessage({
      privateKey: recipient.privateKey,
      keyAgreementPublicKey: sender.publicKeyJwk,
      attachmentUrl: "http://localhost/missing-attachment",
      message: {
        message_data: encrypted.encryptedText,
        encryption_iv: encrypted.encryptionIv,
        image: "http://localhost/missing-attachment",
        attachment_iv: "AAAAAAAAAAAAAAAA",
        media_type: "image/webp",
      },
      accountType: "buyer",
    });

    assert.equal(message.text, "Please customize this artwork.");
    assert.equal(message.image, null);
    assert.match(message.attachmentError, /attachment could not be opened/i);
    assert.equal(requestedUrl.searchParams.get("account_type"), "buyer");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
