import axios from "axios";

const apiRoot = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

const api = axios.create({
  withCredentials: true,
  baseURL: `${apiRoot}/buyer/certificates`,
  timeout: 30000,
});

// HttpOnly cookies handle authentication automatically

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

export async function fetchPublicCertificate(token, { signal } = {}) {
  try { return (await axios.get(`${apiRoot}/buyer/certificates/verify/${encodeURIComponent(token)}`, { signal })).data; }
  catch (error) { throw new Error(error.response?.data?.message || "Unable to verify certificate."); }
}

export async function fetchCertificateIdentity(orderItemId) {
  return (await api.get(`/order-items/${encodeURIComponent(orderItemId)}/verification`)).data;
}
