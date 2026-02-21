import axios from "axios";

const API_URL = "http://localhost:5000/api/supplier"; // backend endpoint

// Create an Axios instance (optional but useful)
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000, // wait max 5 seconds
});

// 🔴 Centralized error handler
const handleError = (error) => {
  if (error.response) {
    console.error("🟥 Server error:", error.response.status, error.response.data);
    throw new Error(error.response.data.message || "Server responded with an error");
  } else if (error.request) {
    console.error("🟠 No response from server:", error.message);
    throw new Error("Server not responding. Please check your connection or try again later.");
  } else {
    console.error("⚠️ Request setup error:", error.message);
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

// 🟢 Fetch all suppliers
export const fetchSuppliers = async () => {
  try {
    const res = await api.get("/supplier");
    return { data: res.data };
  } catch (error) {
    handleError(error);
    return { data: [] };
  }
};

// ➕ Add supplier
export const addSupplier = async (supplierData) => {
  try {
    const res = await api.post("/supplier", supplierData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// ✏️ Update supplier
export const updateSupplier = async (id, supplierData) => {
  try {
    const res = await api.put(`/supplier/${id}`, supplierData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// ❌ Delete supplier
export const deleteSupplier = async (id) => {
  try {
    const res = await api.delete(`/supplier/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
