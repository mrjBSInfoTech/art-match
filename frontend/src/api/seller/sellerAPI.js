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

// UPDATE SELLER PROFILE
export const updateSeller = async (sellerId, data) => {
  try {
    const config =
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : {};
    const res = await api.put("/me", data, {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${localStorage.getItem("seller_token")}`,
      },
    });
    return res.data;
  } catch (error) {
    console.error("Update seller API error:", error.message);
    handleError(error);
  }
};

// GET SELLER PROFILE
export const getSellerProfile = async () => {
  try {
    const res = await api.get("/me", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("seller_token")}`,
      },
    });
    return res.data;
  } catch (error) {
    console.error("Get seller profile API error:", error.message);
    handleError(error);
  }
};

// VERIFY PASSWORD (for confirmation dialogs)
export const verifyPassword = async (password) => {
  try {
    const res = await api.post(
      "/verify-password",
      { password },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("seller_token")}`,
        },
      },
    );
    return res.data;
  } catch (error) {
    console.error("Verify password API error:", error.message);
    handleError(error);
  }
};
