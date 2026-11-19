import { addToCart, removeFromCart } from "../api/buyer/cartAPI";
import { sendOrderNoteToSeller } from "./orderNoteMessaging";

/**
 * Adds an artwork to the buyer's cart, forwards any order note to seller chat,
 * and reports status via callbacks so callers keep their local state synced.
 */
export async function addArtworkToBuyerCart({
  artworkId,
  quantity = 1,
  selectedProducts,
  orderNote,
  artwork,
  onSuccessId,
  onNotify,
}) {
  try {
    const result = await addToCart(artworkId, quantity, selectedProducts, orderNote);
    onSuccessId?.(String(artworkId));

    let chatNotice = "";
    let chatSeverity = "success";
    if (typeof orderNote === "string" && orderNote.trim()) {
      try {
        const { previewFailed } = await sendOrderNoteToSeller({
          artwork,
          artworkId,
          quantity,
          selectedProducts,
          orderNote,
        });
        if (previewFailed) {
          chatNotice = " The order note was sent to the seller, but its preview could not be attached.";
          chatSeverity = "warning";
        } else {
          chatNotice = " The order note and product preview were sent to the seller chat.";
        }
      } catch (chatError) {
        console.error("Unable to send order note to seller chat:", chatError);
        chatNotice = ` The note was saved in your cart but could not be sent to seller chat: ${chatError.message}`;
        chatSeverity = "warning";
      }
    }

    onNotify?.(`${result?.message || "Artwork added to cart"}${chatNotice}`, chatSeverity);
    return result;
  } catch (error) {
    onNotify?.(
      error.message || "Unable to add artwork to cart",
      error.status === 409 ? "warning" : "error",
    );
    throw error;
  }
}

/**
 * Removes an artwork from the buyer's cart and notifies callers.
 */
export async function removeArtworkFromBuyerCart({
  artworkId,
  onRemovedId,
  onNotify,
}) {
  try {
    const result = await removeFromCart(artworkId);
    onRemovedId?.(String(artworkId));
    onNotify?.(result?.message || "Artwork removed from cart");
  } catch (error) {
    onNotify?.(error.message || "Unable to remove artwork from cart", "error");
  }
}
