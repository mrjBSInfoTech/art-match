import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("private_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`; 
  }

  return config;
});

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
    console.log("Fetching all artworks");
    const res = await api.get("/buyer/artworks");
    console.log("Artworks fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchArtworks:", error);
    handleError(error);
  }
};

// Fetch single artwork by id
export const fetchArtworkById = async (id) => {
  try {
    console.log('Fetching artwork by id', id);
    const res = await api.get(`/buyer/artworks/${encodeURIComponent(id)}`);
    console.log('Artwork fetched:', res.data);
    return res.data;
  } catch (error) {
    console.error('Error in fetchArtworkById:', error);
    handleError(error);
  }
};

