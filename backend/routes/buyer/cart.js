import express from "express";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";

const router = express.Router();

const updateCartTotal = (cartId, callback) => {
  db.query(
    `UPDATE add_cart ac
     SET total_price = (
       SELECT COALESCE(SUM(a.price), 0)
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
  const sql = `
    SELECT
      ci.cart_item_id,
      ci.add_to_id,
      ci.artwork_id,
      ci.date_created,
      a.title,
      a.price,
      a.image,
      a.genre,
      CONCAT(s.first_name, ' ', s.last_name) AS artist
    FROM add_cart ac
    JOIN cart_item ci ON ci.add_to_id = ac.add_to_id
    JOIN artwork a ON a.artwork_id = ci.artwork_id
    LEFT JOIN student s ON s.student_id = a.student_id
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
  if (!Number.isInteger(artworkId) || artworkId <= 0) {
    return res.status(400).json({ message: "A valid artwork is required" });
  }

  db.query(
    "SELECT artwork_id FROM artwork WHERE artwork_id = ?",
    [artworkId],
    (artworkError, artworks) => {
      if (artworkError) return res.status(500).json({ message: "Database error" });
      if (!artworks.length) return res.status(404).json({ message: "Artwork not found" });

      db.query(
        "SELECT add_to_id FROM add_cart WHERE customer_id = ? LIMIT 1",
        [req.user.customer_id],
        (cartError, carts) => {
          if (cartError) return res.status(500).json({ message: "Database error" });

          const addItem = (cartId) => {
            db.query(
              "SELECT cart_item_id FROM cart_item WHERE add_to_id = ? AND artwork_id = ? LIMIT 1",
              [cartId, artworkId],
              (itemError, existingItems) => {
                if (itemError) return res.status(500).json({ message: "Database error" });
                if (existingItems.length) {
                  return res.status(409).json({ message: "Artwork is already in your cart" });
                }

                db.query(
                  "INSERT INTO cart_item (add_to_id, artwork_id) VALUES (?, ?)",
                  [cartId, artworkId],
                  (insertError) => {
                    if (insertError) return res.status(500).json({ message: "Database error" });
                    updateCartTotal(cartId, (totalError) => {
                      if (totalError) return res.status(500).json({ message: "Database error" });
                      res.status(201).json({ message: "Artwork added to cart" });
                    });
                  },
                );
              },
            );
          };

          if (carts.length) return addItem(carts[0].add_to_id);

          db.query(
            "INSERT INTO add_cart (customer_id, total_price) VALUES (?, 0)",
            [req.user.customer_id],
            (insertCartError, result) => {
              if (insertCartError) return res.status(500).json({ message: "Database error" });
              addItem(result.insertId);
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
    return res.status(400).json({ message: "A valid artwork is required" });
  }

  db.query(
    `SELECT ci.cart_item_id, ci.add_to_id
     FROM cart_item ci
     JOIN add_cart ac ON ac.add_to_id = ci.add_to_id
     WHERE ac.customer_id = ? AND ci.artwork_id = ?
     LIMIT 1`,
    [req.user.customer_id, artworkId],
    (findError, items) => {
      if (findError) return res.status(500).json({ message: "Database error" });
      if (!items.length) return res.status(404).json({ message: "Cart item not found" });

      const { cart_item_id: cartItemId, add_to_id: cartId } = items[0];
      db.query(
        "DELETE FROM cart_item WHERE cart_item_id = ?",
        [cartItemId],
        (deleteError) => {
          if (deleteError) return res.status(500).json({ message: "Database error" });
          updateCartTotal(cartId, (totalError) => {
            if (totalError) return res.status(500).json({ message: "Database error" });
            res.json({ message: "Artwork removed from cart" });
          });
        },
      );
    },
  );
});

export default router;
