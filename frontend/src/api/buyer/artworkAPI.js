import axios from "axios";

const api = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:5000/api",
  timeout: 5000,
});

// HttpOnly cookies handle authentication automatically

const handleError = (error) => {
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
export const fetchArtworks = async () => {
  try {

    const res = await api.get("/buyer/artworks");

    return res.data;
  } catch (error) {
    console.error("Error in fetchArtworks:", error);
    handleError(error);
  }
};

export const fetchArtistSummaries = async () => {
  try {
    const res = await api.get("/buyer/artists", {
      headers: { "Cache-Control": "no-cache" },
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const followArtist = async (studentId) => {
  try {
    const res = await api.post(`/buyer/artists/${encodeURIComponent(studentId)}/follow`);
    window.dispatchEvent(new Event("artist-follow-updated"));
    window.dispatchEvent(new Event("recommendation-updated"));
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const unfollowArtist = async (studentId) => {
  try {
    const res = await api.delete(`/buyer/artists/${encodeURIComponent(studentId)}/follow`);
    window.dispatchEvent(new Event("artist-follow-updated"));
    window.dispatchEvent(new Event("recommendation-updated"));
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchPublicSellerProfile = async (sellerId) => {
  try {
    const res = await api.get(
      `/buyer/artworks/seller/${encodeURIComponent(sellerId)}`,
      { headers: { "Cache-Control": "no-cache" } },
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
      { headers: { "Cache-Control": "no-cache" } },
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
