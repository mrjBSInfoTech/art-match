import axios from "axios";

const api = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:5000/api/admin/customer",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// HttpOnly cookies handle authentication automatically

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Unexpected error occurred",
  );
};

export const fetchCustomers = async () => {
  try {
    const response = await api.get("/");
    return response.data || [];
  } catch (error) {
    handleError(error);
  }
};

export const updateCustomer = async (id, data) => {
  try {
    const response = await api.put(`/${id}`, data);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteCustomer = async (id) => {
  try {
    const response = await api.delete(`/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
