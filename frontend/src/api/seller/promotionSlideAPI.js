import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/seller/promotion-slides",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seller_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message ||
      (error.request
        ? "Server not responding. Please check your connection."
        : error.message || "Unable to process promotion slide request."),
  );
};

const normalizeSlide = (slide) => ({
  ...slide,
  image_url: slide.image_url
    ? new URL(slide.image_url, api.defaults.baseURL).href
    : null,
});

const toFormData = (slide) => {
  const data = new FormData();
  ["title", "description", "button_label", "button_url"].forEach((field) => {
    if (slide[field] !== undefined && slide[field] !== null) {
      data.append(field, slide[field]);
    }
  });
  if (slide.file) data.append("image", slide.file);
  return data;
};

export const fetchSellerPromotionSlides = async () => {
  try {
    const response = await api.get("/");
    return Array.isArray(response.data) ? response.data.map(normalizeSlide) : [];
  } catch (error) {
    handleError(error);
  }
};

export const fetchSellerPromotionHeaderRequests = async () => {
  try {
    const response = await api.get("/header-requests");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    handleError(error);
  }
};

export const createSellerPromotionHeaderRequest = async (header) => {
  try {
    const response = await api.post("/header-requests", header);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const createSellerPromotionSlide = async (slide) => {
  try {
    const response = await api.post("/", toFormData(slide));
    return normalizeSlide(response.data);
  } catch (error) {
    handleError(error);
  }
};

export const updateSellerPromotionSlide = async (slideId, slide) => {
  try {
    const response = await api.put(`/${slideId}`, toFormData(slide));
    return normalizeSlide(response.data);
  } catch (error) {
    handleError(error);
  }
};

export const requestSellerPromotionSlideReview = async (slideId) => {
  try {
    const response = await api.post(`/${slideId}/request`);
    return normalizeSlide(response.data);
  } catch (error) {
    handleError(error);
  }
};

export const withdrawSellerPromotionSlideRequest = async (slideId) => {
  try {
    const response = await api.post(`/${slideId}/withdraw`);
    return normalizeSlide(response.data);
  } catch (error) {
    handleError(error);
  }
};

export const deleteSellerPromotionSlide = async (slideId) => {
  try {
    const response = await api.delete(`/${slideId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
