import axios from "axios";
import { API_BASE_URL } from "../apiBase.js";

const api = axios.create({
  withCredentials: true,
  baseURL: `${API_BASE_URL}/api/buyer/favorites`,
  timeout: 5000,
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
