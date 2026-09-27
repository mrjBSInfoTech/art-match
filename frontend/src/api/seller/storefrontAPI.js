import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller",
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleError = (error) => {
  if (error.response) {
    throw new Error(error.response.data.message || "Storefront request failed");
  }
  if (error.request) {
    throw new Error("Server not responding. Please try again later.");
  }
  throw new Error("Unexpected storefront error");
};

export const fetchStorefront = async () => {
  try {
    const res = await api.get("/storefront");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const saveStorefront = async ({ shop_name, shop_description }) => {
  try {
    const res = await api.put("/storefront", {
      shop_name,
      shop_description,
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
