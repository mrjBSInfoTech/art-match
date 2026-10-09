import express from "express";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import {
  recordRecommendationInteraction,
  getRecommendationSessionIdFromRequest,
} from "../../utils/recommendationInteractions.js";

const router = express.Router();

router.get("/", authenticateBuyer, (req, res) => {
  const sql = `
    SELECT
      cf.favorite_id,
      cf.artwork_id,
      cf.created_at,
      a.title,
      a.price,
      a.image,
      a.genre,
      CONCAT(s.first_name, ' ', s.last_name) AS artist
    FROM customer_favorite cf
    JOIN artwork a ON a.artwork_id = cf.artwork_id
    LEFT JOIN student s ON s.student_id = a.student_id
    WHERE cf.customer_id = ?
    ORDER BY cf.created_at DESC, cf.favorite_id DESC
  `;

  db.query(sql, [req.user.customer_id], (error, favorites) => {
    if (error) {
      console.error("Buyer favorites query error:", error);

      return res.status(500).json({
        message: "Database error",
      });
    }

    return res.json(favorites);
  });
});

router.post("/:artworkId", authenticateBuyer, (req, res) => {
  const artworkId = Number(req.params.artworkId);

  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return res.status(400).json({
      message: "A valid artwork is required",
    });
  }

  db.query(
    "SELECT artwork_id FROM artwork WHERE artwork_id = ?",
    [artworkId],
    (artworkError, artworks) => {
      if (artworkError) {
        return res.status(500).json({
          message: "Database error",
        });
      }

      if (!artworks.length) {
        return res.status(404).json({
          message: "Artwork not found",
        });
      }

      db.query(
        "SELECT favorite_id FROM customer_favorite WHERE customer_id = ? AND artwork_id = ? LIMIT 1",
        [req.user.customer_id, artworkId],
        (favoriteError, favoriteRows) => {
          if (favoriteError) {
            return res.status(500).json({
              message: "Database error",
            });
          }

          // Already favorite:
          // POST acts as a toggle and removes it.
          if (favoriteRows.length) {
            db.query(
              "DELETE FROM customer_favorite WHERE favorite_id = ?",
              [favoriteRows[0].favorite_id],
              (deleteError) => {
                if (deleteError) {
                  return res.status(500).json({
                    message: "Database error",
                  });
                }

                void recordRecommendationInteraction({
                  customerId: req.user.customer_id,

                  artworkId,

                  sessionId: getRecommendationSessionIdFromRequest(req),

                  eventType: "unfavorite",

                  sourcePage: "favorites",
                }).catch((error) =>
                  console.error(
                    "Unfavorite recommendation tracking failed:",
                    error,
                  ),
                );

                return res.json({
                  message: "Artwork removed from favorites",
                  isFavorite: false,
                });
              },
            );

            return;
          }

          // Not favorite yet:
          // create it first, then record the event.
          db.query(
            "INSERT INTO customer_favorite (customer_id, artwork_id) VALUES (?, ?)",
            [req.user.customer_id, artworkId],
            (insertError) => {
              if (insertError) {
                return res.status(500).json({
                  message: "Database error",
                });
              }

              void recordRecommendationInteraction({
                customerId: req.user.customer_id,

                artworkId,

                sessionId: getRecommendationSessionIdFromRequest(req),

                eventType: "favorite",

                sourcePage: "favorites",
              }).catch((error) =>
                console.error(
                  "Favorite recommendation tracking failed:",
                  error,
                ),
              );

              return res.status(201).json({
                message: "Artwork added to favorites",
                isFavorite: true,
              });
            },
          );
        },
      );
    },
  );
});

router.delete("/:artworkId", authenticateBuyer, (req, res) => {
  const artworkId = Number(req.params.artworkId);

  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return res.status(400).json({
      message: "A valid artwork is required",
    });
  }

  db.query(
    "DELETE FROM customer_favorite WHERE customer_id = ? AND artwork_id = ?",
    [req.user.customer_id, artworkId],
    (error, result) => {
      if (error) {
        return res.status(500).json({
          message: "Database error",
        });
      }

      if (!result.affectedRows) {
        return res.status(404).json({
          message: "Favorite not found",
        });
      }

      void recordRecommendationInteraction({
        customerId: req.user.customer_id,

        artworkId,

        sessionId: getRecommendationSessionIdFromRequest(req),

        eventType: "unfavorite",

        sourcePage: "favorites",
      }).catch((trackingError) =>
        console.error(
          "Unfavorite recommendation tracking failed:",
          trackingError,
        ),
      );

      return res.json({
        message: "Artwork removed from favorites",
        isFavorite: false,
      });
    },
  );
});

export default router;
