import axios from "axios";

const API_URL = "http://localhost:5000/api/files"; // backend endpoint

// Create an Axios instance (optional but useful)
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
    console.error(
      "🟥 Server error:",
      error.response.status,
      error.response.data
    );
    throw new Error(
      error.response.data.message || "Server responded with an error"
    );
  } else if (error.request) {
    // Request was made but no response (server down, CORS issue, etc.)
    console.error("🟠 No response from server:", error.message);
    throw new Error(
      "Server not responding. Please check your connection or try again later."
    );
  } else {
    // Something else happened
    console.error("⚠️ Request setup error:", error.message);
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

// Fetch all files
export const fetchFiles = async () => {
  try {
    const res = await api.get("/files");
    return { data: res.data };
  } catch (error) {
    handleError(error);
    return { data: [] };
  }
};

// Add file
export const addFile = async (fileData) => {
  try {
    const formData = new FormData();
    
    // Append the actual File object
    if (fileData.file instanceof File) {
      formData.append('file', fileData.file);
    } else {
      throw new Error('Invalid file object');
    }
    
    // Append other form fields
    if (fileData.file_type) {
      formData.append('file_type', fileData.file_type);
    }
    if (fileData.file_name) {
      formData.append('file_name', fileData.file_name);
    }

    const res = await api.post("/files", formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Update file
export const updateFile = async (id, fileData) => {
  try {
    const formData = new FormData();
    
    // Append the File object if present
    if (fileData.file instanceof File) {
      formData.append('file', fileData.file);
    }
    
    // Append other form fields
    if (fileData.file_type) {
      formData.append('file_type', fileData.file_type);
    }
    if (fileData.file_name) {
      formData.append('file_name', fileData.file_name);
    }

    const res = await api.put(`/files/${id}`, formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Delete file
export const deleteFile = async (id) => {
  try {
    const res = await api.delete(`/files/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
