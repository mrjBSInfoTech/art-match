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

export const ensureChatKeyPair = async (storageKey) => {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    const keyData = JSON.parse(stored);
    return {
      privateKey: await importPrivateKey(keyData.privateKey),
      publicKey: keyData.publicKey,
      publicKeyJwk: JSON.stringify(keyData.publicKey),
    };
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  localStorage.setItem(storageKey, JSON.stringify({ privateKey, publicKey }));

  return {
    privateKey: keyPair.privateKey,
    publicKey,
    publicKeyJwk: JSON.stringify(publicKey),
  };
};

const deriveMessageKey = async (privateKey, senderPublicKeyJwk) => {
  const publicKey = await importPublicKey(JSON.parse(senderPublicKeyJwk));
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
