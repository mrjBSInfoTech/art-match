import axios from "axios";
import { clearAuthData, isAuthenticated as checkIsAuthenticated } from "../../../utils/auth";

// Axios instance (centralized config)
const api = axios.create({
  baseURL: "http://localhost:5000/api/admin/authenticate",
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

// LOGOUT
export const logout = () => {
  clearAuthData("admin");
};

export const recordLogout = async () => {
  try {
    await api.post("/logout");
  } catch {
    // Session is cleared on frontend regardless of server logging
  } finally {
    clearAuthData("admin");
  }
};

export const verifyPassword = async (password) => {
  try {
    const response = await api.post("/verify-password", { password });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

// CHECK IF USER IS AUTHENTICATED
export const isAuthenticated = () => {
  return checkIsAuthenticated("admin");
};

// GET TOKEN (returns null; tokens are strictly stored in HttpOnly cookies)
export const getToken = () => {
  return null;
};

// CHANGE PASSWORD
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const res = await api.put("/change-password", {
      currentPassword,
      newPassword,
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
