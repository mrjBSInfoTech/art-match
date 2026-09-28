import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/reviews",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const submitBuyerReview = async ({ orderItemId, rating, comment }) => {
  try {
    const response = await api.post("/", {
      order_item_id: orderItemId,
      rating,
      comment,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Unable to submit review");
  }
};
