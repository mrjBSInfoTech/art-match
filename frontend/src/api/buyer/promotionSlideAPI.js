import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/promotion-slides",
  timeout: 30000,
});

export const fetchPromotionHeroEnabled = async () => {
  try {
    const response = await api.get("/settings");
    return response.data.hero_enabled === true;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        (error.request
          ? "Server not responding. Please check your connection."
          : error.message || "Unable to load promotion slide placement."),
    );
  }
};

export const fetchPromotionSlides = async () => {
  try {
    const response = await api.get("/");
    return Array.isArray(response.data)
      ? response.data.map((slide) => ({
          ...slide,
          image_url: slide.image_url
            ? new URL(slide.image_url, api.defaults.baseURL).href
            : null,
        }))
      : [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        (error.request
          ? "Server not responding. Please check your connection."
          : error.message || "Unable to load promotion slides."),
    );
  }
};
