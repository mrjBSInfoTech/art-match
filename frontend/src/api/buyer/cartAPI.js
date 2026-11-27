import axios from "axios";
import { API_BASE_URL } from "../apiBase.js";

const api = axios.create({
  withCredentials: true,
  baseURL: `${API_BASE_URL}/api/buyer/cart`,
  timeout: 5000,
});

const handleError = (error) => {
  if (axios.isCancel(error)) throw error;
  const cartError = new Error(error.response?.data?.message || "Unable to update cart");
  cartError.status = error.response?.status;
  throw cartError;
};

export const fetchCart = async ({ signal } = {}) => {
  try {
    const response = await api.get("/", { signal, headers: { "Cache-Control": "no-cache" } });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const addToCart = async (artworkId, quantity = 1, selectedProducts = undefined, orderNote = undefined) => {
  try {
    const response = await api.post("/", {
      artwork_id: artworkId,
      quantity: Number(quantity) > 0 ? Number(quantity) : 1,
      ...(selectedProducts ? { selected_products: selectedProducts } : {}),
      ...(typeof orderNote === "string" && orderNote.trim() ? { order_note: orderNote.trim() } : {}),
    });
    window.dispatchEvent(new Event("cart-updated"));
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateCartItemQuantity = async (artworkId, quantity = 1, selectedProducts = undefined) => {
  try {
    const response = await api.patch(`/${artworkId}/quantity`, {
      quantity: Number(quantity) > 0 ? Number(quantity) : 1,
      ...(selectedProducts ? { selected_products: selectedProducts } : {}),
    });
    window.dispatchEvent(new Event("cart-updated"));
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const removeFromCart = async (artworkId) => {
  try {
    const response = await api.delete(`/${artworkId}`);
    window.dispatchEvent(new Event("cart-updated"));
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
