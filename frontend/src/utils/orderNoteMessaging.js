import { fetchSellerChatKey, sendBuyerMessage } from "../api/buyer/messageAPI";
import { encryptChatMessage, loadChatKeyPair } from "./chatEncryption";
import { loadArtworkImage } from "./artworkImageLoader.js";
import { isAuthenticated } from "../../utils/auth";

const getArtworkFilename = (image) => {
  const pathname = new URL(image, window.location.origin).pathname;
  const segments = pathname.split("/").filter(Boolean);
  const artworkPathIndex = segments.lastIndexOf("uploadArtwork");
  const filename = artworkPathIndex >= 0
    ? segments[artworkPathIndex + 1]
    : segments[segments.length - 1];
  if (!filename) throw new Error("Artwork preview image is missing.");
  return decodeURIComponent(filename);
};

const createOrderPreviewFile = async (artwork) => {
  const image = artwork.product_sample_image || artwork.image;
  if (!image) return null;
  const blob = await loadArtworkImage({
    filename: getArtworkFilename(image),
    variant: "thumb",
    token: isAuthenticated("buyer") ? "buyer" : null,
  });
  const extension = blob.type.split("/")[1] || "webp";
  return new File([blob], `order-preview.${extension}`, { type: blob.type });
};

const createOrderChatMessage = async ({
  sellerId,
  text,
  file,
  keyPair,
  recipientPublicKey,
}) => {
  const formData = new FormData();
  formData.append("message", text);
  if (keyPair && recipientPublicKey) {
    const encrypted = await encryptChatMessage({
      privateKey: keyPair.privateKey,
      recipientPublicKeyJwk: recipientPublicKey,
      text,
      file,
    });
    formData.set("message", encrypted.encryptedText);
    if (encrypted.encryptedFile) formData.append("image", encrypted.encryptedFile);
    formData.append("sender_public_key", keyPair.publicKeyJwk);
    formData.append("encryption_iv", encrypted.encryptionIv);
    formData.append("attachment_iv", encrypted.attachmentIv);
    formData.append("media_type", encrypted.mediaType);
  } else if (file) {
    formData.append("image", file);
  }

  await sendBuyerMessage(sellerId, formData);
};

export const sendOrderNoteToSeller = async ({
  artwork,
  artworkId,
  quantity,
  selectedProducts,
  orderNote,
}) => {
  if (typeof orderNote !== "string" || !orderNote.trim()) return { sent: false };

  const sellerId = Number(artwork?.student_id);
  if (!Number.isInteger(sellerId) || sellerId <= 0) {
    throw new Error("The seller for this artwork could not be identified.");
  }

  const selectionSummary = Array.isArray(selectedProducts) && selectedProducts.length
    ? `Selected products: ${selectedProducts.map((item) => `${item.name} x ${item.quantity}`).join(", ")}`
    : `Quantity: ${quantity}`;
  const text = [
    `Order request for ${artwork.title || `artwork #${artworkId}`}`,
    selectionSummary,
    `Order note: ${orderNote.trim()}`,
  ].join("\n");
  const accountId = localStorage.getItem("buyer_customer_id") || "current";
  const keyPair = await loadChatKeyPair(`buyer_chat_key_pair_${accountId}`);
  const recipientPublicKey = keyPair ? await fetchSellerChatKey(sellerId) : null;

  await createOrderChatMessage({ sellerId, text, keyPair, recipientPublicKey });

  try {
    const previewFile = await createOrderPreviewFile(artwork);
    if (!previewFile) return { sent: true, previewFailed: true };
    await createOrderChatMessage({
      sellerId,
      text: `Product preview for ${artwork.title || `artwork #${artworkId}`}`,
      file: previewFile,
      keyPair,
      recipientPublicKey,
    });
    return { sent: true, previewFailed: false };
  } catch (error) {
    console.error("Unable to send the order preview to seller chat:", error);
    return { sent: true, previewFailed: true };
  }
};
