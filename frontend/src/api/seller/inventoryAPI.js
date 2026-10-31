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

const artworkApi = axios.create({
  baseURL: "http://localhost:5000/api/seller",
  timeout: 10000,
});

artworkApi.interceptors.request.use((config) => {
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

function getOptionsFromProduct(product) {
  let details = product.artwork_details;
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch {
      details = {};
    }
  }
  const options = Array.isArray(product.product_options) && product.product_options.length
    ? product.product_options
    : Array.isArray(details?.product_options)
      ? details.product_options
      : [];
  return options.map((option) => ({
    ...option,
    stock_quantity: Number.isSafeInteger(Number(option.stock_quantity))
      ? Math.max(0, Number(option.stock_quantity))
      : Math.max(0, Number(option.quantity) || 0),
    sold_quantity: Number.isSafeInteger(Number(option.sold_quantity))
      ? Math.max(0, Number(option.sold_quantity))
      : 0,
  }));
}

export async function fetchSellerInventory() {
  try {
    const response = await api.get("/", {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!Array.isArray(response.data)) return [];

    let inventory = response.data;
    const needsArtworkDetails = inventory.some(
      (product) =>
        !getOptionsFromProduct(product).length &&
        String(product.art_type || "").trim().toLowerCase() === "product",
    );
    if (needsArtworkDetails) {
      const artworksResponse = await artworkApi.get("/artwork", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!Array.isArray(artworksResponse.data)) {
        throw new Error("Unable to load product details for inventory.");
      }
      const artworkById = new Map(
        artworksResponse.data.map((artwork) => [artwork.artwork_id, artwork]),
      );
      inventory = inventory.map((product) => ({
        ...product,
        artwork_details:
          product.artwork_details || artworkById.get(product.artwork_id)?.artwork_details,
      }));
    }

    return inventory.map((product) => ({
      ...product,
      product_options: getOptionsFromProduct(product),
    }));
  } catch (error) {
    handleError(error, "Unable to load inventory");
  }
}

export async function adjustInventoryStock(artworkId, direction, quantity) {
  try {
    const response = await api.patch(`/${artworkId}/stock`, {
      direction,
      quantity,
    });
    return response.data?.product;
  } catch (error) {
    handleError(error, "Unable to adjust stock");
  }
}

export async function adjustProductOptionStock(
  artworkId,
  optionId,
  direction,
  quantity,
) {
  try {
    const response = await api.patch(
      `/${artworkId}/options/stock`,
      { option_id: optionId, direction, quantity },
    );
    return response.data?.product;
  } catch (error) {
    handleError(error, "Unable to adjust product option stock");
  }
}
