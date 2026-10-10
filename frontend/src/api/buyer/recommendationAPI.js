import axios from "axios";

const api = axios.create({
  baseURL:
    "http://localhost:5000/api/buyer/recommendation",
  timeout: 5000,
});

export const fetchRecommendations = async (
  topK = 4,
) => {
  try {
    const response = await api.get("/", {
      params: {
        top_k: topK,
      },
    });

    return response.data;
  } catch (error) {
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