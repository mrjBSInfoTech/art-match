import axios from "axios";
import { clearAuthData, isAuthenticated as checkIsAuthenticated } from "../../../utils/auth";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller/authenticate",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000,
});

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
export const registerUser = async (data) => {
  try {
    const config =
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {};
    const res = await api.post("/register", data, config);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// LOGIN
export const loginUser = async ({ student_number, password }) => {
  try {
    const res = await api.post("/login", {
      student_number,
      password,
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// LOGOUT (frontend cleanup)
export const logoutUser = () => {
  clearAuthData("seller");
};

export const recordLogout = async () => {
  try {
    await api.post("/logout");
  } catch {
    // Session is cleared on frontend regardless of server logging
  } finally {
    clearAuthData("seller");
  }
};

// CHECK IF USER IS AUTHENTICATED
export const isAuthenticated = () => {
  return checkIsAuthenticated("seller");
};

// GET TOKEN (returns null; tokens are strictly stored in HttpOnly cookies)
export const getToken = () => {
  return null;
};
