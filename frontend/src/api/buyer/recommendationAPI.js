import axios from "axios";

const api = axios.create({
  baseURL:
    "http://localhost:5000/api/buyer/recommendation",
  timeout: 10000,
});

const getBuyerIdFromToken = (token) => {
  if (!token) return null;
  try {
    const parts = String(token).split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(
      decodeURIComponent(
        globalThis
          .atob(payload)
          .split("")
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(""),
      ),
    );
    const id = Number(decoded.customer_id ?? decoded.id);
    return Number.isInteger(id) && id > 0 ? String(id) : null;
  } catch {
    return null;
  }
};

export const getActiveBuyerIdentity = () => {
  const token = localStorage.getItem("buyer_token");
  if (!token) return null;
  return (
    getBuyerIdFromToken(token) ||
    localStorage.getItem("buyer_customer_id") ||
    null
  );
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
  const token =
    localStorage.getItem("buyer_token");

  if (token) {
    config.headers.Authorization =
      `Bearer ${token}`;
    delete config.headers["X-Recommendation-Session"];
  } else {
    delete config.headers.Authorization;
    config.headers["X-Recommendation-Session"] =
      getRecommendationSessionId();
  }

  return config;
});

export const recordRecommendationEvent = async (
  event,
) => {
  try {
    const isLoggedIn = Boolean(localStorage.getItem("buyer_token"));
    const response = await api.post(
      "/interactions",
      {
        ...event,
        session_id: isLoggedIn
          ? null
          : getRecommendationSessionId(),
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
