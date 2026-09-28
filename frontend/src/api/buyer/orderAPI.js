import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/orders",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  throw new Error(error.response?.data?.message || "Unable to process order");
};

export const fetchBuyerOrders = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const placeBuyerOrder = async (addressId, paymentMethod) => {
  try {
    const response = await api.post("/checkout", {
      address_id: addressId,
      payment_method: paymentMethod,
    });
    window.dispatchEvent(new Event("cart-updated"));
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const cancelBuyerOrder = async (orderId) => {
  try {
    const response = await api.put(`/${orderId}/cancel`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};