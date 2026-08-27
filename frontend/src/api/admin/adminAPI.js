import axios from "axios";

// Create an Axios instance (you can set global options here)
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000, // wait max 5 seconds
});

// This interceptor will automatically add the Authorization header with the token for every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Helper function to handle errors globally
const handleError = (error) => {
  if (error.response) {
    // Server responded but with an error code
    console.error("Server error:", error.response.status, error.response.data);
    throw new Error(
      error.response.data.message ||
        error.response.data.error ||
        "Server responded with an error",
    );
  } else if (error.request) {
    // Request was made but no response (server down, CORS issue, etc.)
    console.error("No response from server:", error.message);
    throw new Error(
      "Server not responding. Please check your connection or try again later.",
    );
  } else {
    // Something else happened
    console.error("Request setup error:", error.message);
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

// Fetch all admin accounts
export const fetchAdmins = async () => {
  try {
    const res = await api.get("/admin/admin");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Fetch single admin by ID
export const fetchAdminById = async (id) => {
  try {
    const res = await api.get(`/admin/admin/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Create new admin account (Handles multipart/form-data for optional image upload)
export const addAdmin = async (adminData) => {
  try {
    const formData = new FormData();
    formData.append("username", adminData.username.trim());
    formData.append("password", adminData.password.trim());
    formData.append("first_name", adminData.first_name.trim());
    formData.append("last_name", adminData.last_name.trim());
    formData.append("email", adminData.email.trim());
    formData.append("role", adminData.role || "admin");
    formData.append("can_add", adminData.can_add ? 1 : 0);
    formData.append("can_edit", adminData.can_edit ? 1 : 0);
    formData.append("can_delete", adminData.can_delete ? 1 : 0);
    formData.append("can_promote", adminData.can_promote ? 1 : 0);
    formData.append("can_demote", adminData.can_demote ? 1 : 0);

    if (adminData.file) {
      formData.append("image", adminData.file);
    }

    const res = await api.post("/admin/admin", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Update admin account
export const updateAdmin = async (id, adminData) => {
  try {
    const formData = new FormData();

    if (adminData.username)
      formData.append("username", adminData.username.trim());
    if (adminData.first_name)
      formData.append("first_name", adminData.first_name.trim());
    if (adminData.last_name)
      formData.append("last_name", adminData.last_name.trim());
    if (adminData.email) formData.append("email", adminData.email.trim());
    if (adminData.role) formData.append("role", adminData.role);

    if (adminData.can_add !== undefined)
      formData.append("can_add", adminData.can_add ? 1 : 0);
    if (adminData.can_edit !== undefined)
      formData.append("can_edit", adminData.can_edit ? 1 : 0);
    if (adminData.can_delete !== undefined)
      formData.append("can_delete", adminData.can_delete ? 1 : 0);
    if (adminData.can_promote !== undefined)
      formData.append("can_promote", adminData.can_promote ? 1 : 0);
    if (adminData.can_demote !== undefined)
      formData.append("can_demote", adminData.can_demote ? 1 : 0);

    if (adminData.password) {
      formData.append("password", adminData.password.trim());
    }

    if (adminData.file) {
      formData.append("image", adminData.file);
    } else if (adminData.image) {
      formData.append("image", adminData.image);
    }

    const res = await api.put(`/admin/admin/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Delete admin account
export const deleteAdmin = async (id) => {
  try {
    const res = await api.delete(`/admin/admin/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
