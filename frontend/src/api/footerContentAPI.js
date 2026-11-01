import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/footer-content",
  timeout: 10000,
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

function throwRequestError(error) {
  throw new Error(
    error.response?.data?.message || error.message || "Footer content request failed.",
  );
}

export async function fetchFooterContent() {
  try {
    const response = await api.get("/");
    return response.data;
  } catch (error) {
    throwRequestError(error);
  }
}

export async function saveFooterContent(content, password) {
  try {
    const response = await api.put("/", { ...content, password });
    return response.data.content;
  } catch (error) {
    throwRequestError(error);
  }
}
