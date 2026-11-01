import axios from "axios";
import { isAuthenticated } from "../../../utils/auth";

const api = axios.create({
  withCredentials: true,
  baseURL:
    "http://localhost:5000/api/buyer/recommendation",
  timeout: 10000,
});

export const getActiveBuyerIdentity = () => {
  if (!isAuthenticated("buyer")) return null;
  return localStorage.getItem("buyer_customer_id") || null;
};

const getSessionStorageKey = () => {
  const buyerId = getActiveBuyerIdentity();
  return buyerId
    ? `recommendation_session_id_user_${buyerId}`
    : "recommendation_session_id";
};

export const clearRecommendationClientState = () => {
  try {
    localStorage.removeItem("recommendation_session_id");
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("recommendation_session_id")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage access errors
  }

  try {
    if (typeof sessionStorage !== "undefined") {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("recommendation_view_")) {
          sessionStorage.removeItem(key);
        }
      }
    }
  } catch {
    // Ignore sessionStorage access errors
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("recommendation-updated"));
  }
};

export const fetchRecentlyViewedArtworks = async (excludeArtworkId, limit = 4) => {
  const response = await api.get("/recently-viewed", {
    params: { exclude_artwork_id: excludeArtworkId, limit },
    headers: { "Cache-Control": "no-cache" },
  });
  return Array.isArray(response.data.artworks) ? response.data.artworks : [];
};

export const fetchSellerProfileRecommendations = async (sellerId, topK = 8, signal) => {
  const response = await api.get(`/seller/${encodeURIComponent(sellerId)}`, {
    params: { top_k: topK },
    headers: { "Cache-Control": "no-cache" },
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
      headers: {
        "Cache-Control": "no-cache",
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
  const storageKey = getSessionStorageKey();
  let sessionId = localStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId =
      globalThis.crypto?.randomUUID?.() ||
      `rec-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    localStorage.setItem(
      storageKey,
      sessionId,
    );
  }

  return sessionId;
};

api.interceptors.request.use((config) => {
  const sessionId = getRecommendationSessionId();
  if (sessionId) {
    config.headers["X-Recommendation-Session"] = sessionId;
  }

  return config;
});

export const recordRecommendationEvent = async (
  event,
) => {
  try {
    const sessionId = getRecommendationSessionId();
    const response = await api.post(
      "/interactions",
      {
        ...event,
        session_id: event.session_id || sessionId,
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
