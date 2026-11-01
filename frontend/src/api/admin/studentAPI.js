import axios from "axios";

const api = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:5000/api/admin/student",
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

// HttpOnly cookies handle authentication automatically

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
    const url = register_status
      ? `/?status=${encodeURIComponent(register_status)}`
      : "/";
    const res = await api.get(url);
    return res.data || [];
  } catch (error) {
    handleError(error);
  }
};
// Add new student
export const addStudents = async (studentData) => {
  try {
    const res = await api.post("/", studentData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Bulk Add Students
export const bulkAddStudents = async (students) => {
  try {
    const res = await api.post("/bulk", { students });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Update student status
export const updateStudent = async (studentId, data) => {
  try {
    const payload = typeof data === "string" ? { register_status: data } : data;
    const res = await api.put(`/${studentId}`, payload);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const reactivateStudent = async (studentId) => {
  try {
    const res = await api.post(`/${studentId}/reactivate`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Delete student
export const deleteStudent = async (studentId) => {
  try {
    const res = await api.delete(`/${studentId}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

