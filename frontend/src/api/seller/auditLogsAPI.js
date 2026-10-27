import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller/audit-logs",
  timeout: 10000,
});

export const fetchSellerAuditLogs = async () => {
  try {
    const token = localStorage.getItem("seller_token");
    const response = await api.get("/", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Unable to load your audit logs.",
    );
  }
};
