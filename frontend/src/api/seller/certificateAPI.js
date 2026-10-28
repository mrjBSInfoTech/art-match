import axios from "axios";

const api = axios.create({
  baseURL: `${(import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "")}/seller/certificates`,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  throw new Error(error.response?.data?.message || error.message || "Unable to publish certificate");
};

export async function fetchPublishedCertificate(artworkId) {
  try {
    return (await api.get(`/${encodeURIComponent(artworkId)}`)).data;
  } catch (error) {
    handleError(error);
  }
}

export async function reserveCertificateIdentity(artworkId) {
  try { return (await api.post(`/${encodeURIComponent(artworkId)}/identity`)).data; }
  catch (error) { handleError(error); }
}

export async function fetchSellerCertificateIdentity(orderItemId) {
  try { return (await api.get(`/order-items/${encodeURIComponent(orderItemId)}/verification`)).data; }
  catch (error) { handleError(error); }
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
