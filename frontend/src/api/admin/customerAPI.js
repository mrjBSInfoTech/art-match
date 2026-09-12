import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/admin/customer",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
