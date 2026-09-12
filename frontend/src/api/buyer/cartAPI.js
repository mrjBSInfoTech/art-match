import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/cart",
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  throw new Error(error.response?.data?.message || "Unable to update cart");
};

export const fetchCart = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const addToCart = async (artworkId) => {
  try {
    const response = await api.post("/", { artwork_id: artworkId });
    window.dispatchEvent(new Event("cart-updated"));
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const removeFromCart = async (artworkId) => {
  try {
    const response = await api.delete(`/${artworkId}`);
    window.dispatchEvent(new Event("cart-updated"));
    return response.data;
  } catch (error) {
    handleError(error);
  }
};