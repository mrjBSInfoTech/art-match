import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/about-content",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function throwRequestError(error) {
  throw new Error(
    error.response?.data?.message || error.message || "About page request failed.",
  );
}

export async function fetchAboutContent() {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    throwRequestError(error);
  }
}

export async function saveAboutContent(content, password) {
  try {
    const response = await api.put("/", { ...content, password });
    return response.data.content;
  } catch (error) {
    throwRequestError(error);
  }
}
