import axios from "axios";

// Axios instance (centralized config)
const api = axios.create({
  baseURL: "http://localhost:5000/api/admin/authenticate",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 5000,
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

// CHECK IF USER IS AUTHENTICATED
export const isAuthenticated = () => {
  return !!localStorage.getItem("admin_token");
};

// GET TOKEN
export const getToken = () => {
  return localStorage.getItem("admin_token");
};
