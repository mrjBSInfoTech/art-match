import axios from "axios";
import { API_BASE_URL } from "../apiBase.js";

const apiRoot = `${API_BASE_URL}/api`;

const api = axios.create({
  withCredentials: true,
  baseURL: `${apiRoot}/buyer/certificates`,
  timeout: 30000,
});

// HttpOnly cookies handle authentication automatically

const createCertificateApiError = (error, fallbackMessage) => {
  let message = error.response?.data?.message;
  if (typeof message !== "string" && typeof error.response?.data === "string") {
    try {
      message = JSON.parse(error.response.data).message;
    } catch {
      /* Keep the transport error below. */
    }
  }
  const err = new Error(message || error.message || fallbackMessage);
  err.status = error.response?.status ?? null;
  err.isConnectionError = !error.response;
  return err;
};

export async function fetchBuyerCertificate(orderItemId, { signal } = {}) {
  try {
    const response = await api.get(`/order-items/${encodeURIComponent(orderItemId)}`, {
      signal,
      responseType: "text",
      transformResponse: [(data) => data],
    });
    return response.data;
  } catch (error) {
    throw createCertificateApiError(error, "Unable to load certificate");
  }
}

export async function fetchPublicCertificate(token, { signal } = {}) {
  try {
    return (await axios.get(`${apiRoot}/buyer/certificates/verify/${encodeURIComponent(token)}`, { signal })).data;
  } catch (error) {
    throw createCertificateApiError(error, "Unable to verify certificate.");
  }
}

export async function fetchCertificateIdentity(orderItemId) {
  try {
    return (await api.get(`/order-items/${encodeURIComponent(orderItemId)}/verification`)).data;
  } catch (error) {
    throw createCertificateApiError(error, "Unable to verify certificate.");
  }
}
