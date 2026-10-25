import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/event",
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
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }

  if (error.response?.data?.error) {
    throw new Error(error.response.data.error);
  }

  if (error.request) {
    throw new Error(
      "Server not responding. Please check your connection.",
    );
  }

  throw new Error(
    error.message || "Unable to process event request.",
  );
};

const normalizeEvent = (event) => ({
  ...event,
  image_url: event.image_url
    ? new URL(event.image_url, api.defaults.baseURL).href
    : null,
});

export const fetchEvents = async () => {
  try {
    const response = await api.get("/");
    return Array.isArray(response.data) ? response.data.map(normalizeEvent) : [];
  } catch (error) {
    handleError(error);
  }
};
