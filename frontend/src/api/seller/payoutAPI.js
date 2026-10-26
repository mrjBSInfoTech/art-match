import axios from "axios";
import { clearAuthData } from "../../../utils/auth";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller/orders",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if ([401, 403].includes(error.response?.status)) {
      clearAuthData("seller");
      window.location.assign("/seller/login");
    }
    return Promise.reject(error);
  },
);

export const fetchSellerPayouts = async () => {
  const { data } = await api.get("/payouts");
  return data;
};
