import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/admin/promotion-slides",
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
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

const createFormData = (slideData) => {
  const formData = new FormData();
  ["title", "description", "button_label", "button_url", "status", "sort_order"].forEach(
    (field) => {
      if (slideData[field] !== undefined && slideData[field] !== null) {
        formData.append(field, slideData[field]);
      }
    },
  );
  if (slideData.file) formData.append("image", slideData.file);
  return formData;
};

export const fetchPromotionSlides = async () => {
  try {
    const response = await api.get("/");
    return Array.isArray(response.data) ? response.data.map(normalizeSlide) : [];
  } catch (error) {
    handleError(error);
  }
};

export const fetchPromotionSlideRequests = async () => {
  try {
    const response = await api.get("/requests");
    return Array.isArray(response.data) ? response.data.map(normalizeSlide) : [];
  } catch (error) {
    handleError(error);
  }
};

export const reviewPromotionSlideRequest = async (slideId, decision) => {
  try {
    const response = await api.post(`/${slideId}/review`, { decision });
    return normalizeSlide(response.data);
  } catch (error) {
    handleError(error);
  }
};

export const unpublishStudentPromotionSlide = async (slideId) => {
  try {
    const response = await api.post(`/${slideId}/unpublish`);
    return normalizeSlide(response.data);
  } catch (error) {
    handleError(error);
  }
};

export const addPromotionSlide = async (data) => {
  try {
    const response = await api.post("/", createFormData(data));
    return normalizeSlide(response.data);
  } catch (error) {
    handleError(error);
  }
};

export const updatePromotionSlide = async (slideId, data) => {
  try {
    const response = await api.put(`/${slideId}`, createFormData(data));
    return normalizeSlide(response.data);
  } catch (error) {
    handleError(error);
  }
};

export const deletePromotionSlide = async (slideId) => {
  try {
    const response = await api.delete(`/${slideId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
