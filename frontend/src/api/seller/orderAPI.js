import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller/orders",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  throw new Error(error.response?.data?.message || "Unable to process order");
};

export const fetchSellerOrders = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateSellerOrderStatus = async (orderId, status) => {
  try {
    const response = await api.put(`/${orderId}/status`, { status });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};