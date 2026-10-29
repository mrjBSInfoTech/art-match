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
// Identity, amount, destination, approval count and provider are server-owned.
export const requestSellerPayout = async (payoutId) => (await api.post(`/${encodeURIComponent(payoutId)}/request`, {})).data;
export const approveSellerPayout = async (payoutId, comment = "") => (await api.post(`/${encodeURIComponent(payoutId)}/approve`, comment.trim() ? { comment: comment.trim() } : {})).data;
export const rejectSellerPayout = async (payoutId, comment) => (await api.post(`/${encodeURIComponent(payoutId)}/reject`, { comment: comment.trim() })).data;
export const releaseSellerPayout = async (payoutId) => (await api.post(`/${encodeURIComponent(payoutId)}/release`, {})).data;
export const fetchSellerPayoutApprovals = async (payoutId) => (await api.get(`/${encodeURIComponent(payoutId)}/approvals`)).data;
export const reconcileSellerPayout = async (payoutId) => (await api.post(`/${encodeURIComponent(payoutId)}/reconcile`, {})).data;
export const verifySellerPayoutRefund = async (payoutId, providerRefundId, returnRequestId) => (await api.post(
  `/${encodeURIComponent(payoutId)}/refunds/verify`,
  { providerRefundId, ...(returnRequestId ? { returnRequestId } : {}) },
)).data;
