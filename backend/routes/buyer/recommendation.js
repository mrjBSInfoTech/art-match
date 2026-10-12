import express from "express";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";
import { recordRecommendationInteraction } from "../../utils/recommendationInteractions.js";

const router = express.Router();
const CLIENT_EVENTS = new Set(["view", "search", "filter"]);

const POSITIVE_ITEM_EVENTS = ["view", "favorite", "cart", "purchase"];

const ML_RECOMMEND_URL =
  process.env.ML_RECOMMEND_URL || "http://127.0.0.1:8000/recommend";

const optionalCustomerId = (req) => {
  const authorization = String(req.headers.authorization || "");
  if (!authorization.startsWith("Bearer ")) return null;

  const token = authorization.slice(7).trim();
  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_secret_key",
    );

    const customerId = Number(decoded.id);

    return Number.isInteger(customerId) && customerId > 0 ? customerId : null;
  } catch {
    // Missing/expired token does not stop guest tracking.
    return null;
  }
};

const cleanSessionId = (value) => {
  const sessionId = String(value || "")
    .trim()
    .slice(0, 100);

  return sessionId || null;
};

const getRecommendationSessionId = (req) =>
  cleanSessionId(req.get("x-recommendation-session") || req.query.session_id);

const getLiveArtworkHistory = async ({ customerId, sessionId }) => {
  let whereSql;
  let params;

  if (customerId && sessionId) {
    whereSql = `
      (
        customer_id = ?
        OR (
          customer_id IS NULL
          AND session_id = ?
        )
      )
    `;

    params = [customerId, sessionId];
  } else if (customerId) {
    whereSql = "customer_id = ?";

    params = [customerId];
  } else {
    whereSql = `
      customer_id IS NULL
      AND session_id = ?
    `;

    params = [sessionId];
  }

  const [rows] = await db.promise().query(
    `
        SELECT
          artwork_id,
          event_type,
          created_at,
          interaction_id
        FROM recommendation_interaction
        WHERE ${whereSql}
          AND artwork_id IS NOT NULL
          AND event_type IN (?, ?, ?, ?)
        ORDER BY
          created_at ASC,
          interaction_id ASC
      `,
    [...params, ...POSITIVE_ITEM_EVENTS],
  );

  return rows.map((row) => Number(row.artwork_id));
};

const getAvailableCandidateArtworkIds = async () => {
  const [rows] = await db.promise().query(
    `
          SELECT DISTINCT
            a.artwork_id
          FROM artwork a

          LEFT JOIN accregistration ac
            ON ac.student_id =
               a.student_id

          WHERE
            LOWER(
              COALESCE(
                a.status,
                'Available'
              )
            ) = 'available'

            AND COALESCE(
              a.is_sold,
              0
            ) = 0

            AND (
              ac.register_status IS NULL
              OR LOWER(
                ac.register_status
              ) = 'verified'
            )

            AND EXISTS (
              SELECT 1
              FROM artupload au
              WHERE
                au.artwork_id =
                  a.artwork_id
                AND LOWER(
                  au.request_status
                ) = 'verified'
            )

          ORDER BY
            a.date_created DESC,
            a.artwork_id DESC
        `,
  );

  return rows.map((row) => Number(row.artwork_id));
};

const callLocalSasrec = async ({ artworkIds, candidateArtworkIds, topK }) => {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(ML_RECOMMEND_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        artwork_ids: artworkIds,

        candidate_artwork_ids: candidateArtworkIds,

        top_k: topK,
      }),

      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text();

      throw new Error(
        `ML service returned ${response.status}: ${responseText}`,
      );
    }

    const body = await response.json();

    return Array.isArray(body.recommendations) ? body.recommendations : [];
  } finally {
    clearTimeout(timeoutId);
  }
};

const attachArtworkDetails = async (recommendations) => {
  if (!Array.isArray(recommendations) || !recommendations.length) {
    return [];
  }

  const artworkIds = [
    ...new Set(
      recommendations
        .map((item) => Number(item.artwork_id))
        .filter((artworkId) => Number.isInteger(artworkId) && artworkId > 0),
    ),
  ];

  if (!artworkIds.length) {
    return [];
  }

  const placeholders = artworkIds.map(() => "?").join(", ");

  const [rows] = await db.promise().query(
    `
        SELECT
          a.artwork_id,
          a.student_id,
          a.title,
          a.price,
          a.description,
          a.image,
          a.color_used,
          a.genre,
          a.art_size,
          a.art_type,
          a.product,
          a.status,
          a.is_sold,
          a.date_created,

          f.mediums_used,

          s.first_name,
          s.last_name,

          CONCAT(
            s.first_name,
            ' ',
            s.last_name
          ) AS artist,

          s.profile_image,
          s.course,
          s.year_level,

          sf.shop_name,
          sf.shop_description,

          ac.register_status
            AS seller_status,

          ac.approved_date

        FROM artwork a

        LEFT JOIN student s
          ON s.student_id =
             a.student_id

        LEFT JOIN accregistration ac
          ON ac.student_id =
             a.student_id

        LEFT JOIN feature f
          ON f.artwork_id =
             a.artwork_id

        LEFT JOIN storefront sf
          ON sf.student_id =
             a.student_id

        WHERE
          a.artwork_id IN (
            ${placeholders}
          )
      `,
    artworkIds,
  );

  const artworkById = new Map(
    rows.map((artwork) => [Number(artwork.artwork_id), artwork]),
  );

  return recommendations
    .map((recommendation) => {
      const artwork = artworkById.get(Number(recommendation.artwork_id));

      if (!artwork) {
        return null;
      }

      return {
        ...artwork,

        rank: recommendation.rank ?? null,

        score: recommendation.score ?? null,

        sasrec_item_id: recommendation.sasrec_item_id ?? null,
      };
    })
    .filter(Boolean);
};

// ============================================================
// HYBRID RECOMMENDATION RANKING
// ============================================================

const normalizeRecommendationText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const buildRecommendationIdentityCondition = (
  { customerId, sessionId },
  alias = "",
) => {
  const prefix = alias ? `${alias}.` : "";

  if (customerId && sessionId) {
    return {
      sql: `
        (
          ${prefix}customer_id = ?
          OR (
            ${prefix}customer_id IS NULL
            AND ${prefix}session_id = ?
          )
        )
      `,

      params: [customerId, sessionId],
    };
  }

  if (customerId) {
    return {
      sql: `${prefix}customer_id = ?`,

      params: [customerId],
    };
  }

  return {
    sql: `
      ${prefix}customer_id IS NULL
      AND ${prefix}session_id = ?
    `,

    params: [sessionId],
  };
};

// ============================================================
// SEARCH + FILTER HISTORY
// ============================================================

const getRecommendationPreferenceEvents = async ({ customerId, sessionId }) => {
  const identity = buildRecommendationIdentityCondition({
    customerId,
    sessionId,
  });

  const [rows] = await db.promise().query(
    `
          SELECT
            interaction_id,
            event_type,
            search_query,
            filter_type,
            filter_value,
            min_price,
            max_price,
            created_at

          FROM recommendation_interaction

          WHERE ${identity.sql}
            AND event_type IN (
              'search',
              'filter'
            )

          ORDER BY
            created_at DESC,
            interaction_id DESC

          LIMIT 50
        `,
    identity.params,
  );

  return rows;
};

// ============================================================
// ARTIST AFFINITY
// ============================================================

const getArtistAffinity = async ({ customerId, sessionId }) => {
  const identity = buildRecommendationIdentityCondition(
    {
      customerId,
      sessionId,
    },
    "ri",
  );

  const [rows] = await db.promise().query(
    `
          SELECT
            a.student_id,

            SUM(
              CASE
                WHEN ri.event_type = 'view'
                  THEN 0.25

                WHEN ri.event_type = 'favorite'
                  THEN 2.50

                WHEN ri.event_type = 'unfavorite'
                  THEN -2.50

                WHEN ri.event_type = 'cart'
                  THEN 3.50

                WHEN ri.event_type = 'remove_cart'
                  THEN -3.50

                WHEN ri.event_type = 'purchase'
                  THEN 6.00

                ELSE 0
              END
            ) AS affinity_score

          FROM recommendation_interaction ri

          INNER JOIN artwork a
            ON a.artwork_id =
               ri.artwork_id

          WHERE ${identity.sql}

            AND ri.artwork_id
                IS NOT NULL

            AND ri.event_type IN (
              'view',
              'favorite',
              'unfavorite',
              'cart',
              'remove_cart',
              'purchase'
            )

          GROUP BY
            a.student_id

          HAVING affinity_score > 0
        `,
    identity.params,
  );

  return new Map(
    rows.map((row) => [Number(row.student_id), Number(row.affinity_score)]),
  );
};

// ============================================================
// GLOBAL ARTWORK POPULARITY
// ============================================================

const getArtworkPopularity = async (artworkIds) => {
  if (!Array.isArray(artworkIds) || !artworkIds.length) {
    return new Map();
  }

  const placeholders = artworkIds.map(() => "?").join(", ");

  const [rows] = await db.promise().query(
    `
          SELECT
            artwork_id,

            SUM(
              CASE
                WHEN event_type = 'view'
                  THEN 1

                WHEN event_type = 'favorite'
                  THEN 3

                WHEN event_type = 'cart'
                  THEN 4

                WHEN event_type = 'purchase'
                  THEN 6

                ELSE 0
              END
            ) AS popularity_score

          FROM recommendation_interaction

          WHERE artwork_id IN (
            ${placeholders}
          )

            AND event_type IN (
              'view',
              'favorite',
              'cart',
              'purchase'
            )

          GROUP BY
            artwork_id
        `,
    artworkIds,
  );

  return new Map(
    rows.map((row) => [Number(row.artwork_id), Number(row.popularity_score)]),
  );
};

// ============================================================
// SEARCH PREFERENCE SCORE
// ============================================================

const getSearchPreferenceBoost = (artwork, preferenceEvents) => {
  const title = normalizeRecommendationText(artwork.title);

  const searchableText = normalizeRecommendationText(
    [
      artwork.title,
      artwork.artist,
      artwork.genre,
      artwork.mediums_used,
      artwork.art_type,
      artwork.product,
      artwork.shop_name,
      artwork.description,
    ]
      .filter(Boolean)
      .join(" "),
  );

  let boost = 0;

  const searchEvents = preferenceEvents.filter(
    (event) => event.event_type === "search",
  );

  searchEvents.forEach((event, index) => {
    const query = normalizeRecommendationText(event.search_query);

    if (!query) {
      return;
    }

    // Newest searches are stronger.
    const recencyWeight = Math.max(0.35, 1 - index * 0.05);

    // Exact title search.
    if (title === query) {
      boost += 4.5 * recencyWeight;

      return;
    }

    // Similar / containing title.
    if (title.includes(query)) {
      boost += 3.5 * recencyWeight;

      return;
    }

    // Search matches genre,
    // medium, artist, product, etc.
    if (searchableText.includes(query)) {
      boost += 2 * recencyWeight;

      return;
    }

    // Partial word matching.
    const tokens = [
      ...new Set(query.split(/\s+/).filter((token) => token.length >= 2)),
    ];

    let tokenMatches = 0;

    for (const token of tokens) {
      if (searchableText.includes(token)) {
        tokenMatches += 1;
      }
    }

    boost += Math.min(tokenMatches * 0.4, 1.2) * recencyWeight;
  });

  return Math.min(boost, 6);
};

// ============================================================
// FILTER PREFERENCE SCORE
// ============================================================

const getFilterPreferenceBoost = (artwork, preferenceEvents) => {
  const genre = normalizeRecommendationText(artwork.genre);

  const medium = normalizeRecommendationText(artwork.mediums_used);

  const colors = normalizeRecommendationText(artwork.color_used);

  const artType = normalizeRecommendationText(artwork.art_type);

  const product = normalizeRecommendationText(artwork.product);

  const fullText = normalizeRecommendationText(
    [
      artwork.genre,
      artwork.mediums_used,
      artwork.color_used,
      artwork.art_type,
      artwork.product,
      artwork.title,
    ]
      .filter(Boolean)
      .join(" "),
  );

  let boost = 0;

  const filterEvents = preferenceEvents.filter(
    (event) => event.event_type === "filter",
  );

  filterEvents.forEach((event, index) => {
    const filterType = normalizeRecommendationText(event.filter_type);

    const filterValue = normalizeRecommendationText(event.filter_value);

    const recencyWeight = Math.max(0.35, 1 - index * 0.05);

    let matched = false;

    // --------------------------------
    // STYLE
    // Your current artwork genre acts
    // as the style/category field.
    // --------------------------------

    if (filterType === "style") {
      matched = Boolean(filterValue) && genre.includes(filterValue);
    }

    // --------------------------------
    // MATERIAL
    // --------------------------------
    else if (filterType === "material" || filterType === "materials") {
      matched = Boolean(filterValue) && medium.includes(filterValue);
    }

    // --------------------------------
    // COLOR
    // --------------------------------
    else if (filterType === "color") {
      matched = Boolean(filterValue) && colors.includes(filterValue);
    }

    // --------------------------------
    // ART TYPE
    // --------------------------------
    else if (filterType === "art_type") {
      if (filterValue === "digital") {
        matched = artType === "digital";
      } else if (filterValue === "painting") {
        matched = product.includes("painting");
      } else if (filterValue.includes("sculpture")) {
        matched = product.includes("3d") || fullText.includes("sculpt");
      } else {
        matched = fullText.includes(filterValue);
      }
    }

    // --------------------------------
    // PRICE
    // Future compatible.
    // --------------------------------
    else if (filterType === "price") {
      const price = Number(artwork.price);

      const minPrice =
        event.min_price === null || event.min_price === undefined
          ? null
          : Number(event.min_price);

      const maxPrice =
        event.max_price === null || event.max_price === undefined
          ? null
          : Number(event.max_price);

      matched =
        Number.isFinite(price) &&
        (minPrice === null || price >= minPrice) &&
        (maxPrice === null || price <= maxPrice);
    }

    // Unknown filter type:
    // use broad text matching.
    else if (filterValue) {
      matched = fullText.includes(filterValue);
    }

    if (matched) {
      boost += 2.5 * recencyWeight;
    }
  });

  return Math.min(boost, 5);
};

// ============================================================
// FINAL HYBRID RERANKER
// ============================================================

const rerankRecommendationCandidates = ({
  artworks,
  sasrecByArtworkId,
  preferenceEvents,
  artistAffinity,
  popularityByArtworkId,
  recencyRankByArtworkId,
  topK,
}) => {
  const popularityValues = [...popularityByArtworkId.values()];

  const maxPopularity = popularityValues.length
    ? Math.max(...popularityValues)
    : 0;

  const scored = artworks.map((artwork) => {
    const artworkId = Number(artwork.artwork_id);

    const sasrec = sasrecByArtworkId.get(artworkId);

    const sasrecRank = sasrec ? Number(sasrec.rank) : null;

    // Rank-based SASRec boost.
    // We intentionally do not use
    // raw logits as probabilities.
    const sasrecBoost = sasrecRank ? 9 / Math.sqrt(sasrecRank) : 0;

    const searchBoost = getSearchPreferenceBoost(artwork, preferenceEvents);

    const filterBoost = getFilterPreferenceBoost(artwork, preferenceEvents);

    const preferenceBoost = searchBoost + filterBoost;

    const rawArtistAffinity =
      artistAffinity.get(Number(artwork.student_id)) ?? 0;

    const artistBoost = Math.min(
      Math.log1p(Math.max(rawArtistAffinity, 0)) * 1.5,
      4.5,
    );

    const popularity = popularityByArtworkId.get(artworkId) ?? 0;

    const popularityBoost =
      maxPopularity > 0
        ? (Math.log1p(popularity) / Math.log1p(maxPopularity)) * 1.5
        : 0;

    const recencyRank = recencyRankByArtworkId.get(artworkId) ?? 999999;

    const recencyBoost = 1.25 / Math.sqrt(recencyRank);

    const rankingScore =
      sasrecBoost +
      preferenceBoost +
      artistBoost +
      popularityBoost +
      recencyBoost;

    let recommendationSource = "recent_popular";

    if (sasrec) {
      recommendationSource =
        preferenceBoost > 0 || artistBoost > 0 ? "sasrec_reranked" : "sasrec";
    } else if (preferenceBoost > 0 && artistBoost > 0) {
      recommendationSource = "preference_artist_fallback";
    } else if (preferenceBoost > 0) {
      recommendationSource = "preference_fallback";
    } else if (artistBoost > 0) {
      recommendationSource = "artist_fallback";
    }

    return {
      ...artwork,

      sasrec_rank: sasrecRank,

      sasrec_score: sasrec?.score ?? null,

      recommendation_source: recommendationSource,

      preference_boost: Number(preferenceBoost.toFixed(4)),

      artist_boost: Number(artistBoost.toFixed(4)),

      popularity_boost: Number(popularityBoost.toFixed(4)),

      recency_boost: Number(recencyBoost.toFixed(4)),

      ranking_score: Number(rankingScore.toFixed(6)),
    };
  });

  scored.sort((first, second) => {
    if (second.ranking_score !== first.ranking_score) {
      return second.ranking_score - first.ranking_score;
    }

    const firstRecency =
      recencyRankByArtworkId.get(Number(first.artwork_id)) ?? 999999;

    const secondRecency =
      recencyRankByArtworkId.get(Number(second.artwork_id)) ?? 999999;

    return firstRecency - secondRecency;
  });

  return scored.slice(0, topK).map((artwork, index) => ({
    ...artwork,

    rank: index + 1,
  }));
};

router.get("/", async (req, res) => {
  const customerId =
    optionalCustomerId(req);

  const sessionId =
    getRecommendationSessionId(
      req,
    );

  if (
    !customerId &&
    !sessionId
  ) {
    return res
      .status(400)
      .json({
        message:
          "A recommendation session is required.",
      });
  }

  const requestedTopK =
    Number(
      req.query.top_k ?? 8,
    );

  const topK =
    Number.isInteger(
      requestedTopK,
    )
      ? Math.min(
          Math.max(
            requestedTopK,
            1,
          ),
          20,
        )
      : 8;

  try {
    const [
      artworkIds,
      candidateArtworkIds,
      preferenceEvents,
      artistAffinity,
    ] =
      await Promise.all([
        getLiveArtworkHistory({
          customerId,
          sessionId,
        }),

        getAvailableCandidateArtworkIds(),

        getRecommendationPreferenceEvents({
          customerId,
          sessionId,
        }),

        getArtistAffinity({
          customerId,
          sessionId,
        }),
      ]);

    // --------------------------------
    // EMPTY CATALOG
    // --------------------------------

    if (
      !candidateArtworkIds.length
    ) {
      return res.json({
        mode:
          "empty_catalog",

        history_length:
          artworkIds.length,

        recommendations:
          [],
      });
    }

    // --------------------------------
    // REMOVE ALREADY-SEEN ITEMS
    // --------------------------------

    const seenArtworkIds =
      new Set(
        artworkIds,
      );

    const unseenArtworkIds =
      candidateArtworkIds.filter(
        (artworkId) =>
          !seenArtworkIds.has(
            artworkId,
          ),
      );

    // There is a hard limit:
    // if the user has seen the whole
    // available catalog, there are no
    // unseen recommendations left.
    if (
      !unseenArtworkIds.length
    ) {
      return res.json({
        mode:
          "no_unseen_artworks",

        history_length:
          artworkIds.length,

        recommendations:
          [],
      });
    }

    // Candidate list is already
    // ordered newest-first by the
    // existing catalog query.
    const recencyRankByArtworkId =
      new Map(
        unseenArtworkIds.map(
          (
            artworkId,
            index,
          ) => [
            artworkId,
            index + 1,
          ],
        ),
      );

    // --------------------------------
    // POPULARITY
    // --------------------------------

    const popularityByArtworkId =
      await getArtworkPopularity(
        unseenArtworkIds,
      );

    // --------------------------------
    // SASREC
    // --------------------------------

    let sasrecResults = [];

    if (
      artworkIds.length
    ) {
      try {
        // Ask SASRec for more than
        // the final UI needs.
        // This gives the reranker
        // a larger personalized pool.
        const sasrecTopK =
          Math.min(
            unseenArtworkIds.length,
            Math.max(
              topK * 3,
              20,
            ),
          );

        sasrecResults =
          await callLocalSasrec({
            artworkIds,

            candidateArtworkIds:
              unseenArtworkIds,

            topK:
              sasrecTopK,
          });
      } catch (mlError) {
        console.warn(
          "SASRec temporarily unavailable; continuing with hybrid fallback.",
          mlError.cause?.code ||
            mlError.message,
        );

        sasrecResults = [];
      }
    }

    const sasrecByArtworkId =
      new Map(
        sasrecResults.map(
          (result) => [
            Number(
              result.artwork_id,
            ),
            result,
          ],
        ),
      );

    // --------------------------------
    // HYDRATE EVERY UNSEEN CANDIDATE
    // --------------------------------

    const candidateSeeds =
      unseenArtworkIds.map(
        (artworkId) => {
          const sasrec =
            sasrecByArtworkId.get(
              artworkId,
            );

          return {
            artwork_id:
              artworkId,

            rank:
              sasrec?.rank ??
              null,

            score:
              sasrec?.score ??
              null,

            sasrec_item_id:
              sasrec?.sasrec_item_id ??
              null,
          };
        },
      );

    const candidateArtworks =
      await attachArtworkDetails(
        candidateSeeds,
      );

    // --------------------------------
    // FINAL RERANKING
    // --------------------------------

    const recommendations =
      rerankRecommendationCandidates({
        artworks:
          candidateArtworks,

        sasrecByArtworkId,

        preferenceEvents,

        artistAffinity,

        popularityByArtworkId,

        recencyRankByArtworkId,

        topK,
      });

    const hasSasrecResult =
      recommendations.some(
        (artwork) =>
          artwork.sasrec_rank !==
          null,
      );

    const hasFallbackResult =
      recommendations.some(
        (artwork) =>
          artwork.sasrec_rank ===
          null,
      );

    const hasPreferenceSignals =
      preferenceEvents.length >
        0 ||
      artistAffinity.size >
        0;

    let mode =
      "fallback_recent_popular";

    if (
      hasSasrecResult &&
      hasFallbackResult
    ) {
      mode =
        "hybrid";
    }

    else if (
      hasSasrecResult &&
      hasPreferenceSignals
    ) {
      mode =
        "sasrec_reranked";
    }

    else if (
      hasSasrecResult
    ) {
      mode =
        "sasrec";
    }

    else if (
      hasPreferenceSignals
    ) {
      mode =
        "preference_fallback";
    }

    return res.json({
      mode,

      history_length:
        artworkIds.length,

      signals: {
        search_filter_events:
          preferenceEvents.length,

        preferred_artists:
          artistAffinity.size,

        sasrec_candidates:
          sasrecResults.length,

        available_unseen:
          unseenArtworkIds.length,
      },

      recommendations,
    });
  } catch (error) {
    console.error(
      "Recommendation retrieval error:",
      error,
    );

    return res
      .status(500)
      .json({
        message:
          "Unable to load recommendations.",
      });
  }
});

router.post("/interactions", async (req, res) => {
  const eventType = String(req.body.event_type || "")
    .trim()
    .toLowerCase();

  const sessionId =
    String(req.body.session_id || "")
      .trim()
      .slice(0, 100) || null;

  const customerId = optionalCustomerId(req);

  if (!CLIENT_EVENTS.has(eventType)) {
    return res.status(400).json({
      message:
        "Only view, search, and filter can be recorded from the browser.",
    });
  }

  if (!customerId && !sessionId) {
    return res.status(400).json({
      message: "A recommendation session is required.",
    });
  }

  const artworkId =
    req.body.artwork_id === undefined || req.body.artwork_id === null
      ? null
      : Number(req.body.artwork_id);

  if (eventType === "view") {
    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return res.status(400).json({ message: "A valid artwork is required." });
    }

    const [artworks] = await db
      .promise()
      .query("SELECT artwork_id FROM artwork WHERE artwork_id = ? LIMIT 1", [
        artworkId,
      ]);

    if (!artworks.length) {
      return res.status(404).json({ message: "Artwork not found." });
    }

    // Prevent quick refreshes / React development remounts
    // from creating duplicate views within 30 seconds.
    const identitySql = customerId
      ? "customer_id = ?"
      : "customer_id IS NULL AND session_id = ?";

    const identityValue = customerId || sessionId;

    const [recentViews] = await db.promise().query(
      `SELECT interaction_id
       FROM recommendation_interaction
       WHERE ${identitySql}
         AND artwork_id = ?
         AND event_type = 'view'
         AND created_at >= (NOW() - INTERVAL 30 SECOND)
       LIMIT 1`,
      [identityValue, artworkId],
    );

    if (recentViews.length) {
      return res.json({
        recorded: false,
        duplicate: true,
      });
    }
  }

  const searchQuery = String(req.body.search_query || "").trim();

  if (eventType === "search" && !searchQuery) {
    return res.status(400).json({
      message: "Search query is required.",
    });
  }

  const filterType = String(req.body.filter_type || "").trim();

  const filterValue = String(req.body.filter_value || "").trim();

  const hasPrice =
    req.body.min_price !== undefined || req.body.max_price !== undefined;

  if (eventType === "filter" && (!filterType || (!filterValue && !hasPrice))) {
    return res.status(400).json({
      message: "Filter type and filter value/range are required.",
    });
  }

  try {
    const interactionId = await recordRecommendationInteraction({
      customerId,
      artworkId,
      sessionId,
      eventType,

      searchQuery: eventType === "search" ? searchQuery : null,

      filterType: eventType === "filter" ? filterType : null,

      filterValue: eventType === "filter" ? filterValue : null,

      minPrice: eventType === "filter" ? req.body.min_price : null,

      maxPrice: eventType === "filter" ? req.body.max_price : null,

      sourcePage: req.body.source_page,
    });

    return res.status(201).json({
      recorded: true,
      interaction_id: interactionId,
    });
  } catch (error) {
    console.error("Recommendation interaction error:", error);

    return res.status(500).json({
      message: "Unable to record interaction.",
    });
  }
});

export default router;
