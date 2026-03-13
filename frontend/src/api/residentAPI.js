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

// Fetch all residents
export const fetchResidents = async () => {
  try {
    console.log("Fetching all residents");
    const res = await api.get("/residents");
    console.log("Residents fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchResidents:", error);
    handleError(error);
  }
};

// Fetch single resident by ID
export const fetchResidentById = async (id) => {
  try {
    console.log("Fetching resident by ID:", id);
    const res = await api.get(`/residents/${id}`);
    console.log("Resident fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchResidentById:", error);
    handleError(error);
  }
};

// Add new resident
export const addResident = async (residentData) => {
  try {
    // Validate required fields
    if (!residentData.first_name || !residentData.first_name.trim()) {
      throw new Error("First name is required");
    }
    if (!residentData.last_name || !residentData.last_name.trim()) {
      throw new Error("Last name is required");
    }
    if (!residentData.gender || !residentData.gender.trim()) {
      throw new Error("Gender is required");
    }
    if (!residentData.dob || !residentData.dob.trim()) {
      throw new Error("Date of birth is required");
    }
    if (!residentData.address || !residentData.address.trim()) {
      throw new Error("Address is required");
    }
    if (!residentData.phone_number || !residentData.phone_number.trim()) {
      throw new Error("Phone number is required");
    }
    if (!residentData.email || !residentData.email.trim()) {
      throw new Error("Email is required");
    }

    const res = await api.post("/residents", {
      first_name: residentData.first_name.trim(),
      last_name: residentData.last_name.trim(),
      middle_name: residentData.middle_name ? residentData.middle_name.trim() : null,
      gender: residentData.gender.trim(),
      dob: residentData.dob,
      email: residentData.email.trim(),
      phone_number: residentData.phone_number.trim(),
      address: residentData.address.trim(),
      user_id: residentData.user_id || null,
      household_id: residentData.household_id || null,
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Update resident
export const updateResident = async (id, residentData) => {
  try {
    // Validate required fields
    if (!residentData.first_name || !residentData.first_name.trim()) {
      throw new Error("First name is required");
    }
    if (!residentData.last_name || !residentData.last_name.trim()) {
      throw new Error("Last name is required");
    }
    if (!residentData.gender || !residentData.gender.trim()) {
      throw new Error("Gender is required");
    }
    if (!residentData.dob || !residentData.dob.trim()) {
      throw new Error("Date of birth is required");
    }
    if (!residentData.address || !residentData.address.trim()) {
      throw new Error("Address is required");
    }
    if (!residentData.phone_number || !residentData.phone_number.trim()) {
      throw new Error("Phone number is required");
    }
    if (!residentData.email || !residentData.email.trim()) {
      throw new Error("Email is required");
    }

    const res = await api.put(`/residents/${id}`, {
      first_name: residentData.first_name.trim(),
      last_name: residentData.last_name.trim(),
      middle_name: residentData.middle_name ? residentData.middle_name.trim() : null,
      gender: residentData.gender.trim(),
      dob: residentData.dob,
      email: residentData.email.trim(),
      phone_number: residentData.phone_number.trim(),
      address: residentData.address.trim(),
      user_id: residentData.user_id || null,
      household_id: residentData.household_id || null,
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Delete resident
export const deleteResident = async (id) => {
  try {
    const res = await api.delete(`/residents/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
