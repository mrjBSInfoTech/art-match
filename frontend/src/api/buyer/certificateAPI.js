import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/certificates",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function fetchBuyerCertificate(orderItemId, { signal } = {}) {
  try {
    const response = await api.get(`/order-items/${encodeURIComponent(orderItemId)}`, {
      signal,
      responseType: "text",
      transformResponse: [(data) => data],
    });
    return response.data;
  } catch (error) {
    let message = error.response?.data?.message;
    if (typeof message !== "string" && typeof error.response?.data === "string") {
      try { message = JSON.parse(error.response.data).message; } catch { /* Keep the transport error below. */ }
    }
    throw new Error(message || error.message || "Unable to load certificate");
  }
}
