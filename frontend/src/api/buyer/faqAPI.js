import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/faqs",
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
