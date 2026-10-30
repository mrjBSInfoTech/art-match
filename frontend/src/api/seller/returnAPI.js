import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller/returns",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const request = async (operation) => {
  try {
    return (await operation()).data;
  } catch (error) {
    const failure = new Error(error.response?.data?.message || "Unable to process return request");
    failure.status = error.response?.status;
    throw failure;
  }
};

export const fetchReturnRequests = (conversationId) => request(() => api.get("/", {
  params: { conversation_id: conversationId },
  headers: { "Cache-Control": "no-cache" },
}));

export const approveReturnRequest = (id, payload = {}) =>
  request(() => api.put(`/${encodeURIComponent(id)}/approve`, payload));

export const rejectReturnRequest = (id, payload) =>
  request(() => api.put(`/${encodeURIComponent(id)}/reject`, payload));

export const receiveReturnRequest = (id) =>
  request(() => api.put(`/${encodeURIComponent(id)}/receive`));

export const processReturnRefund = (id) =>
  request(() => api.post(`/${encodeURIComponent(id)}/refund`));
