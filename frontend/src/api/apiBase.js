const rawApiBaseUrl = import.meta.env?.VITE_API_URL || "http://localhost:5000";

export const API_BASE_URL = String(rawApiBaseUrl).trim().replace(/\/+$/, "");
