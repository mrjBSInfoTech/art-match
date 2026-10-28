import axios from "axios";
import { clearAuthData } from "../../../utils/auth";

const api = axios.create({ baseURL: "http://localhost:5000/api/admin/payouts", timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401) {
    clearAuthData("admin");
    window.location.assign("/admin/login");
  }
  return Promise.reject(error);
});

export const fetchAdminPayouts = async () => (await api.get("/")).data;
// Amount, seller and destination are always loaded by the backend.
export const sendSellerPayout = async (payoutId) => (await api.post(`/${encodeURIComponent(payoutId)}/send`, {})).data;
export const reconcileSellerPayout = async (payoutId) => (await api.post(`/${encodeURIComponent(payoutId)}/reconcile`, {})).data;
export const verifySellerPayoutRefund = async (payoutId, providerRefundId, returnRequestId) => (await api.post(
  `/${encodeURIComponent(payoutId)}/refunds/verify`,
  { providerRefundId, ...(returnRequestId ? { returnRequestId } : {}) },
)).data;
