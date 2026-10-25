const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const base64ToBytes = (value) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const importPrivateKey = (jwk) => crypto.subtle.importKey(
  "jwk",
  jwk,
  { name: "ECDH", namedCurve: "P-256" },
  true,
  ["deriveKey", "deriveBits"],
);

const importPublicKey = (jwk) => crypto.subtle.importKey(
  "jwk",
  jwk,
  { name: "ECDH", namedCurve: "P-256" },
  true,
  [],
);

const storeChatKeyPair = async (storageKey, privateJwk, publicKey) => {
  const publicJwk = typeof publicKey === "string" ? JSON.parse(publicKey) : publicKey;
  const privateKey = await importPrivateKey(privateJwk);
  localStorage.setItem(storageKey, JSON.stringify({ privateKey: privateJwk, publicKey: publicJwk }));
  return {
    privateKey,
    publicKey: publicJwk,
    publicKeyJwk: JSON.stringify(publicJwk),
  };
};

export const loadChatKeyPair = async (storageKey) => {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return null;
  const keyData = JSON.parse(stored);
  if (!keyData.privateKey || !keyData.publicKey) {
    throw new Error("The saved secure chat key is incomplete");
  }
  return storeChatKeyPair(storageKey, keyData.privateKey, keyData.publicKey);
};

export const createChatKeyPair = async (storageKey) => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return storeChatKeyPair(storageKey, privateKey, publicKey);
};

const recoveryIterations = 600000;
const deriveRecoveryKey = async (pin, salt) => {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: recoveryIterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encryptChatKeyBackup = async (keyPair, pin) => {
  if (!/^\d{6}$/.test(pin)) throw new Error("Enter a six-digit recovery PIN");
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveRecoveryKey(pin, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(privateJwk)),
  );
  return {
    encryptedPrivateKey: bytesToBase64(new Uint8Array(ciphertext)),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    publicKey: keyPair.publicKeyJwk,
  };
};

export const restoreChatKeyPair = async (storageKey, backup, pin) => {
  if (!/^\d{6}$/.test(pin)) throw new Error("Enter your six-digit recovery PIN");
  let privateJwk;
  let publicJwk;
  try {
    const key = await deriveRecoveryKey(pin, base64ToBytes(backup.salt));
    const privateBytes = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(backup.iv) },
      key,
      base64ToBytes(backup.encryptedPrivateKey),
    );
    privateJwk = JSON.parse(decoder.decode(privateBytes));
    publicJwk = JSON.parse(backup.publicKey);
    if (privateJwk.x !== publicJwk.x || privateJwk.y !== publicJwk.y
      || privateJwk.crv !== "P-256" || publicJwk.crv !== "P-256") {
      throw new Error("Key pair does not match");
    }
    await importPrivateKey(privateJwk);
  } catch {
    throw new Error("That PIN could not unlock this chat backup");
  }
  return storeChatKeyPair(storageKey, privateJwk, publicJwk);
};

const MIN_RECOVERY_PIN = 100000;
const MAX_RECOVERY_PIN = 1000000;
export const generateRecoveryPin = () =>
  String(
    crypto.getRandomValues(new Uint32Array(1))[0]
      % (MAX_RECOVERY_PIN - MIN_RECOVERY_PIN)
      + MIN_RECOVERY_PIN,
  );

export const ensureChatKeyPair = async (storageKey) => {
  const stored = await loadChatKeyPair(storageKey);
  return stored || createChatKeyPair(storageKey);
};

const deriveMessageKey = async (privateKey, senderPublicKeyJwk) => {
  if (!(privateKey instanceof CryptoKey)) {
    throw new Error("Secure messaging is not unlocked on this device yet");
  }
  if (!senderPublicKeyJwk) {
    throw new Error("The other person has not set up secure messaging yet");
  }
  const publicKey = await importPublicKey(
    typeof senderPublicKeyJwk === "string" ? JSON.parse(senderPublicKeyJwk) : senderPublicKeyJwk,
  );
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encryptChatMessage = async ({ privateKey, recipientPublicKeyJwk, text, file }) => {
  const encryptionKey = await deriveMessageKey(privateKey, recipientPublicKeyJwk);
  const encryptionIv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedText = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: encryptionIv },
    encryptionKey,
    encoder.encode(text || ""),
  );

  let encryptedFile = null;
  let attachmentIv = null;
  if (file) {
    attachmentIv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedBytes = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: attachmentIv },
      encryptionKey,
      await file.arrayBuffer(),
    );
    encryptedFile = new File([encryptedBytes], "attachment.bin", { type: "application/octet-stream" });
  }

  return {
    encryptedText: bytesToBase64(new Uint8Array(encryptedText)),
    encryptionIv: bytesToBase64(encryptionIv),
    encryptedFile,
    attachmentIv: attachmentIv ? bytesToBase64(attachmentIv) : "",
    mediaType: file?.type || "",
  };
};

export const decryptChatMessage = async ({ privateKey, message, attachmentUrl, keyAgreementPublicKey }) => {
  const publicKeyJwk = keyAgreementPublicKey || message.sender_public_key;
  if (!publicKeyJwk || !message.encryption_iv) {
    return {
      text: message.message_data || "",
      image: message.image || null,
    };
  }

  const encryptionKey = await deriveMessageKey(privateKey, publicKeyJwk);
  const decryptedText = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(message.encryption_iv) },
    encryptionKey,
    base64ToBytes(message.message_data || ""),
  );

  let image = null;
  if (message.image && message.attachment_iv && attachmentUrl) {
    const response = await fetch(attachmentUrl);
    if (!response.ok) throw new Error("Unable to load encrypted attachment");
    const encryptedAttachment = await response.arrayBuffer();
    const decryptedAttachment = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(message.attachment_iv) },
      encryptionKey,
      encryptedAttachment,
    );
    image = URL.createObjectURL(new Blob([decryptedAttachment], { type: message.media_type || "application/octet-stream" }));
  }

  return {
    text: decoder.decode(decryptedText),
    image,
  };
};
