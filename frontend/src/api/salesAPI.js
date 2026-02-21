// src/api/salesAPI.js
import axios from "axios";

const API_URL = "http://localhost:5000/api/sales";

// Axios instance
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000, // 5 seconds timeout
});

// 🔴 Centralized error handler
const handleError = (error) => {
  if (error.response) {
    console.error("🟥 Server error:", error.response.status, error.response.data);
    const errorMsg = error.response.data?.message || error.response.data?.error || "Server responded with an error";
    throw new Error(errorMsg);
  } else if (error.request) {
    console.error("🟠 No response from server:", error.message);
    throw new Error("Server not responding. Please check your connection or try again later.");
  } else {
    console.error("⚠️ Request setup error:", error.message);
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

// 🟢 Fetch sales data (day, week, month, year)
export const fetchSales = async (filter = "day", date = null) => {
  try {
    const queryDate = date || new Date().toISOString().split("T")[0];

    console.log(`Fetching sales summary... Filter: ${filter}, Date: ${queryDate}`);

    const res = await api.get(`/sales`, {
      params: { filter, date: queryDate },
    });

    console.log("Sales summary API response:", res.data);

    return { data: res.data.data }; // returns { transaction_count, total_sales }
  } catch (error) {
    console.error("Error in fetchSales:", error.message);
    handleError(error);
  }
};
