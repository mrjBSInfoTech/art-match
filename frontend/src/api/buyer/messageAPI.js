import axios from "axios";

const api = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:5000/api/chat",
  timeout: 10000,
});

// HttpOnly cookies handle authentication automatically

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

export const fetchBuyerLatestMessage = async (conversationId) => {
  try {
    const res = await api.get(
      `/buyer/conversations/${conversationId}/latest-message`,
    );
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

export const fetchBuyerParcelPhoto = async (photoPath) => {
  try {
    const response = await axios.get(`http://localhost:5000${photoPath}`, {
      responseType: "blob",
    });
    return response.data;
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
    const res = await api.post(`/buyer/conversations/${sellerId}/messages`, formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const registerBuyerChatKey = async (publicKey) => {
  await api.post("/buyer/keys", { publicKey });
};

export const fetchBuyerOwnChatKey = async () => {
  try {
    const response = await api.get("/buyer/keys/me");
    return response.data.publicKey;
  } catch (error) {
    if (error.response?.status === 404) return null;
    handleError(error);
  }
};

export const fetchBuyerChatRecoveryBackup = async () => {
  try {
    const response = await api.get("/buyer/recovery");
    return response.data.backup;
  } catch (error) {
    handleError(error);
  }
};

export const saveBuyerChatRecoveryBackup = async (backup) => {
  try {
    await api.put("/buyer/recovery", backup);
  } catch (error) {
    handleError(error);
  }
};

export const resetBuyerChatRecoveryBackup = async () => {
  try {
    await api.delete("/buyer/recovery");
  } catch (error) {
    handleError(error);
  }
};

export const fetchSellerChatKey = async (sellerId) => {
  if (!sellerId || sellerId === "undefined" || Number.isNaN(Number(sellerId))) return null;
  try {
    const res = await api.get(`/buyer/keys/${sellerId}`);
    return res.data?.publicKey || null;
  } catch (error) {
    if (error.response?.status === 404) return null;
    handleError(error);
  }
};
