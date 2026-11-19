import { isAuthenticated } from "../../utils/auth";

export const PERSONALIZED_RECOMMENDATION_MODES = new Set([
  "sasrec",
  "sasrec_reranked",
  "hybrid",
  "preference_fallback",
]);

export function getRecommendationMessage(signals = {}, historyLength = 0) {
  const isGuest = !isAuthenticated("buyer");
  const hasHistory = historyLength > 0;
  const hasSearchOrFilters = Number(signals.search_filter_events || 0) > 0;
  const hasFollowedArtists = Number(signals.followed_artists || 0) > 0;
  const hasArtistPreference = Number(signals.preferred_artists || 0) > 0 || hasFollowedArtists;

  if (isGuest) {
    if (hasHistory && hasSearchOrFilters && hasArtistPreference) {
      return "Based on your guest browsing, searches, filters, and artist preferences.";
    }
    if (hasHistory && hasSearchOrFilters) {
      return "Based on your guest browsing, searches, and filters.";
    }
    if (hasHistory && hasArtistPreference) {
      return "Based on your guest browsing and artist preferences.";
    }
    if (hasHistory) {
      return "Based on your recent guest browsing.";
    }
    if (hasSearchOrFilters && hasArtistPreference) {
      return "Based on your recent guest searches, filters, and artist preferences.";
    }
    if (hasSearchOrFilters) {
      return "Based on your recent guest searches and filters.";
    }
    if (hasArtistPreference) {
      return "Based on your guest artist preferences.";
    }
    return "Personalized picks from your activity on this browser.";
  }

  if (hasHistory && hasSearchOrFilters && hasFollowedArtists) {
    return "Based on your browsing, searches, filters, and followed artists.";
  }
  if (hasHistory && hasSearchOrFilters && hasArtistPreference) {
    return "Based on your browsing, searches, filters, and artist preferences.";
  }
  if (hasHistory && hasSearchOrFilters) {
    return "Based on your browsing, searches, and filters.";
  }
  if (hasHistory && hasFollowedArtists) {
    return "Based on your browsing and the artists you follow.";
  }
  if (hasHistory && hasArtistPreference) {
    return "Based on your browsing and artist preferences.";
  }
  if (hasHistory) {
    return "Based on your recent artwork browsing.";
  }
  if (hasSearchOrFilters && hasFollowedArtists) {
    return "Based on your recent searches, filters, and followed artists.";
  }
  if (hasSearchOrFilters) {
    return "Based on your recent searches and filters.";
  }
  if (hasFollowedArtists) {
    return "Based on the artists you follow.";
  }
  if (hasArtistPreference) {
    return "Based on your artist preferences.";
  }
  return "Personalized picks from your browsing, searches, and followed artists.";
}
