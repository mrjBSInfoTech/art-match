import axios from "axios";
import { getRecommendationSessionId } from "./recommendationAPI";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/cart",
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    delete config.headers["X-Recommendation-Session"];
  } else {
    delete config.headers.Authorization;
    config.headers["X-Recommendation-Session"] = getRecommendationSessionId();
  }
  return config;
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

export const addToCart = async (artworkId, quantity = 1) => {
  try {
    const response = await api.post("/", {
      artwork_id: artworkId,
      quantity: Number(quantity) > 0 ? Number(quantity) : 1,
    });
    window.dispatchEvent(new Event("cart-updated"));
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateCartItemQuantity = async (artworkId, quantity = 1) => {
  try {
    const response = await api.patch(`/${artworkId}/quantity`, {
      quantity: Number(quantity) > 0 ? Number(quantity) : 1,
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
