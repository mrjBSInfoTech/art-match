import axios from "axios";

// Axios instance (centralized config)
const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/authenticate",
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

// REGISTER
export const registerUser = async (formData) => {
  try {
    const res = await api.post("/register", formData);
    console.log("Register API response:", res.data);
    return res.data;
  } catch (error) {
    console.error("Register API error:", error.message);
    handleError(error);
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
  localStorage.removeItem("buyer_token");
  localStorage.removeItem("customer_id");
  localStorage.removeItem("username");
  localStorage.removeItem("first_name");
  localStorage.removeItem("last_name");
  localStorage.removeItem("email");
};

// CHECK IF USER IS AUTHENTICATED
export const isAuthenticated = () => {
  return !!localStorage.getItem("buyer_token");
};

// GET TOKEN
export const getToken = () => {
  return localStorage.getItem("buyer_token");
};
