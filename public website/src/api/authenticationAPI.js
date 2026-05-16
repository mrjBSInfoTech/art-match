import axios from "axios";

// Axios instance (centralized config)
const api = axios.create({
  baseURL: "http://localhost:5000/api",
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
export const registerUser = async ({ first_name, last_name, email, contact, password }) => {
  try {
    const res = await api.post("/login/register", {
      first_name,
      last_name,
      email,
      contact,
      password,
    });
    console.log("Register API response:", res.data);
    return res.data;
  } catch (error) {
    console.error("Register API error:", error.message);
    handleError(error);
  }
};

// LOGIN
export const loginUser = async ({ email, password }) => {
  try {
    const res = await api.post("/login/login", {
      email,
      password,
    });
    console.log("Login API response:", res.data);
    return res.data;
  } catch (error) {
    console.error("Login API error:", error.message);
    handleError(error);
  }
};

// LOGOUT (frontend only)
export const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("email");
};

// CHECK IF USER IS AUTHENTICATED
export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

// GET TOKEN
export const getToken = () => {
  return localStorage.getItem("token");
};
