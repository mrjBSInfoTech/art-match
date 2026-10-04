import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/favorites",
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message || "Unable to update favorites right now.",
  );
};

export const fetchFavorites = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return [];
    }
    handleError(error);
  }
};

export const toggleFavorite = async (artworkId) => {
  try {
    const response = await api.post(`/${artworkId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const removeFavorite = async (artworkId) => {
  try {
    const response = await api.delete(`/${artworkId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
