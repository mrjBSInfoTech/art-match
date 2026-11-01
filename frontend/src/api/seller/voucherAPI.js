import axios from "axios";

const api = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:5000/api/seller/vouchers",
  timeout: 120000,
});

// HttpOnly cookies handle authentication automatically

const handleError = (error) => {
  if (error.response) {
    throw new Error(error.response.data.message || "Voucher request failed.");
  }
  if (error.request) {
    throw new Error("Server not responding. Please try again later.");
  }
  throw new Error("Unexpected voucher error.");
};

export const fetchSellerVouchers = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const checkSellerVoucherCode = async (code) => {
  try {
    const response = await api.get("/availability", {
      params: { code },
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const createSellerVoucher = async (voucher) => {
  try {
    const response = await api.post("/", voucher);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteSellerVoucher = async (voucherId) => {
  try {
    const response = await api.delete(`/${voucherId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateSellerVoucher = async (voucherId, voucher) => {
  try {
    const response = await api.put(`/${voucherId}`, voucher);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
