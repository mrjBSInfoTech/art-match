import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/chat",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleError = (error) => {
  const message = error.response?.data?.message || error.message || "Request failed";
  throw new Error(message);
};

export const fetchBuyerConversations = async () => {
  try {
    const res = await api.get("/buyer/conversations");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchBuyerMessages = async (conversationId) => {
  try {
    const res = await api.get(`/buyer/conversations/${conversationId}/messages`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const sendBuyerMessage = async (sellerId, formData) => {
  try {
    const res = await api.post(`/buyer/conversations/${sellerId}/messages`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
