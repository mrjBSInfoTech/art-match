import axios from "axios";

export async function fetchDashboard() {
  try {
    const response = await axios.get("http://localhost:5000/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}` },
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Unable to load dashboard statistics.");
  }
}
