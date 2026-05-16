import axios from "axios";

// Create an Axios instance (you can set global options here)
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000, // wait max 5 seconds
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
    const errorMsg = error.response.data.message || error.response.data.error || "Server responded with an error";
    throw new Error(errorMsg);
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

// Add new concern
export const addConcern = async (concernData) => {
  try {
    const token = localStorage.getItem("token");
    
    
    // Check if user is logged in
    if (!token) {
      throw new Error("Please log in to submit a concern");
    }
    
    // Validate required fields
    if (!concernData.message_type || !concernData.message.trim()) {
      throw new Error("Please fill in all required fields");
    }
    
    const payload = {
      message_type: concernData.message_type,
      message: concernData.message 
    };

    const res = await api.post("/concerns", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    console.log("Concern response:", res.data);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

