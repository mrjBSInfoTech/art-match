import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer",
  timeout: 30000, 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

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

// Fetch all address
export const fetchAddresses = async () => {
  try {
    console.log("Fetching all addresses");
    const res = await api.get("/addresses");
    console.log("Addresses fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchAddresses:", error);
    handleError(error);
  }
};

// Fetch single address by ID
export const fetchAddressById = async (id) => {
  try {
    console.log("Fetching address by ID:", id);
    const res = await api.get(`/addresses/${id}`);
    console.log("Address fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchAddressById:", error);
    handleError(error);
  }
};

// Add new address
export const addAddress = async (addressData) => {
  try {
    if (!addressData.region || !addressData.region.trim()) {
      throw new Error("Region is required");
    }
    if (!addressData.city || !addressData.city.trim()) {
      throw new Error("City is required");
    }
    if (!addressData.barangay || !addressData.barangay.trim()) {
      throw new Error("Barangay is required");
    }

    const res = await api.post("/addresses", {
      ...addressData,
      is_current: Boolean(addressData.is_current),
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};


// Update address
export const updateAddress = async (id, addressData) => {
  try {
    if (!addressData.region || !addressData.region.trim()) {
      throw new Error("Region is required");
    }
    if (!addressData.city || !addressData.city.trim()) {
      throw new Error("City is required");
    }

    if (!addressData.barangay || !addressData.barangay.trim()) {
      throw new Error("Barangay is required");
    }

    const res = await api.put(`/addresses/${id}`, {
      ...addressData,
      is_current: Boolean(addressData.is_current),
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Delete address
export const deleteAddress = async (id) => {
  try {
    const res = await api.delete(`/addresses/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
