import axios from "axios";

const api = axios.create({
  withCredentials: true,
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
    const res = await api.put("/me", data, config);
    return res.data;
  } catch (error) {
    console.error("Update seller API error:", error.message);
    handleError(error);
  }
};

// GET SELLER PROFILE
export const getSellerProfile = async () => {
  try {
    const res = await api.get("/me");
    return res.data;
  } catch (error) {
    console.error("Get seller profile API error:", error.message);
    handleError(error);
  }
};

// VERIFY PASSWORD (for confirmation dialogs)
export const verifyPassword = async (password) => {
  try {
    const res = await api.post("/verify-password", { password });
    return res.data;
  } catch (error) {
    console.error("Verify password API error:", error.message);
    handleError(error);
  }
};

// CHANGE PASSWORD
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const res = await api.put("/change-password", { currentPassword, newPassword });
    return res.data;
  } catch (error) {
    console.error("Change password API error:", error.message);
    handleError(error);
  }
};

// FIRST-TIME LOGIN CONSENT & PASSWORD SETUP (for bulk-imported student accounts)
export const completeFirstLoginSetup = async ({
  consent_accepted,
  consent_version = "1.0",
  currentPassword,
  current_password,
  newPassword,
  new_password,
}) => {
  try {
    const res = await api.post("/first-login-setup", {
      consent_accepted,
      consent_version,
      currentPassword: currentPassword ?? current_password,
      newPassword: newPassword ?? new_password,
    });
    return res.data;
  } catch (error) {
    console.error("First-login setup API error:", error.message);
    handleError(error);
  }
};

// EXPORT SELLER PERSONAL DATA (RA 10173 Right to Data Portability)
export const exportSellerData = async () => {
  try {
    const res = await api.get("/export-data");
    return res.data;
  } catch (error) {
    console.error("Export seller data API error:", error.message);
    handleError(error);
  }
};

// DEACTIVATE / DELETE SELLER ACCOUNT (RA 10173 Right to Blocking/Erasure)
export const deleteSellerAccount = async (password) => {
  try {
    const res = await api.post("/delete-account", { password });
    return res.data;
  } catch (error) {
    console.error("Delete seller account API error:", error.message);
    handleError(error);
  }
};
