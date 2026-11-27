import axios from "axios";
import { API_BASE_URL } from "./apiBase.js";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/about-content`,
  timeout: 10000,
  withCredentials: true,
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
