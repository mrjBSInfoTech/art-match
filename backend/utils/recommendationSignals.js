export const normalizeRecommendationText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const normalizeSpecialty = (value) =>
  normalizeRecommendationText(value)
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const parseSellerSpecialties = (value) => {
  // Drivers may return JSON already decoded or as a JSON string.
  try {
    for (let depth = 0; depth < 2 && typeof value === "string"; depth += 1) {
      value = JSON.parse(value);
    }
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  return [...new Map(
    value
      .filter((item) => typeof item === "string" && normalizeSpecialty(item))
      .map((item) => [normalizeSpecialty(item), item.trim()]),
  ).values()].slice(0, 3);
};

export const getActivityRecencyWeight = (event, index = 0, now = Date.now()) => {
  const timestamp = new Date(event?.created_at).getTime();
  const ageDays = Number.isFinite(timestamp)
    ? Math.max(0, now - timestamp) / 86400000
    : 0;
  // No permanent minimum: old activity remains eligible but gradually fades.
  return Math.pow(0.75, index) * Math.pow(0.5, ageDays / 7);
};

/**
 * Fold active followed-artist subscriptions into artist affinity and specialty
 * preferences, while keeping a dedicated lookup map for follow-specific boosting.
 */
export const mergeFollowedArtistPreferences = ({
  artistAffinity = new Map(),
  specialtyPreferences = new Map(),
  followedArtists = [],
  now = Date.now(),
} = {}) => {
  const nextArtistAffinity = new Map(artistAffinity);
  const nextSpecialtyPreferences = new Map(specialtyPreferences);
  const followedArtistById = new Map();

  followedArtists.forEach((follow, index) => {
    const studentId = Number(follow?.student_id);
    if (!Number.isInteger(studentId) || studentId <= 0) return;

    const recencyWeight = getActivityRecencyWeight(follow, index, now);
    const followAffinity = 5.0 + 3.0 * recencyWeight;
    nextArtistAffinity.set(
      studentId,
      (nextArtistAffinity.get(studentId) ?? 0) + followAffinity,
    );

    const specialties = Array.isArray(follow?.seller_specialties)
      ? follow.seller_specialties
      : parseSellerSpecialties(follow?.specialties);

    for (const specialty of specialties) {
      const key = normalizeSpecialty(specialty);
      if (!key) continue;
      nextSpecialtyPreferences.set(
        key,
        (nextSpecialtyPreferences.get(key) ?? 0) + (1.5 + 2.5 * recencyWeight),
      );
    }

    if (!followedArtistById.has(studentId)) {
      followedArtistById.set(studentId, {
        student_id: studentId,
        created_at: follow?.created_at ?? null,
        recencyWeight,
      });
    }
  });

  return {
    artistAffinity: nextArtistAffinity,
    specialtyPreferences: nextSpecialtyPreferences,
    followedArtistById,
  };
};

export const getFollowedArtistBoost = (studentId, followedArtistById) => {
  const entry = followedArtistById?.get?.(Number(studentId));
  if (!entry) return 0;
  const recencyWeight = Number.isFinite(entry.recencyWeight) ? entry.recencyWeight : 1;
  return 6.0 + 2.0 * recencyWeight;
};

const CANCELLATION_EVENTS = new Set(["unfavorite", "remove_cart"]);

export const hasActiveRecommendationSignals = ({
  artworkIds = [],
  preferenceEvents = [],
  recentActivity = [],
  artistAffinity = new Map(),
  specialtyPreferences = new Map(),
  followedArtists = [],
} = {}) => {
  const hasActiveRecent = recentActivity.some(
    (event) => !CANCELLATION_EVENTS.has(String(event?.event_type || "").toLowerCase()),
  );
  return (
    artworkIds.length > 0 ||
    preferenceEvents.length > 0 ||
    hasActiveRecent ||
    artistAffinity.size > 0 ||
    specialtyPreferences.size > 0 ||
    followedArtists.length > 0
  );
};

export const selectSasrecSeedArtworkIds = ({
  artworkIds = [],
  preferenceEvents = [],
  followedArtistById = new Map(),
  candidateArtworks = [],
  getFilterPreferenceBoost,
  getSearchPreferenceBoost,
} = {}) => {
  if (artworkIds.length > 0) return [...artworkIds];

  if (preferenceEvents.length > 0) {
    const filterMatchingSeeds = candidateArtworks
      .filter(
        (artwork) =>
          (getFilterPreferenceBoost?.(artwork, preferenceEvents) ?? 0) > 0 ||
          (getSearchPreferenceBoost?.(artwork, preferenceEvents) ?? 0) > 0,
      )
      .map((artwork) => Number(artwork.artwork_id))
      .slice(0, 5);
    if (filterMatchingSeeds.length > 0) return filterMatchingSeeds;
  }

  if (followedArtistById.size > 0) {
    const followedSeeds = candidateArtworks
      .filter((artwork) => followedArtistById.has(Number(artwork.student_id)))
      .map((artwork) => Number(artwork.artwork_id))
      .slice(0, 5);
    if (followedSeeds.length > 0) return followedSeeds;
  }

  return [];
};

export const buildColdStartRecommendationResponse = ({
  personalizationAllowed = true,
  eligibleCandidates = 0,
  availableUnseen = 0,
} = {}) => ({
  mode: personalizationAllowed ? "no_activity" : "personalization_disabled",
  cold_start: true,
  has_activity: false,
  history_length: 0,
  signals: {
    cold_start: true,
    has_activity: false,
    recent_activity_events: 0,
    eligible_candidates: eligibleCandidates,
    previously_seen_candidates: 0,
    specialty_preferences: 0,
    specialty_matched_candidates: 0,
    sasrec_candidate_pool_before_specialty: availableUnseen,
    sasrec_candidate_pool_after_specialty: 0,
    search_filter_events: 0,
    preferred_artists: 0,
    followed_artists: 0,
    sasrec_candidates: 0,
    available_unseen: availableUnseen,
  },
  recommendations: [],
});

