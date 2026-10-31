import axios from "axios";
import { getArtworkDetailDefaults, getArtworkDetailsErrors, getArtworkDetailsPayload } from "../../utils/artworkDetails.js";
import { getArtworkScanErrors, getArtworkScanPayload } from "../../utils/artworkScanAttributes.js";
import {
  getProductOptionsErrors,
  getProductOptionsPayload,
} from "../../utils/productOptions.js";

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
    console.error("Server error:", error.response.status, error.response.data);
    throw new Error(
      error.response.data.message || error.response.data.error || "Server responded with an error",
    );
  } else if (error.request) {
    console.error("No response from server:", error.message);
    throw new Error(
      "Server not responding. Please check your connection or try again later.",
    );
  } else {
    console.error("Request setup error:", error.message);
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

function optionalArtworkDetails(artworkData) {
  const explicitDetails = Object.hasOwn(artworkData, "artwork_details") && artworkData.artwork_details !== undefined;
  const hasValue = (value) => value != null && (typeof value !== "string" || value.trim() !== "");
  const hasMaterials = Array.isArray(artworkData.material_composition)
    ? artworkData.material_composition.length > 0 : hasValue(artworkData.material_composition);
  const hasDetails = explicitDetails || hasMaterials
    || ["stock_available", "resolution_width", "resolution_height", "file_format", "color_profile"]
      .some((field) => hasValue(artworkData[field]))
    || ["is_fragile", "humidity_sensitive", "light_sensitive"].some((field) => artworkData[field] === true);
  if (!hasDetails) return null;

  let details = {};
  if (explicitDetails) {
    details = artworkData.artwork_details;
    if (typeof details === "string") {
      try {
        details = JSON.parse(details);
      } catch {
        throw new Error("Artwork details must be valid JSON.");
      }
    }
    if (!details || typeof details !== "object" || Array.isArray(details)) {
      throw new Error("Artwork details must be an object.");
    }
  }
  const data = {
    ...getArtworkDetailDefaults(), ...artworkData, ...details,
    art_type: artworkData.art_type, product: artworkData.product,
  };
  const error = Object.values(getArtworkDetailsErrors(data))[0];
  if (error) throw new Error(error);
  const isProductArtwork = String(artworkData.art_type || "").trim().toLowerCase() === "product";
  const priceMode = details.product_price_mode
    || artworkData.product_price_mode
    || "shared";
  if (isProductArtwork) {
    const optionErrors = getProductOptionsErrors(
      Array.isArray(details.product_options) ? details.product_options : artworkData.product_options || [],
      priceMode,
    );
    if (Object.keys(optionErrors).length) {
      throw new Error(
        Object.values(optionErrors).find((value) => typeof value === "string")
        || "Check the product details.",
      );
    }
  }
  return {
    ...getArtworkDetailsPayload(data),
    ...(isProductArtwork ? {
      product_price_mode: priceMode,
      product_options: getProductOptionsPayload(
        Array.isArray(details.product_options) ? details.product_options : artworkData.product_options || [],
        priceMode,
      ),
    } : {}),
  };
}

function appendArtworkAttributes(formData, artworkData, details) {
  if (details !== null) formData.append("artwork_details", JSON.stringify(details));
  if (details?.product_options) {
    (artworkData.product_options || []).forEach((option) => {
      if (!option.imageFile) return;
      formData.append("product_option_images", option.imageFile);
      formData.append("product_option_image_ids", option.id);
    });
  }
  const scan = getArtworkScanPayload(artworkData);
  if (Object.hasOwn(scan, "mediums_used")) formData.append("mediums_used", scan.mediums_used);
  if (Object.hasOwn(scan, "feature_scanned")) formData.append("feature_scanned", JSON.stringify(scan.feature_scanned));
}

// Fetch all artworks
export const fetchArtworks = async () => {
  try {
    console.log("Fetching all artworks");
    const res = await api.get("/artwork");
    console.log("Artworks fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchArtworks:", error);
    handleError(error);
  }
};

// Fetch single artwork by ID
export const fetchArtworkById = async (id) => {
  try {
    console.log("Fetching artwork by ID:", id);
    const res = await api.get(`/artwork/${id}`);
    console.log("Artwork fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchArtworkById:", error);
    handleError(error);
  }
};

// Add new artwork
export const addArtwork = async (artworkData) => {
  const details = optionalArtworkDetails(artworkData);
  const scanError = Object.values(getArtworkScanErrors(artworkData))[0];
  if (scanError) throw new Error(scanError);
  try {
    if (!artworkData.title || !artworkData.title.trim()) {
      throw new Error("Title is required");
    }
    if (!artworkData.description || !artworkData.description.trim()) {
      throw new Error("Description is required");
    }
    if (!Number.isFinite(Number(artworkData.price)) || Number(artworkData.price) <= 0) {
      throw new Error("Valid price is required");
    }
    if (!artworkData.file) {
      throw new Error("Image file is required");
    }
    if (!artworkData.genre || !artworkData.genre.trim()) {
      throw new Error("Style is required");
    }
    if (!artworkData.art_size || !artworkData.art_size.trim()) {
      throw new Error("Art size is required");
    }
    if (!artworkData.art_type || !artworkData.art_type.trim()) {
      throw new Error("Art type is required");
    }
    if (!artworkData.product || !artworkData.product.trim()) {
      throw new Error("Product type is required");
    }

    const formData = new FormData();
    formData.append("file", artworkData.file);
    formData.append("title", artworkData.title.trim());
    formData.append("description", artworkData.description.trim());
    formData.append("care_instructions", artworkData.care_instructions?.trim() || "");
    formData.append("price", artworkData.price);
    formData.append("genre", artworkData.genre.trim());
    formData.append("art_size", artworkData.art_size.trim());
    formData.append("art_type", artworkData.art_type.trim());
    formData.append("product", artworkData.product.trim());
    appendArtworkAttributes(formData, artworkData, details);

    const res = await api.post("/artwork", formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Update artwork
export const updateArtwork = async (id, artworkData) => {
  const details = optionalArtworkDetails(artworkData);
  const scanError = Object.values(getArtworkScanErrors(artworkData))[0];
  if (scanError) throw new Error(scanError);
  try {
    if (!artworkData.title || !artworkData.title.trim()) {
      throw new Error("Title is required");
    }
    if (!artworkData.description || !artworkData.description.trim()) {
      throw new Error("Description is required");
    }
    if (!Number.isFinite(Number(artworkData.price)) || Number(artworkData.price) <= 0) {
      throw new Error("Valid price is required");
    }
    if (!artworkData.art_type || !artworkData.art_type.trim()) {
      throw new Error("Art type is required");
    } 
    if (!artworkData.product || !artworkData.product.trim()) {
      throw new Error("Product type is required");
    }

    const formData = new FormData();
    if (artworkData.file) {
      formData.append("file", artworkData.file);
    }
    formData.append("title", artworkData.title.trim());
    formData.append("description", artworkData.description.trim());
    formData.append("care_instructions", artworkData.care_instructions?.trim() || "");
    formData.append("price", artworkData.price);
    formData.append("genre", artworkData.genre.trim());
    formData.append("art_size", artworkData.art_size.trim());
    formData.append("art_type", artworkData.art_type.trim());
    formData.append("product", artworkData.product.trim());
    appendArtworkAttributes(formData, artworkData, details);

    const res = await api.put(`/artwork/${id}`, formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
// Verify artwork
export const verifyArtwork = async (id) => {
  try {
    const res = await api.put(`/artwork/${id}/verify`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
// Delete artwork
export const deleteArtwork = async (id) => {
  try {
    const res = await api.delete(`/artwork/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};
