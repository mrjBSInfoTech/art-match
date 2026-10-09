import express from "express";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";
import {
  recordRecommendationInteraction,
} from "../../utils/recommendationInteractions.js";

const router = express.Router();
const CLIENT_EVENTS = new Set(["view", "search", "filter"]);

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

    return Number.isInteger(customerId) && customerId > 0
      ? customerId
      : null;
  } catch {
    // Missing/expired token does not stop guest tracking.
    return null;
  }
};

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
    req.body.artwork_id === undefined ||
    req.body.artwork_id === null
      ? null
      : Number(req.body.artwork_id);

  if (eventType === "view") {
    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return res
        .status(400)
        .json({ message: "A valid artwork is required." });
    }

    const [artworks] = await db
      .promise()
      .query(
        "SELECT artwork_id FROM artwork WHERE artwork_id = ? LIMIT 1",
        [artworkId],
      );

    if (!artworks.length) {
      return res
        .status(404)
        .json({ message: "Artwork not found." });
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

  const searchQuery = String(
    req.body.search_query || "",
  ).trim();

  if (eventType === "search" && !searchQuery) {
    return res.status(400).json({
      message: "Search query is required.",
    });
  }

  const filterType = String(
    req.body.filter_type || "",
  ).trim();

  const filterValue = String(
    req.body.filter_value || "",
  ).trim();

  const hasPrice =
    req.body.min_price !== undefined ||
    req.body.max_price !== undefined;

  if (
    eventType === "filter" &&
    (!filterType || (!filterValue && !hasPrice))
  ) {
    return res.status(400).json({
      message:
        "Filter type and filter value/range are required.",
    });
  }

  try {
    const interactionId =
      await recordRecommendationInteraction({
        customerId,
        artworkId,
        sessionId,
        eventType,

        searchQuery:
          eventType === "search"
            ? searchQuery
            : null,

        filterType:
          eventType === "filter"
            ? filterType
            : null,

        filterValue:
          eventType === "filter"
            ? filterValue
            : null,

        minPrice:
          eventType === "filter"
            ? req.body.min_price
            : null,

        maxPrice:
          eventType === "filter"
            ? req.body.max_price
            : null,

        sourcePage: req.body.source_page,
      });

    return res.status(201).json({
      recorded: true,
      interaction_id: interactionId,
    });
  } catch (error) {
    console.error(
      "Recommendation interaction error:",
      error,
    );

    return res.status(500).json({
      message: "Unable to record interaction.",
    });
  }
});

export default router;