import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/admin/system-settings",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const throwApiError = (error) => {
  throw new Error(
    error.response?.data?.message || error.message || "Unexpected error occurred.",
  );
};

export const fetchAccountExpirationDate = async () => {
  try {
    const response = await api.get("/account-expiration");
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
};

export const saveAccountExpirationDate = async (date) => {
  try {
    const response = await api.put("/account-expiration", { date });
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
};

export const fetchPromotionHeroEnabled = async () => {
  try {
    const response = await api.get("/promotion-hero");
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
};

export const savePromotionHeroEnabled = async (enabled) => {
  try {
    const response = await api.put("/promotion-hero", { enabled });
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
};

export const fetchFaqs = async () => {
  try {
    const response = await api.get("/faqs");
    return Array.isArray(response.data?.faqs) ? response.data.faqs : [];
  } catch (error) {
    throwApiError(error);
  }
};

export const saveFaqs = async (faqs) => {
  try {
    const response = await api.put("/faqs", { faqs });
    return Array.isArray(response.data?.faqs) ? response.data.faqs : [];
  } catch (error) {
    throwApiError(error);
  }
};
