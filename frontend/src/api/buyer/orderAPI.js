import axios from "axios";
import { getRecommendationSessionId } from "./recommendationAPI.js";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/orders",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Recommendation-Session"] = getRecommendationSessionId();
  return config;
});

const handleError = (error) => {
  if (axios.isCancel(error)) throw error;
  const orderError = new Error(error.response?.data?.message || "Unable to process order");
  orderError.status = error.response?.status;
  orderError.canResume = error.response?.data?.can_resume === true;
  orderError.paymentReference = error.response?.data?.payment_reference || "";
  throw orderError;
};

export const fetchBuyerOrders = async ({ signal } = {}) => {
  try {
    const response = await api.get("/", { signal, headers: { "Cache-Control": "no-cache" } });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchBuyerPayment = async (paymentReference, { signal } = {}) => {
  try {
    const response = await api.get(`/payments/${encodeURIComponent(paymentReference)}`, {
      signal, headers: { "Cache-Control": "no-cache" },
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchPaymentMethods = async ({ signal } = {}) => {
  try {
    const response = await api.get("/payments/methods", { signal, headers: { "Cache-Control": "no-cache" } });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const placeBuyerOrder = async (addressId, paymentMethod, artworkIds) => {
  try {
    const response = await api.post("/checkout", {
      address_id: addressId,
      payment_method: paymentMethod,
      ...(artworkIds !== undefined ? { artwork_ids: artworkIds } : {}),
    });
    if (paymentMethod === "cod") window.dispatchEvent(new Event("cart-updated"));
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const cancelBuyerOrder = async (orderId) => {
  try {
    const response = await api.put(`/${orderId}/cancel`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const retryBuyerPayment = async (paymentReference) => {
  try {
    const response = await api.post(`/payments/${encodeURIComponent(paymentReference)}/retry`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const cancelBuyerPayment = async (paymentReference) => {
  try {
    const response = await api.put(`/payments/${encodeURIComponent(paymentReference)}/cancel`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
