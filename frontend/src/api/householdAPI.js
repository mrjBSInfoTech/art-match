import axios from "axios";

// Create an Axios instance
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000,
});

// This interceptor will automatically add the Authorization header with the token for every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`; 
  }

  return config;
});

// Helper function to handle errors globally
const handleError = (error) => {
  if (error.response) {
    console.error(
      "Server error:",
      error.response.status,
      error.response.data
    );
    throw new Error(
      error.response.data.message || "Server responded with an error"
    );
  } else if (error.request) {
    console.error("No response from server:", error.message);
    throw new Error(
      "Server not responding. Please check your connection or try again later."
    );
  } else {
    console.error("Request setup error:", error.message);
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

// Fetch all households
export const fetchHouseholds = async () => {
  try {
    console.log("Fetching all households");
    const res = await api.get("/households");
    console.log("Households fetched:", res.data);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Fetch single household by ID
export const fetchHouseholdById = async (id) => {
  try {
    console.log("Fetching household by ID:", id);
    const res = await api.get(`/households/${id}`);
    console.log("Household fetched:", res.data);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Add new household
export const createHousehold = async (householdData) => {
  try {
    console.log("Adding household:", householdData);
    const res = await api.post("/households", householdData);
    console.log("Household added successfully:", res.data);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Add new household (alias)
export const addHousehold = async (householdData) => {
  return createHousehold(householdData);
};

// Update household
export const updateHousehold = async (id, householdData) => {
  try {
    console.log("Updating household:", id, householdData);
    const res = await api.put(`/households/${id}`, householdData);
    console.log("Household updated successfully:", res.data);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Delete household
export const deleteHousehold = async (id) => {
  try {
    console.log("Deleting household:", id);
    const res = await api.delete(`/households/${id}`);
    console.log("Household deleted successfully:", res.data);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
