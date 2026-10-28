import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/support-chat",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message || error.message || "Support request failed.",
  );
};

export const fetchSupportConversation = async () => {
  try {
    const response = await api.get("/buyer/conversation");
    return {
      conversation_id: response.data?.conversation_id || null,
      messages: Array.isArray(response.data?.messages)
        ? response.data.messages
        : [],
    };
  } catch (error) {
    handleError(error);
  }
};

export const fetchSupportUnreadCount = async () => {
  try {
    const response = await api.get("/buyer/unread-count");
    return Number(response.data?.unread_count || 0);
  } catch (error) {
    handleError(error);
  }
};

export const fetchSupportSummary = async () => {
  try {
    const response = await api.get("/buyer/summary");
    return response.data?.conversation || null;
  } catch (error) {
    handleError(error);
  }
};

// The reply address is taken from the buyer's profile, not from the form.
export const fetchProfileEmail = async () => {
  try {
    const response = await api.get("/buyer/profile-email");
    return response.data?.email || "";
  } catch (error) {
    handleError(error);
  }
};

export const sendSupportMessage = async ({ issueType, message }) => {
  try {
    const response = await api.post("/buyer/messages", {
      issue_type: issueType,
      message,
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
