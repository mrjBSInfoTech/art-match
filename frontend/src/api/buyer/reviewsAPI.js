import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/buyer/reviews",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("buyer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const reviewError = (error, fallback, signal) => {
  if (signal?.aborted || axios.isCancel(error)) throw error;
  const failure = new Error(error.response?.data?.message || fallback);
  failure.status = error.response?.status;
  throw failure;
};

export const fetchArtworkReviews = async (artworkId, { page = 1, limit = 5, signal } = {}) => {
  try {
    const response = await api.get(`/artwork/${encodeURIComponent(artworkId)}`, {
      params: { page, limit },
      signal,
    });
    return response.data;
  } catch (error) {
    reviewError(error, "Unable to load artwork reviews", signal);
  }
};

export const fetchArtworkReviewEligibility = async (artworkId, { signal } = {}) => {
  try {
    const response = await api.get(`/artwork/${encodeURIComponent(artworkId)}/eligibility`, { signal });
    return response.data;
  } catch (error) {
    reviewError(error, "Unable to check review eligibility", signal);
  }
};

export const submitBuyerReview = async (
  { orderItemId, artworkId, rating, comment = "" },
  { signal } = {},
) => {
  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error("Choose a whole-number rating from 1 to 5 stars");
  }
  const text = String(comment ?? "").trim();
  if (text.length > 600) throw new Error("Comments must be 600 characters or fewer");
  try {
    const response = await api.post("/", {
      ...(orderItemId == null ? {} : { order_item_id: orderItemId }),
      ...(artworkId == null ? {} : { artwork_id: artworkId }),
      rating: stars,
      comment: text,
    }, { signal });
    return response.data;
  } catch (error) {
    reviewError(error, "Unable to submit review", signal);
  }
};
