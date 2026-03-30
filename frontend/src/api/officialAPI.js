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
    if (!officialData.file) {
      throw new Error("Image file is required");
    }

    // Create FormData to send file
    const formData = new FormData();
    formData.append("first_name", officialData.first_name.trim());
    formData.append("last_name", officialData.last_name.trim());
    formData.append("middle_name", officialData.middle_name ? officialData.middle_name.trim() : "");
    formData.append("dob", officialData.dob.trim());
    formData.append("position", officialData.position.trim());
    formData.append("email", officialData.email.trim());
    formData.append("phone_number", officialData.phone_number.trim());
    formData.append("address", officialData.address.trim());
    formData.append("image", officialData.file);

    const res = await api.post("/officials", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
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

    // Create FormData to send file (if provided)
    const formData = new FormData();
    formData.append("first_name", officialData.first_name.trim());
    formData.append("last_name", officialData.last_name.trim());
    formData.append("middle_name", officialData.middle_name ? officialData.middle_name.trim() : "");
    formData.append("dob", officialData.dob.trim());
    formData.append("position", officialData.position.trim());
    formData.append("email", officialData.email.trim());
    formData.append("phone_number", officialData.phone_number.trim());
    formData.append("address", officialData.address.trim());
    if (officialData.official_account_id) {
      formData.append("official_account_id", officialData.official_account_id);
    }
    
    // Only append image if a new file was provided
    if (officialData.file) {
      formData.append("image", officialData.file);
    } else if (officialData.image && typeof officialData.image === "string") {
      // If no new file but existing image filename, preserve it
      formData.append("image", officialData.image);
    }

    const res = await api.put(`/officials/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
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
