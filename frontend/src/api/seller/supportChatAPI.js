import axios from "axios";

const api = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:5000/api/support-chat",
  timeout: 15000,
});

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message || error.message || "Support request failed.",
  );
};

export const fetchSellerSupportConversation = async () => {
  try {
    const response = await api.get("/seller/conversation");
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

export const fetchSellerSupportSummary = async () => {
  try {
    const response = await api.get("/seller/summary");
    return response.data?.conversation || null;
  } catch (error) {
    handleError(error);
  }
};

export const sendSellerSupportMessage = async (payload) => {
  try {
    const body =
      payload instanceof FormData
        ? payload
        : typeof payload === "string"
          ? { message: payload }
          : payload;
    const response = await api.post("/seller/messages", body);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
