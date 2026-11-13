import axios from "axios";

const api = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:5000/api/support-chat",
  timeout: 15000,
});

// HttpOnly cookies handle authentication automatically

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

export const startSupportConversation = async (role, accountId) => {
  try {
    const response = await api.post(
      `/admin/conversations/${role}/${accountId}`,
    );
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const sendSupportReply = async (conversationId, payload) => {
  try {
    const body =
      payload instanceof FormData
        ? payload
        : typeof payload === "string"
          ? { message: payload }
          : payload;
    const response = await api.post(
      `/admin/conversations/${conversationId}/messages`,
      body,
    );
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
