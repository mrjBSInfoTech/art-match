import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller/authenticate",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

const handleError = (error) => {
  if (error.response) {
    const errorObj = new Error(error.response.data.message || "Server error");
    errorObj.response = error.response;
    throw errorObj;
  } else if (error.request) {
    throw new Error("Server not responding");
  } else {
    throw new Error("Unexpected error occurred");
  }
};

// REGISTER
export const registerUser = async (data) => {
  try {
    const config =
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {};
    const res = await api.post("/register", data, config);
    console.log("Register API response:", res.data);
    return res.data;
  } catch (error) {
    console.error("Register API error:", error.message);
    handleError(error);
  }
};

// LOGIN
export const loginUser = async ({ student_number, password }) => {
  try {
    const res = await api.post("/login", {
      student_number,
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
  localStorage.removeItem("seller_token");
  localStorage.removeItem("token");
  localStorage.removeItem("student_id");
  localStorage.removeItem("student_number");
  localStorage.removeItem("first_name");
  localStorage.removeItem("middle_name");
  localStorage.removeItem("last_name");
  localStorage.removeItem("email");
  localStorage.removeItem("phone_number");
  localStorage.removeItem("birthdate");
  localStorage.removeItem("address");
  localStorage.removeItem("cor");
  localStorage.removeItem("year_level");
  localStorage.removeItem("course");
  localStorage.removeItem("request_status");
  localStorage.removeItem("registered_date");
  localStorage.removeItem("approved_date");
  localStorage.removeItem("seller_register_status");
  localStorage.removeItem("seller_registered_date");
  localStorage.removeItem("seller_approved_date");
};

export const recordLogout = async () => {
  try {
    await api.post("/logout", undefined, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("seller_token")}`,
      },
    });
  } catch (error) {
    console.error("Unable to record student logout:", error.message);
  }
};

// CHECK IF USER IS AUTHENTICATED
export const isAuthenticated = () => {
  return !!localStorage.getItem("seller_token");
};

// GET TOKEN
export const getToken = () => {
  return localStorage.getItem("seller_token");
};
