import axios from "axios";
import { clearAuthData } from "../../../utils/auth";

const api = axios.create({
  withCredentials: true, baseURL: "http://localhost:5000/api/admin/payouts", timeout: 30000 });

// HttpOnly cookies handle authentication automatically

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

// Account change requests (3 admin approvals)
export const fetchAccountChangeRequests = async (status = "All") => (await api.get("/account-requests", { params: status !== "All" ? { status } : {} })).data;
export const approveAccountChangeRequest = async (requestId, comment = "") => (await api.post(`/account-requests/${encodeURIComponent(requestId)}/approve`, comment.trim() ? { comment: comment.trim() } : {})).data;
export const rejectAccountChangeRequest = async (requestId, reason) => (await api.post(`/account-requests/${encodeURIComponent(requestId)}/reject`, { reason: reason.trim() })).data;

// Admin payout permissions
export const fetchAdminPermissionStatus = async () => (await api.get("/permissions/status")).data;
export const requestAdminPayoutPermission = async (reason = "") => (await api.post("/permissions/request", { reason: reason.trim() })).data;
export const fetchAdminPermissionRequests = async () => (await api.get("/permissions")).data;
export const approveAdminPermissionRequest = async (requestId) => (await api.post(`/permissions/${encodeURIComponent(requestId)}/approve`, {})).data;
export const rejectAdminPermissionRequest = async (requestId, reason = "") => (await api.post(`/permissions/${encodeURIComponent(requestId)}/reject`, { reason: reason.trim() })).data;

