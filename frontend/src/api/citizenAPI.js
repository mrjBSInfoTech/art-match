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

// 🟢 Fetch all citizens
export const fetchCitizens = async () => {
  try {
    const res = await api.get("/citizens");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// 🟢 Fetch single citizen by ID
export const fetchCitizenById = async (id) => {
  try {
    const res = await api.get(`/citizens/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// ✏️ Update citizen
export const updateCitizen = async (id, citizenData) => {
  try {
    const res = await api.put(`/citizens/${id}`, citizenData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// ❌ Delete citizen
export const deleteCitizen = async (id) => {
  try {
    const res = await api.delete(`/citizens/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
