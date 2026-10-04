import express from "express";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";

const router = express.Router();

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
};

const parseStoredArray = (value, fieldName) => {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    console.error(`Invalid storefront ${fieldName} data:`, error.message);
  }
  throw new Error(`Invalid storefront ${fieldName} data.`);
};

const normalizeSpecialties = (value) => {
  if (!Array.isArray(value)) return null;
  if (value.some((item) => typeof item !== "string")) return null;
  const specialties = value
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  const unique = [...new Map(
    specialties.map((item) => [item.toLocaleLowerCase(), item]),
  ).values()];
  if (unique.length > 3 || unique.some((item) => item.length > 50)) return null;
  return unique;
};

const normalizePinnedArtworkIds = (value) => {
  if (!Array.isArray(value)) return null;
  const ids = [];
  for (const item of value) {
    const id = Number(item);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
};

router.get("/", authenticateSeller, (req, res) => {
  const studentId = req.user?.student_id;

  db.query(
    `SELECT storefront_id, student_id, shop_name, shop_description,
            specialties, pinned_artwork_ids, created_at, updated_at
     FROM storefront
     WHERE student_id = ?
     LIMIT 1`,
    [studentId],
    (err, results) => {
      if (err) {
        console.error("Get storefront DB error:", err);
        return res
          .status(500)
          .json({ message: "Database error loading storefront." });
      }

      if (results.length === 0) {
        return res.json({
          storefront_id: null,
          student_id: studentId,
          shop_name: null,
          shop_description: null,
          specialties: null,
          pinned_artwork_ids: null,
        });
      }

      try {
        res.json({
          ...results[0],
          specialties:
            results[0].specialties == null
              ? null
              : parseStoredArray(results[0].specialties, "specialties"),
          pinned_artwork_ids:
            results[0].pinned_artwork_ids == null
              ? null
              : parseStoredArray(
                  results[0].pinned_artwork_ids,
                  "pinned artwork IDs",
                ),
        });
      } catch (error) {
        console.error("Get storefront data error:", error.message);
        res.status(500).json({ message: "Invalid saved storefront data." });
      }
    },
  );
});

router.put("/", authenticateSeller, (req, res) => {
  const studentId = req.user?.student_id;

  if (!studentId) {
    return res.status(403).json({ message: "Unable to identify seller." });
  }

  const hasSpecialties = Object.hasOwn(req.body || {}, "specialties");
  const hasPinnedArtworkIds = Object.hasOwn(
    req.body || {},
    "pinned_artwork_ids",
  );
  const specialties = hasSpecialties
    ? normalizeSpecialties(req.body.specialties)
    : undefined;
  const pinnedArtworkIds = hasPinnedArtworkIds
    ? normalizePinnedArtworkIds(req.body.pinned_artwork_ids)
    : undefined;

  if (hasSpecialties && specialties === null) {
    return res.status(400).json({
      message: "Specialties must contain up to 3 text values of 50 characters or fewer.",
    });
  }
  if (hasPinnedArtworkIds && pinnedArtworkIds === null) {
    return res.status(400).json({
      message: "Pinned artwork IDs must be positive integers.",
    });
  }

  const saveStorefrontRecord = () => {
    db.query(
      `SELECT shop_name, shop_description, specialties, pinned_artwork_ids
       FROM storefront WHERE student_id = ? LIMIT 1`,
      [studentId],
      (selectErr, rows) => {
        if (selectErr) {
          console.error("Storefront lookup error:", selectErr);
          return res
            .status(500)
            .json({ message: "Database error checking storefront." });
        }

        let previousSpecialties = [];
        let previousPinnedArtworkIds = [];
        try {
          previousSpecialties = rows.length
            ? parseStoredArray(rows[0].specialties, "specialties")
            : [];
          previousPinnedArtworkIds = rows.length
            ? parseStoredArray(
                rows[0].pinned_artwork_ids,
                "pinned artwork IDs",
              )
            : [];
        } catch (error) {
          console.error("Read storefront data error:", error.message);
          return res.status(500).json({ message: error.message });
        }

        const shopName = Object.hasOwn(req.body || {}, "shop_name")
          ? normalizeOptionalText(req.body.shop_name)
          : rows[0]?.shop_name ?? null;
        const shopDescription = Object.hasOwn(
          req.body || {},
          "shop_description",
        )
          ? normalizeOptionalText(req.body.shop_description)
          : rows[0]?.shop_description ?? null;
        const savedSpecialties = hasSpecialties
          ? specialties
          : previousSpecialties;
        const savedPinnedArtworkIds = hasPinnedArtworkIds
          ? pinnedArtworkIds
          : previousPinnedArtworkIds;

        const persist = () => {
          db.query(
            `INSERT INTO storefront
              (student_id, shop_name, shop_description, specialties, pinned_artwork_ids)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               shop_name = VALUES(shop_name),
               shop_description = VALUES(shop_description),
               specialties = VALUES(specialties),
               pinned_artwork_ids = VALUES(pinned_artwork_ids),
               updated_at = CURRENT_TIMESTAMP`,
            [
              studentId,
              shopName,
              shopDescription,
              JSON.stringify(savedSpecialties),
              JSON.stringify(savedPinnedArtworkIds),
            ],
            (saveErr) => {
              if (saveErr) {
                console.error("Save storefront DB error:", saveErr);
                return res
                  .status(500)
                  .json({ message: "Database error saving storefront." });
              }

              res.json({
                message: "Storefront updated successfully.",
                shop_name: shopName,
                shop_description: shopDescription,
                specialties: savedSpecialties,
                pinned_artwork_ids: savedPinnedArtworkIds,
              });
            },
          );
        };

        persist();
      },
    );
  };

  if (hasPinnedArtworkIds && pinnedArtworkIds.length > 0) {
    const placeholders = pinnedArtworkIds.map(() => "?").join(", ");
    db.query(
      `SELECT artwork_id FROM artwork
       WHERE student_id = ? AND artwork_id IN (${placeholders})`,
      [studentId, ...pinnedArtworkIds],
      (ownershipErr, ownedArtworks) => {
        if (ownershipErr) {
          console.error("Pinned artwork ownership check error:", ownershipErr);
          return res
            .status(500)
            .json({ message: "Database error validating pinned artworks." });
        }
        if (ownedArtworks.length !== pinnedArtworkIds.length) {
          return res.status(400).json({
            message: "Pinned artworks must belong to your account.",
          });
        }
        saveStorefrontRecord();
      },
    );
    return;
  }

  saveStorefrontRecord();
});

export default router;
