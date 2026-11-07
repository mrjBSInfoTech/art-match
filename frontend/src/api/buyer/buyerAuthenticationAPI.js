import axios from "axios";
import { clearAuthData, isAuthenticated as checkIsAuthenticated } from "../../../utils/auth";

// Axios instance (centralized config)
const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/authenticate",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

// Centralized error handler
const handleError = (error) => {
  if (error.response) {
    const errorObj = new Error(error.response.data.message || "Server error");
    errorObj.response = error.response;
    throw errorObj;
  } else if (error.request) {
    throw new Error("Server not responding");
  } else {
    throw new Error("Unexpected error occurred");
  }
};

// REGISTER
export const registerUser = async (formData) => {
  try {
    const res = await api.post("/register", formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// LOGIN
export const loginUser = async ({ username, password }) => {
  try {
    const res = await api.post("/login", {
      username,
      password,
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const cacheBuyerProfile = (profile) => {
  for (const field of ["username", "first_name", "last_name", "profile_image"]) {
    if (Object.hasOwn(profile, field)) {
      localStorage.setItem(`buyer_${field}`, profile[field] || "");
    }
  }
  window.dispatchEvent(new Event("buyer-profile-updated"));
};

export const updateBuyerProfile = async (profile) => {
  try {
    const config = {};
    if (profile instanceof FormData) {
      config.headers = { "Content-Type": "multipart/form-data" };
      config.timeout = 30000;
    }
    const res = await api.put("/me", profile, config);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const getBuyerSecuritySettings = async () => {
  try {
    const res = await api.get("/me");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateBuyerPrivacy = async (isPrivate) => {
  try {
    const res = await api.put("/me", { is_private: isPrivate });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateBuyerRecommendationPreference = async (
  allowPersonalizedRecommendations,
) => {
  try {
    const res = await api.put("/me", {
      allow_personalized_recommendations: Boolean(
        allowPersonalizedRecommendations,
      ),
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const exportBuyerData = async () => {
  try {
    const res = await api.get("/export-data");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteBuyerAccount = async (password) => {
  try {
    const res = await api.post("/delete-account", { password });
    clearAuthData("buyer");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const changeBuyerPassword = async (currentPassword, newPassword) => {
  try {
    const res = await api.put("/change-password", { currentPassword, newPassword });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// LOGOUT
export const logout = () => {
  clearAuthData("buyer");
};

export const recordLogout = async () => {
  try {
    await api.post("/logout");
  } catch {
    // Session is cleared on frontend regardless of server logging
  } finally {
    clearAuthData("buyer");
  }
};

// CHECK IF USER IS AUTHENTICATED
export const isAuthenticated = () => {
  return checkIsAuthenticated("buyer");
};

export const getBuyerProfile = async () => {
  try {
    const res = await api.get("/me");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// GET TOKEN (returns null; tokens are strictly stored in HttpOnly cookies)
export const getToken = () => {
  return null;
};
