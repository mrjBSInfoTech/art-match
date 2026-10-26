import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/returns",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const request = async (operation) => {
  try {
    return (await operation()).data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    const failure = new Error(error.response?.data?.message || "Unable to process return request");
    failure.status = error.response?.status;
    throw failure;
  }
};

export const fetchReturnRequests = (conversationId, { signal } = {}) => request(() => api.get("/", {
  params: conversationId ? { conversation_id: conversationId } : {},
  signal,
  headers: { "Cache-Control": "no-cache" },
}));

export const createReturnRequest = (payload) => request(() => api.post("/", payload));

export const cancelReturnRequest = (id) => request(() => api.put(`/${encodeURIComponent(id)}/cancel`));

export const shipReturnRequest = (id, payload = {}) => request(() => api.put(`/${encodeURIComponent(id)}/shipped`, payload));
