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

export const sendSupportMessage = async (payload) => {
  try {
    if (payload instanceof FormData) {
      const response = await api.post("/buyer/messages", payload);
      return response.data;
    }
    const response = await api.post("/buyer/messages", {
      issue_type: payload?.issueType,
      message: payload?.message,
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
