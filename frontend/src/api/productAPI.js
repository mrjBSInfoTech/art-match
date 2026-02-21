import axios from "axios";

const API_URL = "http://localhost:5000/api/product"; // backend endpoint

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

// 🟢 Fetch all products
export const fetchProducts = async () => {
  try {
    const res = await api.get("/product");
    return { data: res.data };
  } catch (error) {
    handleError(error);
    return { data: [] };
  }
};

// ➕ Add product
export const addProduct = async (productData) => {
  try {
    const formData = new FormData();
    
    // Append all product data to FormData
    Object.keys(productData).forEach(key => {
      if (key === 'image' && productData[key] instanceof File) {
        formData.append('image', productData[key]);
      } else {
        formData.append(key, productData[key]);
      }
    });

    const res = await api.post("/product", formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// ✏️ Update product
export const updateProduct = async (id, productData) => {
  try {
    const formData = new FormData();
    
    // Append all product data to FormData
    Object.keys(productData).forEach(key => {
      if (key === 'image' && productData[key] instanceof File) {
        formData.append('image', productData[key]);
      } else {
        formData.append(key, productData[key]);
      }
    });

    const res = await api.put(`/product/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// ❌ Delete product
export const deleteProduct = async (id) => {
  try {
    const res = await api.delete(`/product/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
