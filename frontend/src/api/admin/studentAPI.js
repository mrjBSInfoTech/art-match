import axios from "axios";
import { API_BASE_URL } from "../apiBase.js";

const api = axios.create({
  withCredentials: true,
  baseURL: `${API_BASE_URL}/api/admin/student`,
  headers: { "Content-Type": "application/json" },
  timeout: 120000,
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
export const fetchStudents = async (register_status = "", options = {}) => {
  try {
    const params = {};
    if (register_status) {
      params.status = register_status;
    }
    if (options?.forceFresh) {
      params._t = Date.now();
    }
    const res = await api.get("/", { params });
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

const BULK_IMPORT_BATCH_SIZE = 100;

// Bulk Add Students in batches so large spreadsheets never exceed proxy/request timeouts
export const bulkAddStudents = async (students) => {
  try {
    const list = Array.isArray(students) ? students : [];
    if (list.length <= BULK_IMPORT_BATCH_SIZE) {
      const res = await api.post("/bulk", { students: list });
      return res.data;
    }

    const totals = {
      added: 0,
      updated: 0,
      reactivated: 0,
      skipped: 0,
    };

    for (let start = 0; start < list.length; start += BULK_IMPORT_BATCH_SIZE) {
      const batch = list.slice(start, start + BULK_IMPORT_BATCH_SIZE);
      const res = await api.post("/bulk", { students: batch });
      const data = res.data || {};
      totals.added += Number(data.added) || 0;
      totals.updated += Number(data.updated) || 0;
      totals.reactivated += Number(data.reactivated) || 0;
      totals.skipped += Number(data.skipped) || 0;
    }

    return {
      ...totals,
      message: `Bulk import complete: ${totals.added} added, ${totals.updated} updated, ${totals.reactivated} reactivated, ${totals.skipped} unchanged/skipped`,
    };
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

