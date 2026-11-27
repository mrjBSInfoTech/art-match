import axios from "axios";
import { API_BASE_URL } from "../apiBase.js";

const api = axios.create({
  withCredentials: true,
  baseURL: `${API_BASE_URL}/api/buyer/recommendations`,
  timeout: 30000,
});

/**
 * Fetches recommended artworks from the Item-Based Collaborative Filtering API.
 */
export const fetchRecommendedArtworks = async (topK = 4, { signal } = {}) => {
  const response = await api.get("/", {
    params: { top_k: topK },
    signal,
  });
  return response.data;
};