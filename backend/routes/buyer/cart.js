import express from "express";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import {
  getArtworkAvailability,
  getArtworkSoldOutSql,
  getArtworkSoldQuantitySql,
} from "../../utils/artworkAvailability.js";
import {
  recordRecommendationInteraction,
  getRecommendationSessionIdFromRequest,
} from "../../utils/recommendationInteractions.js";

const router = express.Router();

const updateCartTotal = (cartId, callback) => {
  db.query(
    `UPDATE add_cart ac
     SET total_price = (
       SELECT COALESCE(SUM(a.price * ci.quantity), 0)
       FROM cart_item ci
       JOIN artwork a ON a.artwork_id = ci.artwork_id
       WHERE ci.add_to_id = ac.add_to_id
     )
     WHERE ac.add_to_id = ?`,
    [cartId],
    callback,
  );
};

router.get("/", authenticateBuyer, (req, res) => {
  res.set("Cache-Control", "no-store");
  const sql = `
    SELECT
      ci.cart_item_id,
      ci.add_to_id,
      ci.artwork_id,
      ci.quantity,
      ci.date_created,
      a.student_id AS seller_id,
      a.title,
      a.price,
      a.image,
      a.genre,
      a.art_type,
      a.product,
      JSON_UNQUOTE(JSON_EXTRACT(a.artwork_details, '$.stock_available')) AS stock_available,
      ${getArtworkSoldQuantitySql()} AS sold_quantity,
      ${getArtworkSoldOutSql()} AS is_sold_out,
      CONCAT(s.first_name, ' ', s.last_name) AS artist,
      NULLIF(TRIM(st.shop_name), '') AS shop_name
    FROM add_cart ac
    JOIN cart_item ci ON ci.add_to_id = ac.add_to_id
    JOIN artwork a ON a.artwork_id = ci.artwork_id
    LEFT JOIN student s ON s.student_id = a.student_id
    LEFT JOIN storefront st ON st.student_id = a.student_id
    WHERE ac.customer_id = ?
    ORDER BY ci.date_created DESC, ci.cart_item_id DESC
  `;

  db.query(sql, [req.user.customer_id], (err, items) => {
    if (err) {
      console.error("Buyer cart query error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(items);
  });
});

router.post("/", authenticateBuyer, (req, res) => {
  const artworkId = Number(req.body.artwork_id);
  const requestedQuantity = Number(req.body.quantity ?? 1);

  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return res.status(400).json({
      message: "A valid artwork is required",
    });
  }

  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    return res.status(400).json({
      message: "A valid quantity is required",
    });
  }

  db.query(
    `SELECT
       a.artwork_id,
       JSON_UNQUOTE(JSON_EXTRACT(a.artwork_details, '$.stock_available')) AS stock_available,
      ${getArtworkSoldQuantitySql()} AS sold_quantity,

      a.is_sold,
      a.status,

      ${getArtworkSoldOutSql()} AS is_sold_out
     FROM artwork a
     WHERE a.artwork_id = ?`,
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

      const { isSoldOut } = getArtworkAvailability(
        artworks[0].stock_available,
        artworks[0].sold_quantity,
        Number(artworks[0].is_sold) === 1 ||
          String(artworks[0].status || "").toLowerCase() === "sold",
      );
      if (isSoldOut) {
        return res.status(409).json({
          message: "This artwork is sold out",
        });
      }

      db.query(
        "SELECT add_to_id FROM add_cart WHERE customer_id = ? LIMIT 1",
        [req.user.customer_id],
        (cartError, carts) => {
          if (cartError) {
            return res.status(500).json({
              message: "Database error",
            });
          }

          const addItem = (cartId) => {
            db.query(
              "SELECT cart_item_id, quantity FROM cart_item WHERE add_to_id = ? AND artwork_id = ? LIMIT 1",
              [cartId, artworkId],
              (itemError, existingItems) => {
                if (itemError) {
                  return res.status(500).json({
                    message: "Database error",
                  });
                }

                const availability = getArtworkAvailability(
                  artworks[0].stock_available,
                  artworks[0].sold_quantity,
                  Number(artworks[0].is_sold) === 1 ||
                    String(artworks[0].status || "").toLowerCase() === "sold",
                );
                const existingQuantity = existingItems.length ? Number(existingItems[0].quantity || 1) : 0;
                const nextQuantity = existingQuantity + requestedQuantity;

                if (availability.hasStockTracking && availability.remainingStock !== null && nextQuantity > availability.remainingStock) {
                  return res.status(409).json({
                    message: `Only ${availability.remainingStock} ${availability.remainingStock === 1 ? "unit" : "units"} available for this artwork.`,
                  });
                }

                const upsert = () => {
                  const payload = [cartId, artworkId, requestedQuantity];
                  const queryText = existingItems.length
                    ? "UPDATE cart_item SET quantity = quantity + ? WHERE cart_item_id = ?"
                    : "INSERT INTO cart_item (add_to_id, artwork_id, quantity) VALUES (?, ?, ?)";

                  const params = existingItems.length
                    ? [requestedQuantity, existingItems[0].cart_item_id]
                    : payload;

                  db.query(queryText, params, (insertError) => {
                    if (insertError) {
                      return res.status(500).json({
                        message: "Database error",
                      });
                    }

                    updateCartTotal(cartId, (totalError) => {
                      if (totalError) {
                        return res.status(500).json({
                          message: "Database error",
                        });
                      }

                      void recordRecommendationInteraction({
                        customerId: req.user.customer_id,
                        artworkId,
                        sessionId: getRecommendationSessionIdFromRequest(req),
                        eventType: "cart",
                        sourcePage: "cart",
                      }).catch((error) =>
                        console.error(
                          "Cart recommendation tracking failed:",
                          error,
                        ),
                      );

                      return res.status(existingItems.length ? 200 : 201).json({
                        message: existingItems.length ? "Cart quantity updated" : "Artwork added to cart",
                      });
                    });
                  });
                };

                upsert();
              },
            );
          };

          if (carts.length) {
            return addItem(carts[0].add_to_id);
          }

          db.query(
            "INSERT INTO add_cart (customer_id, total_price) VALUES (?, 0)",
            [req.user.customer_id],
            (insertCartError, result) => {
              if (insertCartError) {
                return res.status(500).json({
                  message: "Database error",
                });
              }

              return addItem(result.insertId);
            },
          );
        },
      );
    },
  );
});

router.patch("/:artworkId/quantity", authenticateBuyer, (req, res) => {
  const artworkId = Number(req.params.artworkId);
  const requestedQuantity = Number(req.body.quantity ?? 1);

  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return res.status(400).json({ message: "A valid artwork is required" });
  }

  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    return res.status(400).json({ message: "A valid quantity is required" });
  }

  db.query(
    `SELECT
       a.artwork_id,
       JSON_UNQUOTE(JSON_EXTRACT(a.artwork_details, '$.stock_available')) AS stock_available,
       ${getArtworkSoldQuantitySql()} AS sold_quantity,
       a.is_sold,
       a.status
     FROM artwork a
     WHERE a.artwork_id = ?`,
    [artworkId],
    (artworkError, artworks) => {
      if (artworkError) {
        return res.status(500).json({ message: "Database error" });
      }

      if (!artworks.length) {
        return res.status(404).json({ message: "Artwork not found" });
      }

      const availability = getArtworkAvailability(
        artworks[0].stock_available,
        artworks[0].sold_quantity,
        Number(artworks[0].is_sold) === 1 || String(artworks[0].status || "").toLowerCase() === "sold",
      );

      if (availability.isSoldOut) {
        return res.status(409).json({ message: "This artwork is sold out" });
      }

      if (availability.hasStockTracking && availability.remainingStock !== null && requestedQuantity > availability.remainingStock) {
        return res.status(409).json({
          message: `Only ${availability.remainingStock} ${availability.remainingStock === 1 ? "unit" : "units"} available for this artwork.`,
        });
      }

      db.query(
        `SELECT ci.cart_item_id, ci.add_to_id, ci.quantity
         FROM cart_item ci
         JOIN add_cart ac ON ac.add_to_id = ci.add_to_id
         WHERE ac.customer_id = ? AND ci.artwork_id = ?
         LIMIT 1`,
        [req.user.customer_id, artworkId],
        (findError, items) => {
          if (findError) {
            return res.status(500).json({ message: "Database error" });
          }

          if (!items.length) {
            return res.status(404).json({ message: "Cart item not found" });
          }

          db.query(
            "UPDATE cart_item SET quantity = ? WHERE cart_item_id = ?",
            [requestedQuantity, items[0].cart_item_id],
            (updateError) => {
              if (updateError) {
                return res.status(500).json({ message: "Database error" });
              }

              updateCartTotal(items[0].add_to_id, (totalError) => {
                if (totalError) {
                  return res.status(500).json({ message: "Database error" });
                }

                return res.json({
                  message: "Cart quantity updated",
                  quantity: requestedQuantity,
                });
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
    `SELECT ci.cart_item_id, ci.add_to_id
     FROM cart_item ci
     JOIN add_cart ac ON ac.add_to_id = ci.add_to_id
     WHERE ac.customer_id = ? AND ci.artwork_id = ?
     LIMIT 1`,
    [req.user.customer_id, artworkId],
    (findError, items) => {
      if (findError) {
        return res.status(500).json({
          message: "Database error",
        });
      }

      if (!items.length) {
        return res.status(404).json({
          message: "Cart item not found",
        });
      }

      const { cart_item_id: cartItemId, add_to_id: cartId } = items[0];

      db.query(
        "DELETE FROM cart_item WHERE cart_item_id = ?",
        [cartItemId],
        (deleteError) => {
          if (deleteError) {
            return res.status(500).json({
              message: "Database error",
            });
          }

          updateCartTotal(cartId, (totalError) => {
            if (totalError) {
              return res.status(500).json({
                message: "Database error",
              });
            }

            void recordRecommendationInteraction({
              customerId: req.user.customer_id,
              artworkId,
              sessionId: getRecommendationSessionIdFromRequest(req),
              eventType: "remove_cart",
              sourcePage: "cart",
            }).catch((error) =>
              console.error("Cart removal tracking failed:", error),
            );

            return res.json({
              message: "Artwork removed from cart",
            });
          });
        },
      );
    },
  );
});

export default router;
