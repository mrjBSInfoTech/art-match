import axios from "axios";
import { clearAuthData } from "../../../utils/auth";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthData("seller");
      window.location.assign("/seller/login");
    }
    return Promise.reject(error);
  },
);

export const fetchSellerPayouts = async () => {
  const { data } = await api.get("/orders/payouts");
  return data;
};

export const fetchPayoutAccount = async () => {
  const { data } = await api.get("/payout-account");
  return data;
};

export const fetchPayoutInstitutions = async () => {
  const { data } = await api.get("/payout-account/institutions");
  return data;
};

export const savePayoutAccount = async ({ institutionCode, provider, accountName, accountNumber }) => {
  const { data } = await api.put("/payout-account", { institutionCode, provider, accountName, accountNumber });
  return data;
};
