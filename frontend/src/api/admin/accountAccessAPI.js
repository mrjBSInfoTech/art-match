import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/admin/account-access",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message || error.response?.data?.error || error.message || "Request failed",
  );
};

export const fetchAccountAccess = async () => {
  try {
    const response = await api.get("/");
    return response.data || [];
  } catch (error) {
    handleError(error);
  }
};

export const addAccountStrike = async (role, accountId, reason) => {
  try {
    const response = await api.post(`/${role}/${accountId}/strike`, { reason });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const setAccountBan = async (role, accountId, banned, reason) => {
  try {
    const response = await api.put(`/${role}/${accountId}/ban`, { banned, reason });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
