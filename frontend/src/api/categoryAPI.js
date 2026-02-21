  // src/api/categoryAPI.js
  import axios from "axios";

  const API_URL = "http://localhost:5000/api/categories";

  // Create an Axios instance (you can set global options here)
  const api = axios.create({
    baseURL: "http://localhost:5000/api",
    timeout: 5000, // wait max 5 seconds
  });

  // Helper function to handle errors globally
  const handleError = (error) => {
    if (error.response) {
      // Server responded but with an error code
      console.error("🟥 Server error:", error.response.status, error.response.data);
      throw new Error(error.response.data.message || "Server responded with an error");
    } else if (error.request) {
      // Request was made but no response (server down, CORS issue, etc.)
      console.error("🟠 No response from server:", error.message);
      throw new Error("Server not responding. Please check your connection or try again later.");
    } else {
      // Something else happened
      console.error("⚠️ Request setup error:", error.message);
      throw new Error("An unexpected error occurred. Please try again.");
    }
  };

  // 🟢 Fetch all categories
  export const fetchCategories = async () => {
    try {
      console.log('Fetching categories...');
      const res = await api.get("/categories");
      console.log('Categories fetched:', res.data);
      return { data: res.data };
    } catch (error) {
      console.error('Error in fetchCategories:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error; // Let the component handle the error
    }
  };

  // ➕ Add category
  export const addCategory = async (categoryData) => {
    try {
      const res = await api.post("/categories", categoryData);
      return res.data;
    } catch (error) {
      handleError(error);
    }
  };

  // ✏️ Update category
  export const updateCategory = async (id, categoryData) => {
    try {
      const res = await api.put(`/categories/${id}`, categoryData);
      return res.data;
    } catch (error) {
      handleError(error);
    }
  };

  // ❌ Delete category
  export const deleteCategory = async (id) => {
    try {
      const res = await api.delete(`/categories/${id}`);
      return res.data;
    } catch (error) {
      handleError(error);
    }
  };
