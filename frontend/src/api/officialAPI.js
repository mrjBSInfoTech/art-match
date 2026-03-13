import axios from "axios";

// Create an Axios instance (you can set global options here)
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000, // wait max 5 seconds
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
    // Server responded but with an error code
    console.error(
      "Server error:",
      error.response.status,
      error.response.data
    );
    throw new Error(
      error.response.data.message || "Server responded with an error"
    );
  } else if (error.request) {
    // Request was made but no response (server down, CORS issue, etc.)
    console.error("No response from server:", error.message);
    throw new Error(
      "Server not responding. Please check your connection or try again later."
    );
  } else {
    // Something else happened
    console.error("Request setup error:", error.message);
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

// Fetch all officials
export const fetchOfficials = async () => {
  try {
    console.log("Fetching all officials");
    const res = await api.get("/officials");
    console.log("Officials fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchOfficials:", error);
    handleError(error);
  }
};

// Fetch single official by ID
export const fetchOfficialById = async (id) => {
  try {
    console.log("Fetching official by ID:", id);
    const res = await api.get(`/officials/${id}`);
    console.log("Official fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchOfficialById:", error);
    handleError(error);
  }
};

// Add new official
export const addOfficial = async (officialData) => {
  try {
    // Validate required fields
    if (!officialData.first_name || !officialData.first_name.trim()) {
      throw new Error("First name is required");
    }
    if (!officialData.last_name || !officialData.last_name.trim()) {
      throw new Error("Last name is required");
    }
    if (!officialData.dob || !officialData.dob.trim()) {
      throw new Error("Date of birth is required");
    }
    if (!officialData.position || !officialData.position.trim()) {
      throw new Error("Position is required");
    }
    if (!officialData.email || !officialData.email.trim()) {
      throw new Error("Email is required");
    }
    if (!officialData.phone_number || !officialData.phone_number.trim()) {
      throw new Error("Phone number is required");
    }
    if (!officialData.address || !officialData.address.trim()) {
      throw new Error("Address is required");
    }

    const res = await api.post("/officials", {
      first_name: officialData.first_name.trim(),
      last_name: officialData.last_name.trim(),
      middle_name: officialData.middle_name ? officialData.middle_name.trim() : null,
      dob: officialData.dob.trim(),
      position: officialData.position.trim(),
      email: officialData.email.trim(),
      phone_number: officialData.phone_number.trim(),
      address: officialData.address.trim(),
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Update official
export const updateOfficial = async (id, officialData) => {
  try {
    // Validate required fields
    if (!officialData.first_name || !officialData.first_name.trim()) {
      throw new Error("First name is required");
    }
    if (!officialData.last_name || !officialData.last_name.trim()) {
      throw new Error("Last name is required");
    }
    if (!officialData.dob || !officialData.dob.trim()) {
      throw new Error("Date of birth is required");
    }
    if (!officialData.position || !officialData.position.trim()) {
      throw new Error("Position is required");
    }
    if (!officialData.email || !officialData.email.trim()) {
      throw new Error("Email is required");
    }
    if (!officialData.phone_number || !officialData.phone_number.trim()) {
      throw new Error("Phone number is required");
    }
    if (!officialData.address || !officialData.address.trim()) {
      throw new Error("Address is required");
    }

    const res = await api.put(`/officials/${id}`, {
      official_account_id: officialData.official_account_id || null,
      first_name: officialData.first_name.trim(),
      last_name: officialData.last_name.trim(),
      middle_name: officialData.middle_name ? officialData.middle_name.trim() : null,
      dob: officialData.dob.trim(),
      position: officialData.position.trim(),
      email: officialData.email.trim(),
      phone_number: officialData.phone_number.trim(),
      address: officialData.address.trim(),
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Delete official
export const deleteOfficial = async (id) => {
  try {
    const res = await api.delete(`/officials/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
