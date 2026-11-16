import axios from "axios";
import { API_BASE_URL } from "../apiBase.js";

const api = axios.create({
  withCredentials: true,
  baseURL: `${API_BASE_URL}/api/buyer/faqs`,
  timeout: 10000,
});

export const fetchFaqs = async () => {
  try {
    const response = await api.get("/");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || "Unable to load FAQs.",
    );
  }
};
