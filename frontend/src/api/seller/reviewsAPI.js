import axios from "axios";
import { API_BASE_URL } from "../apiBase.js";

const api = axios.create({
  withCredentials: true,
  baseURL: `${API_BASE_URL}/api/seller/reviews`,
  timeout: 15000,
});

// HttpOnly cookies handle authentication automatically

export const fetchSellerReviews = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Unable to load buyer reviews");
  }
};

export const saveSellerReviewResponse = async (reviewId, response) => {
  try {
    const result = await api.put(`/${reviewId}/response`, { response });
    return result.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Unable to save review response");
  }
};
