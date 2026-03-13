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
export const fetchOfficialAccount = async () => {
  try {
    console.log("Fetching all accounts...");
    const res = await api.get("/officialAccounts");
    console.log("Officials fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchOfficials:", error);
    handleError(error);
  }
};

// Fetch single official by ID
export const fetchOfficialAccountById = async (id) => {
  try {
    console.log("Fetching account by ID:", id);
    const res = await api.get(`/officialAccounts/${id}`);
    console.log("Official fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchOfficialById:", error);
    handleError(error);
  }
};

// Add new official
export const addOfficialAccount = async (officialData) => {
  try {
    // Validate required fields
    if (!officialData.first_name || !officialData.first_name.trim()) {
      throw new Error("First name is required");
    }
    if (!officialData.last_name || !officialData.last_name.trim()) {
      throw new Error("Last name is required");
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

    const res = await api.post("/officialAccounts", {
      first_name: officialData.first_name.trim(),
      last_name: officialData.last_name.trim(),
      middle_name: officialData.middle_name ? officialData.middle_name.trim() : null,
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
export const updateOfficialAccount = async (id, officialData) => {
  try {
    // Validate required fields
    if (!officialData.first_name || !officialData.first_name.trim()) {
      throw new Error("First name is required");
    }
    if (!officialData.last_name || !officialData.last_name.trim()) {
      throw new Error("Last name is required");
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

    const res = await api.put(`/officialAccounts/${id}`, {
      first_name: officialData.first_name.trim(),
      last_name: officialData.last_name.trim(),
      middle_name: officialData.middle_name ? officialData.middle_name.trim() : null,
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
export const deleteOfficialAccount = async (id) => {
  try {
    const res = await api.delete(`/officialAccounts/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Create a new account for an official with custom role and permissions
export const createOfficialAccount = async (
  official_id,
  password,
  account_type = "Staff",
  can_add = 0,
  can_edit = 0,
  can_delete = 0,
  position = ""
) => {
  try {
    if (!official_id || !official_id.toString().trim()) {
      throw new Error("Official ID is required");
    }
    if (!password || !password.trim()) {
      throw new Error("Password is required");
    }
    if (!account_type) {
      throw new Error("Account type is required");
    }
    if (!position || !position.trim()) {
      throw new Error("Position is required");
    }

    console.log("Creating account for official:", {
      official_id,
      account_type,
      can_add,
      can_edit,
      can_delete,
      position,
    });
    const res = await api.post("/officialAccounts", {
      official_id: parseInt(official_id),
      password: password.trim(),
      account_type: account_type,
      can_add: can_add ? 1 : 0,
      can_edit: can_edit ? 1 : 0,
      can_delete: can_delete ? 1 : 0,
      position: position.trim(),
    });
    console.log("Account created successfully:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in createOfficialAccount:", error);
    handleError(error);
  }
};

// Fetch all officials with their account information
export const fetchOfficialsWithAccounts = async () => {
  try {
    console.log("Fetching officials with accounts...");
    const res = await api.get("/officialAccounts/withAccounts/all");
    console.log("Officials with accounts fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchOfficialsWithAccounts:", error);
    handleError(error);
  }
};

// Update official account (admin can change account type and permissions)
export const updateOfficialAccountPermissions = async (account_id, updateData) => {
  try {
    if (!account_id) {
      throw new Error("Account ID is required");
    }

    console.log("Updating account:", { account_id, updateData });
    const res = await api.put(`/officialAccounts/${account_id}`, updateData);
    console.log("Account updated successfully:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in updateOfficialAccountPermissions:", error);
    handleError(error);
  }
};
