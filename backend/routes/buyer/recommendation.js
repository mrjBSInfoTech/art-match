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

router.get("/", async (req, res) => {
  const customerId = optionalCustomerId(req);

  const sessionId = getRecommendationSessionId(req);

  if (!customerId && !sessionId) {
    return res.status(400).json({
      message: "A recommendation session is required.",
    });
  }

  const requestedTopK = Number(req.query.top_k ?? 5);

  const topK = Number.isInteger(requestedTopK)
    ? Math.min(Math.max(requestedTopK, 1), 20)
    : 5;

  try {
    const [artworkIds, candidateArtworkIds] = await Promise.all([
      getLiveArtworkHistory({
        customerId,
        sessionId,
      }),

      getAvailableCandidateArtworkIds(),
    ]);

    const seenArtworkIds = new Set(artworkIds);

    const fallbackArtworkIds = candidateArtworkIds.filter(
      (artworkId) => !seenArtworkIds.has(artworkId),
    );

    // --------------------------------
    // EMPTY CATALOG
    // --------------------------------

    if (!candidateArtworkIds.length) {
      return res.json({
        mode: "empty_catalog",

        recommendations: [],
      });
    }

    // --------------------------------
    // COLD START
    // --------------------------------

    if (!artworkIds.length) {
      const fallback = candidateArtworkIds
        .slice(0, topK)
        .map((artworkId, index) => ({
          rank: index + 1,

          artwork_id: artworkId,

          score: null,
        }));

      const recommendations = await attachArtworkDetails(fallback);

      return res.json({
        mode: "fallback_recent",

        history_length: 0,

        recommendations,
      });
    }

    // --------------------------------
    // SASREC
    // --------------------------------

    try {
      const sasrecResults = await callLocalSasrec({
        artworkIds,

        candidateArtworkIds,

        topK,
      });

      if (sasrecResults.length) {
        const recommendations = await attachArtworkDetails(sasrecResults);

        if (recommendations.length) {
          return res.json({
            mode: "sasrec",

            history_length: artworkIds.length,

            recommendations,
          });
        }
      }
    } catch (mlError) {
      console.warn(
        "SASRec temporarily unavailable; using fallback recommendations.",
        mlError.cause?.code || mlError.message,
      );
    }
    // --------------------------------
    // SAFE FALLBACK
    // --------------------------------

    const fallback = fallbackArtworkIds
      .slice(0, topK)
      .map((artworkId, index) => ({
        rank: index + 1,

        artwork_id: artworkId,

        score: null,
      }));

    const recommendations = await attachArtworkDetails(fallback);

    return res.json({
      mode: "fallback_recent",

      history_length: artworkIds.length,

      recommendations,
    });
  } catch (error) {
    console.error("Recommendation retrieval error:", error);

    return res.status(500).json({
      message: "Unable to load recommendations.",
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
