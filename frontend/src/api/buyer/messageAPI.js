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

export const deleteBuyerConversation = async (conversationId) => {
  try {
    await api.delete(`/buyer/conversations/${conversationId}`);
  } catch (error) {
    handleError(error);
  }
};

export const fetchBuyerChatBlockStatus = async (conversationId) => {
  try {
    const res = await api.get(`/buyer/conversations/${conversationId}/block`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const blockBuyerChatUser = async (conversationId) => {
  try {
    await api.post(`/buyer/conversations/${conversationId}/block`);
  } catch (error) {
    handleError(error);
  }
};

export const unblockBuyerChatUser = async (conversationId) => {
  try {
    await api.delete(`/buyer/conversations/${conversationId}/block`);
  } catch (error) {
    handleError(error);
  }
};

export const fetchBuyerNotifications = async () => {
  try {
    const res = await api.get("/buyer/notifications");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const markBuyerNotificationsRead = async () => {
  try {
    await api.post("/buyer/notifications/read");
  } catch (error) {
    handleError(error);
  }
};

export const startBuyerConversation = async (sellerId) => {
  try {
    const res = await api.post(`/buyer/conversations/${sellerId}`);
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

export const registerBuyerChatKey = async (publicKey) => {
  await api.post("/buyer/keys", { publicKey });
};

export const fetchSellerChatKey = async (sellerId) => {
  const res = await api.get(`/buyer/keys/${sellerId}`);
  return res.data.publicKey;
};
