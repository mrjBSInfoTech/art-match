import axios from "axios";

const api = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:5000/api/admin/audit-logs",
  timeout: 10000,
});

// HttpOnly cookies handle authentication automatically

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
