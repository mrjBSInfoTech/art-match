import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller/reviews",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchSellerReviews = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Unable to load buyer reviews");
  }
};
