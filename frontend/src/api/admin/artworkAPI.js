import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/admin/artwork",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleError = (error) => {
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  if (error.response?.data?.error) {
    throw new Error(error.response.data.error);
  }
  if (error.message) {
    throw new Error(error.message);
  }
  throw new Error("Unexpected error occurred");
};

// Fetch all artworks
export const fetchArtworks = async (status = "") => {
  try {
    const url = status ? `/?status=${encodeURIComponent(status)}` : "/";
    const res = await api.get(url);
    return res.data || [];
  } catch (error) {
    handleError(error);
  }
};

// Verify artworks
export const verifyArtwork = async (artworkId) => {
  try {
    const res = await api.put(`/${artworkId}`, { status: "verified" });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Reject artworks
export const rejectArtwork = async (artworkId, rejectionReason) => {
  try {
    const res = await api.put(`/${artworkId}`, {
      status: "rejected",
      rejection_reason: rejectionReason,
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
