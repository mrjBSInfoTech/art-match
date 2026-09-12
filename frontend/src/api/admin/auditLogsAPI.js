import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/admin/audit-logs",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchAuditLogs = async (
  search = "",
  date = null,
  period = "all",
) => {
  try {
    const response = await api.get("/", {
      params: {
        search,
        date: date ? (date.format ? date.format("YYYY-MM-DD") : date) : "",
        period,
      },
    });
    return response.data || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.error ||
        error.message ||
        "Unable to load audit logs",
    );
  }
};

export const recordAdminLogout = async () => {
  await api.post("http://localhost:5000/api/admin/authenticate/logout");
};
