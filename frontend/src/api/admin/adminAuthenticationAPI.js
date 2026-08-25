import axios from "axios";

// Axios instance (centralized config)
const api = axios.create({
  baseURL: "http://localhost:5000/api/admin/authenticate",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Centralized error handler
const handleError = (error) => {
  if (error.response) {
    // Backend responded with an error
    const errorObj = new Error(error.response.data.message || "Server error");
    errorObj.response = error.response;
    throw errorObj;
  } else if (error.request) {
    // Request sent but no response
    throw new Error("Server not responding");
  } else {
    // Something else happened
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
    console.log("Login API response:", res.data);
    return res.data;
  } catch (error) {
    console.error("Login API error:", error.message);
    handleError(error);
  }
};

// LOGOUT
export const logout = () => {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_id");
  localStorage.removeItem("username");
  localStorage.removeItem("first_name");
  localStorage.removeItem("last_name");
  localStorage.removeItem("email");
  localStorage.removeItem("image");
  localStorage.removeItem("admin_account_type");
  localStorage.removeItem("admin_role");
  localStorage.removeItem("admin_can_add");
  localStorage.removeItem("admin_can_edit");
  localStorage.removeItem("admin_can_delete");
  localStorage.removeItem("admin_password_changed");
  localStorage.removeItem("admin_date_created");
};

export const recordLogout = async () => {
  try {
    await api.post("/logout", undefined, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
  } catch (error) {
    console.error("Unable to record admin logout:", error.message);
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
  return !!localStorage.getItem("admin_token");
};

// GET TOKEN
export const getToken = () => {
  return localStorage.getItem("admin_token");
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
