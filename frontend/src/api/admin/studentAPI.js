import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/admin/student",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleError = (error) => {
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  if (error.response?.data?.error) {
    throw new Error(error.response.data.error);
  }
  if (error.message) {
    throw new Error(error.message);
  }
  throw new Error("Unexpected error occurred");
};

// Fetch all students
export const fetchStudents = async (register_status = "") => {
  try {
    const url = register_status ? `/?status=${encodeURIComponent(register_status)}` : "/";
    const res = await api.get(url);
    return res.data || [];
  } catch (error) {
    handleError(error);
  }
};

// Update student status
export const updateStudent = async (studentId, register_status) => {
  try {
    const res = await api.put(`/${studentId}`, { register_status });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Bulk update students'status
export const bulkUpdateStudents = async (studentIds) => {
  try {
    const res = await api.put("/bulk/verify", { ids: studentIds });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Deny student
export const denyStudent = async (studentId) => {
  try {
    const res = await api.delete(`/${studentId}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Bulk deny students
export const bulkDenyStudents = async (ids) => {
  try {
    const res = await api.post("/bulk/deny", { ids });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};