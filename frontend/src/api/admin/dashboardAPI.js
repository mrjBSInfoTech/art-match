import axios from "axios";
import { API_BASE_URL } from "../apiBase.js";

export async function fetchDashboard() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, {
      withCredentials: true,
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Unable to load dashboard statistics.");
  }
}
