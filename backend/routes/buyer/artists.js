import express from "express";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";

const router = express.Router();

router.get("/", authenticateBuyer, (req, res) => {
  res.set("Cache-Control", "no-store");
  db.query(
    `SELECT artist_ratings.student_id,
            COALESCE(ROUND(artist_ratings.average_rating, 1), 0) AS averageRating,
            (SELECT COUNT(*)
             FROM customer_artist_follow followers
             WHERE followers.student_id = artist_ratings.student_id) AS followerCount,
            EXISTS (
              SELECT 1
              FROM customer_artist_follow buyer_follows
              WHERE buyer_follows.student_id = artist_ratings.student_id
                AND buyer_follows.customer_id = ?
            ) AS isFollowing
     FROM (
       SELECT a.student_id, AVG(review_averages.average_rating) AS average_rating
       FROM artwork a
       JOIN student s ON s.student_id = a.student_id
       LEFT JOIN accregistration ac ON ac.student_id = a.student_id
       LEFT JOIN (
         SELECT artwork_id, AVG(rating) AS average_rating
         FROM artwork_reviews
         WHERE artwork_id IS NOT NULL AND rating BETWEEN 1 AND 5 AND rating = FLOOR(rating)
         GROUP BY artwork_id
       ) review_averages ON review_averages.artwork_id = a.artwork_id
       WHERE (ac.register_status IS NULL OR LOWER(ac.register_status) = 'verified')
         AND EXISTS (
           SELECT 1 FROM artupload au
           WHERE au.artwork_id = a.artwork_id
             AND LOWER(au.request_status) = 'verified'
         )
       GROUP BY a.student_id
     ) artist_ratings
     ORDER BY artist_ratings.student_id`,
    [req.user.customer_id],
    (error, rows) => {
      if (error) {
        console.error("Buyer artist summary query error:", error);
        return res.status(500).json({ message: "Unable to load artist summaries" });
      }

      return res.json(rows.map((row) => ({
        student_id: Number(row.student_id),
        averageRating: Number(row.averageRating) || 0,
        followerCount: Number(row.followerCount) || 0,
        isFollowing: Boolean(Number(row.isFollowing)),
      })));
    },
  );
});

const getFollowerCount = (studentId, callback) => {
  db.query(
    "SELECT COUNT(*) AS followerCount FROM customer_artist_follow WHERE student_id = ?",
    [studentId],
    callback,
  );
};

const followHandler = (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!Number.isSafeInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ message: "A valid artist is required" });
  }

  db.query(
    "SELECT student_id FROM student WHERE student_id = ? LIMIT 1",
    [studentId],
    (artistError, artists) => {
      if (artistError) {
        console.error("Buyer artist validation query error:", artistError);
        return res.status(500).json({ message: "Unable to follow artist" });
      }
      if (!artists.length) {
        return res.status(404).json({ message: "Artist not found" });
      }

      db.query(
        "INSERT IGNORE INTO customer_artist_follow (customer_id, student_id) VALUES (?, ?)",
        [req.user.customer_id, studentId],
        (insertError) => {
          if (insertError) {
            console.error("Buyer artist follow query error:", insertError);
            return res.status(500).json({ message: "Unable to follow artist" });
          }
          getFollowerCount(studentId, (countError, rows) => {
            if (countError) {
              console.error("Buyer artist follower count query error:", countError);
              return res.status(500).json({ message: "Unable to load artist followers" });
            }
            return res.status(200).json({
              student_id: studentId,
              followerCount: Number(rows[0]?.followerCount) || 0,
              isFollowing: true,
            });
          });
        },
      );
    },
  );
};

router.post("/:studentId/follow", authenticateBuyer, followHandler);

router.delete("/:studentId/follow", authenticateBuyer, (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!Number.isSafeInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ message: "A valid artist is required" });
  }

  db.query(
    "DELETE FROM customer_artist_follow WHERE customer_id = ? AND student_id = ?",
    [req.user.customer_id, studentId],
    (deleteError) => {
      if (deleteError) {
        console.error("Buyer artist unfollow query error:", deleteError);
        return res.status(500).json({ message: "Unable to unfollow artist" });
      }
      getFollowerCount(studentId, (countError, rows) => {
        if (countError) {
          console.error("Buyer artist follower count query error:", countError);
          return res.status(500).json({ message: "Unable to load artist followers" });
        }
        return res.json({
          student_id: studentId,
          followerCount: Number(rows[0]?.followerCount) || 0,
          isFollowing: false,
        });
      });
    },
  );
});

export default router;
