import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/support-chat",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message || error.message || "Support request failed.",
  );
};

export const fetchSupportInbox = async () => {
  try {
    const response = await api.get("/admin/conversations");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    handleError(error);
  }
};

export const fetchSupportUnreadCount = async () => {
  try {
    const response = await api.get("/admin/unread-count");
    return Number(response.data?.unread_count || 0);
  } catch (error) {
    handleError(error);
  }
};

export const fetchSupportThread = async (conversationId) => {
  try {
    const response = await api.get(
      `/admin/conversations/${conversationId}/messages`,
    );
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const sendSupportReply = async (conversationId, message) => {
  try {
    const response = await api.post(
      `/admin/conversations/${conversationId}/messages`,
      { message },
    );
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
