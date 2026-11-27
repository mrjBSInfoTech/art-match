import axios from "axios";
import { API_BASE_URL } from "../apiBase.js";

const api = axios.create({
  withCredentials: true,
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
});

// HttpOnly cookies handle authentication automatically

const isTransientNetworkError = (error) =>
  !axios.isCancel(error) &&
  (error?.code === "ECONNABORTED" || (!error?.response && Boolean(error?.request)));

const requestWithRetry = async (requestFn, retries = 1) => {
  let attempt = 0;
  while (true) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt < retries && isTransientNetworkError(error)) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 400));
        continue;
      }
      throw error;
    }
  }
};

const handleError = (error) => {
  if (axios.isCancel(error)) {
    throw error;
  }
  if (error.response) {
    console.error(
      "Server error:",
      error.response.status,
      error.response.data
    );
    throw new Error(
      error.response.data.message || "Server responded with an error"
    );
  } else if (error.request) {
    console.error("No response from server:", error.message);
    throw new Error(
      "Server not responding. Please check your connection or try again later."
    );
  } else {
    console.error("Request setup error:", error.message);
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

// Fetch all artworks
export const fetchArtworks = async ({ signal } = {}) => {
  try {
    const res = await requestWithRetry(() =>
      api.get("/buyer/artworks", signal ? { signal } : undefined),
    );
    return res.data;
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.error("Error in fetchArtworks:", error);
    }
    handleError(error);
  }
};

export const fetchArtistSummaries = async () => {
  try {
    const res = await api.get("/buyer/artists");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const followArtist = async (studentId) => {
  try {
    const res = await api.post(`/buyer/artists/${encodeURIComponent(studentId)}/follow`);
    window.dispatchEvent(new Event("artist-follow-updated"));
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const unfollowArtist = async (studentId) => {
  try {
    const res = await api.delete(`/buyer/artists/${encodeURIComponent(studentId)}/follow`);
    window.dispatchEvent(new Event("artist-follow-updated"));
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchPublicSellerProfile = async (sellerId) => {
  try {
    const res = await api.get(
      `/buyer/artworks/seller/${encodeURIComponent(sellerId)}`,
    );
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchPublicSellerReviews = async (sellerId) => {
  try {
    const res = await api.get(
      `/buyer/artworks/seller/${encodeURIComponent(sellerId)}/reviews`,
    );
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Fetch single artwork by id
export const fetchArtworkById = async (id) => {
  try {

    const res = await api.get(`/buyer/artworks/${encodeURIComponent(id)}`);

    return res.data;
  } catch (error) {
    console.error('Error in fetchArtworkById:', error);
    handleError(error);
  }
};
