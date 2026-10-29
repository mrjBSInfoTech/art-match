import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller/inventory",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function handleError(error, fallbackMessage) {
  const inventoryError = new Error(
    error.response?.data?.message || error.message || fallbackMessage,
  );
  inventoryError.status = error.response?.status;
  throw inventoryError;
}

export async function fetchSellerInventory() {
  try {
    const response = await api.get("/", {
      headers: { "Cache-Control": "no-cache" },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    handleError(error, "Unable to load inventory");
  }
}

export async function updateInventoryStock(artworkId, stockQuantity) {
  try {
    const response = await api.patch(`/${artworkId}/stock`, {
      stock_quantity: stockQuantity,
    });
    return response.data?.product;
  } catch (error) {
    handleError(error, "Unable to update stock");
  }
}
