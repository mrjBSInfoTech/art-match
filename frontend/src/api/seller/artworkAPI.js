import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller",
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");

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
    const res = await api.get("/artwork");
    console.log("Artworks fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchArtworks:", error);
    handleError(error);
  }
};

// Fetch single artwork by ID
export const fetchArtworkById = async (id) => {
  try {
    console.log("Fetching artwork by ID:", id);
    const res = await api.get(`/artwork/${id}`);
    console.log("Artwork fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchArtworkById:", error);
    handleError(error);
  }
};

// Add new artwork
export const addArtwork = async (artworkData) => {
  try {
    if (!artworkData.title || !artworkData.title.trim()) {
      throw new Error("Title is required");
    }
    if (!artworkData.description || !artworkData.description.trim()) {
      throw new Error("Description is required");
    }
    if (!artworkData.price || isNaN(artworkData.price)) {
      throw new Error("Valid price is required");
    }
    if (!artworkData.file) {
      throw new Error("Image file is required");
    }

    const formData = new FormData();
    formData.append('file', artworkData.file);
    formData.append('title', artworkData.title.trim());
    formData.append('description', artworkData.description.trim());
    formData.append('price', artworkData.price);
    formData.append('genre', artworkData.genre.trim());
    formData.append('art_size', artworkData.art_size.trim());

    const res = await api.post("/artwork", formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};


// Update artwork
export const updateArtwork = async (id, artworkData) => {
  try {
    if (!artworkData.title || !artworkData.title.trim()) {
      throw new Error("Title is required");
    }
    if (!artworkData.description || !artworkData.description.trim()) {
      throw new Error("Description is required");
    }
    if (!artworkData.price || isNaN(artworkData.price)) {
      throw new Error("Valid price is required");
    }

    const formData = new FormData();
    if (artworkData.file) {
      formData.append('file', artworkData.file);
    }
    formData.append('title', artworkData.title.trim());
    formData.append('description', artworkData.description.trim());
    formData.append('price', artworkData.price);
    formData.append('genre', artworkData.genre.trim());
    formData.append('art_size', artworkData.art_size.trim());

    const res = await api.put(`/artwork/${id}`, formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Delete artwork
export const deleteArtwork = async (id) => {
  try {
    const res = await api.delete(`/artwork/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
