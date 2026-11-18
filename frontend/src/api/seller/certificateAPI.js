import axios from "axios";
import { API_BASE_URL } from "../apiBase.js";

const api = axios.create({
  withCredentials: true,
  baseURL: `${API_BASE_URL}/api/seller/certificates`,
  timeout: 30000,
});

// HttpOnly cookies handle authentication automatically

const handleError = (error) => {
  throw new Error(error.response?.data?.message || error.message || "Unable to process certificate request");
};

export async function fetchPublishedCertificate(artworkId) {
  try {
    return (await api.get(`/${encodeURIComponent(artworkId)}`)).data;
  } catch (error) {
    handleError(error);
  }
}

export async function reserveCertificateIdentity(artworkId) {
  try {
    return (await api.post(`/${encodeURIComponent(artworkId)}/identity`)).data;
  } catch (error) {
    handleError(error);
  }
}

export async function fetchSellerCertificateIdentity(orderItemId) {
  try {
    return (await api.get(`/order-items/${encodeURIComponent(orderItemId)}/verification`)).data;
  } catch (error) {
    handleError(error);
  }
}

export async function publishCertificate({ artworkId, certificateId, svg }) {
  const form = new FormData();
  form.append("artwork_id", String(artworkId));
  form.append("certificate_id", certificateId);
  form.append("certificate_svg", new Blob([svg], { type: "image/svg+xml" }), "certificate.svg");
  try {
    return (await api.post("/", form)).data;
  } catch (error) {
    handleError(error);
  }
}

export async function searchSellerCertificates({ query = "", excludeSelf = true, signal } = {}) {
  try {
    const response = await api.get("/search", {
      params: { q: query, excludeSelf: String(excludeSelf) },
      signal,
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
}
