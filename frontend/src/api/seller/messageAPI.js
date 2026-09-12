import axios from "axios";
import { clearAuthData } from "../../../utils/auth";

const api = axios.create({
  baseURL: "http://localhost:5000/api/chat",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleError = (error) => {
  if ([401, 403].includes(error.response?.status)) {
    clearAuthData("seller");
    window.location.assign("/seller/login");
  }

  const message = error.response?.data?.message || error.message || "Request failed";
  throw new Error(message);
};

export const fetchSellerConversations = async () => {
  try {
    const res = await api.get("/seller/conversations");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchSellerMessages = async (conversationId) => {
  try {
    const res = await api.get(`/seller/conversations/${conversationId}/messages`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchSellerNotifications = async () => {
  try {
    const res = await api.get("/seller/notifications");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const startSellerConversation = async (buyerId) => {
  try {
    const res = await api.post(`/seller/conversations/${buyerId}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const sendSellerMessage = async (buyerId, formData) => {
  try {
    const res = await api.post(`/seller/conversations/${buyerId}/messages`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
