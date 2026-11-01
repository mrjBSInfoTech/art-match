import axios from "axios";

const api = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:5000/api/seller/audit-logs",
  timeout: 10000,
});

export const fetchSellerAuditLogs = async () => {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Unable to load your audit logs.",
    );
  }
};
