import express from "express";
import db from "../../database/db.js";
import { authenticateBuyerOptional } from "../../middleware/buyerAuthMiddleware.js";
import { recommendArtworks } from "../../collaborativeFiltering/recommender.js";
import {
  getArtworkRatingSql,
  getArtworkRatingSummary,
} from "../../utils/artworkRatings.js";
import {
  getArtworkSoldOutSql,
  getArtworkSoldQuantitySql,
  getCompletedOrderCondition,
} from "../../utils/artworkAvailability.js";
import { enrichArtworksWithOptionStock } from "../../utils/inventoryStock.js";

const router = express.Router();
const artworkRatingSql = getArtworkRatingSql();

const withArtworkRating = (artwork) => {
  const summary = getArtworkRatingSummary(artwork);
  return {
    ...artwork,
    rating: summary.average_rating,
    average_rating: summary.average_rating,
    rating_count: summary.total_reviews,
    ranking_rating: summary.bayesian_rating,
  };
};

// GET /api/buyer/recommendations?top_k=4
router.get("/", authenticateBuyerOptional, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const topK = Math.min(100, Math.max(1, Number(req.query.top_k) || 4));
  const targetCustomerId = req.user?.customer_id || null;

  try {
    const dbPromise = db.promise();

    // 1. Read live buyer actions from your existing MySQL tables in parallel
    const [
      [favoriteRows],
      [cartRows],
      [purchaseRows],
      [reviewRows],
      [artworkRows],
    ] = await Promise.all([
      dbPromise.query(
        `SELECT customer_id, artwork_id
         FROM customer_favorite`,
      ),
      dbPromise.query(
        `SELECT ac.customer_id, ci.artwork_id
         FROM add_cart ac
         JOIN cart_item ci ON ci.add_to_id = ac.add_to_id`,
      ),
      dbPromise.query(
        `SELECT o.customer_id, oi.artwork_id
         FROM marketplace_order o
         JOIN marketplace_order_item oi ON oi.order_id = o.order_id
         WHERE oi.artwork_id IS NOT NULL
           AND ${getCompletedOrderCondition("o")}`,
      ),
      dbPromise.query(
        `SELECT customer_id, artwork_id, rating
         FROM artwork_reviews
         WHERE artwork_id IS NOT NULL
         AND order_id IS NOT NULL`,
      ),
      dbPromise.query(
        `SELECT
           a.artwork_id,
           ${artworkRatingSql.select},
           a.student_id,
           a.title,
           a.price,
           a.description,
           a.image,
           a.color_used,
           a.genre,
           a.art_type,
           a.exact_art_type,
           a.product,
           a.product_type,
           a.payment_mode,
           a.upfront_percentage,
           a.product_sample_image,
           a.art_size,
           a.artwork_details,
           JSON_UNQUOTE(JSON_EXTRACT(a.artwork_details, '$.stock_available')) AS stock_available,
           ${getArtworkSoldQuantitySql()} AS sold_quantity,
           ${getArtworkSoldOutSql()} AS is_sold_out,
           a.date_created,
           CONCAT(s.first_name, ' ', s.last_name) AS artist,
           s.profile_image,
           s.course,
           sf.shop_name
         FROM artwork a
         ${artworkRatingSql.join}
         LEFT JOIN student s ON a.student_id = s.student_id
         LEFT JOIN accregistration ac ON a.student_id = ac.student_id
         LEFT JOIN storefront sf ON sf.student_id = a.student_id
         WHERE (ac.register_status IS NULL OR LOWER(ac.register_status) = 'verified')
           AND EXISTS (
             SELECT 1 FROM artupload au
             WHERE au.artwork_id = a.artwork_id
               AND LOWER(au.request_status) = 'verified'
           )
           AND ${getArtworkSoldOutSql("a")} = 0
         ORDER BY ranking_rating DESC, a.date_created DESC, a.artwork_id DESC`,
      ),
    ]);

    // 2. Put all 4 action types into one simple list for the algorithm
    const interactionRows = [
      ...favoriteRows.map((row) => ({
        customerId: row.customer_id,
        artworkId: row.artwork_id,
        favorited: true,
      })),
      ...cartRows.map((row) => ({
        customerId: row.customer_id,
        artworkId: row.artwork_id,
        inCart: true,
      })),
      ...purchaseRows.map((row) => ({
        customerId: row.customer_id,
        artworkId: row.artwork_id,
        purchased: true,
      })),
      ...reviewRows.map((row) => ({
        customerId: row.customer_id,
        artworkId: row.artwork_id,
        rating: row.rating,
      })),
    ];

    // 3. Filter out any artworks whose product options are all sold out
    const enrichedArtworks = await enrichArtworksWithOptionStock(
      db,
      artworkRows.map(withArtworkRating),
    );
    const availableArtworks = enrichedArtworks.filter(
      (item) => !Number(item.is_sold_out),
    );

    const artworkById = new Map(
      availableArtworks.map((item) => [String(item.artwork_id), item]),
    );

    // 4. Run Item-Based Collaborative Filtering
    const ranked = recommendArtworks({
      interactionRows,
      targetCustomerId,
      availableArtworkIds: availableArtworks.map((item) => item.artwork_id),
      topK,
    });

    // 5. Attach the full artwork details so the frontend can display cards
    const recommendations = ranked
      .map((match) => {
        const artwork = artworkById.get(String(match.artworkId));
        if (!artwork) return null;
        return {
          ...artwork,
          recommendation_score: match.score,
          recommendation_strategy: match.strategy,
        };
      })
      .filter(Boolean);

    return res.json({
      algorithm: "item_based_collaborative_filtering",
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error("Collaborative filtering recommendation error:", error);
    return res
      .status(500)
      .json({ message: "Unable to load recommendations right now." });
  }
});

export default router;