import axios from "axios";

const api = axios.create({
  baseURL:
    "http://localhost:5000/api/buyer/recommendation",
  timeout: 10000,
});

export const fetchRecentlyViewedArtworks = async (excludeArtworkId, limit = 4) => {
  const response = await api.get("/recently-viewed", {
    params: { exclude_artwork_id: excludeArtworkId, limit },
  });
  return Array.isArray(response.data.artworks) ? response.data.artworks : [];
};

export const fetchSellerProfileRecommendations = async (sellerId, topK = 8, signal) => {
  const response = await api.get(`/seller/${encodeURIComponent(sellerId)}`, {
    params: { top_k: topK },
    signal,
  });
  return {
    recommendations: Array.isArray(response.data.recommendations)
      ? response.data.recommendations : [],
    relatedArtists: Array.isArray(response.data.related_artists)
      ? response.data.related_artists : [],
  };
};

export const fetchSellerRecommendations = async (sellerId, topK = 8, signal) =>
  (await fetchSellerProfileRecommendations(sellerId, topK, signal)).recommendations;

export const fetchRecommendations = async (
  topK = 4,
  signal,
) => {
  try {
    const response = await api.get("/", {
      params: {
        top_k: topK,
      },
      signal,
    });

    return response.data;
  } catch (error) {
    if (signal?.aborted) throw error;
    console.warn(
      "Unable to load recommendations:",
      error.response?.data?.message ||
        error.message,
    );

    return {
      mode: "unavailable",
      recommendations: [],
    };
  }
};

export const getRecommendationSessionId = () => {
  let sessionId = localStorage.getItem(
    "recommendation_session_id",
  );

  if (!sessionId) {
    sessionId =
      globalThis.crypto?.randomUUID?.() ||
      `rec-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    localStorage.setItem(
      "recommendation_session_id",
      sessionId,
    );
  }

  return sessionId;
};

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("buyer_token");

  if (token) {
    config.headers.Authorization =
      `Bearer ${token}`;
  }

  config.headers["X-Recommendation-Session"] =
    getRecommendationSessionId();

  return config;
});

export const recordRecommendationEvent = async (
  event,
) => {
  try {
    const response = await api.post(
      "/interactions",
      {
        ...event,
        session_id:
          getRecommendationSessionId(),
      },
    );

    if (response.data?.recorded && response.data.interaction_id != null) {
      window.dispatchEvent(new Event("recommendation-updated"));
    }
    return response.data;
  } catch (error) {
    // Tracking should never stop normal shopping.
    console.warn(
      "Unable to record recommendation interaction:",
      error.response?.data?.message ||
        error.message,
    );

    return null;
  }
};
