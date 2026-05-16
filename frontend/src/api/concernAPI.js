// src/api/todoAPI.js
import axios from "axios";

// Create an Axios instance (you can set global options here)
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000, // wait max 5 seconds
});

// This interceptor will automatically add the Authorization header with the token for every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`; 
  }

  return config;
});

// Helper function to handle errors globally
const handleError = (error) => {
  if (error.response) {
    // Server responded but with an error code
    throw new Error(
      error.response.data.message || "Server responded with an error"
    );
  } else if (error.request) {
    // Request was made but no response (server down, CORS issue, etc.)
    throw new Error(
      "Server not responding. Please check your connection or try again later."
    );
  } else {
    // Something else happened
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

// 🟢 Fetch all concerns for current user
export const fetchConcerns = async () => {
  try {
    const res = await api.get("/concerns");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// 🟢 Fetch single concern by ID
export const fetchConcernById = async (id) => {
  try {
    const res = await api.get(`/concerns/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// ✏️ Update concern
export const updateConcern = async (id, concernData) => {
  try {
    const res = await api.put(`/concerns/${id}`, concernData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// ❌ Delete concern
export const deleteConcern = async (id) => {
  try {
    const res = await api.delete(`/concerns/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
