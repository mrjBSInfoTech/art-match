import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import { logAudit } from "../../utils/auditLogger.js";
import multer from "multer";
import { uploadToB2, deleteFromB2, isB2Configured } from "../../utils/b2Storage.js";
import {
  getAuthCookieOptions,
  clearAuthCookieOptions,
  authRateLimiter,
} from "../../utils/authCookies.js";
import { getJwtSecret } from "../../utils/jwtSecret.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  encodeSafeWebp,
  safeWebpFilename,
  replaceUploadWithSafeWebp,
} from "../../utils/safeImageUpload.js";

const router = express.Router();

const auditBuyerPasswordChange = async (req, status, information) => {
  try {
    await logAudit({
      action: "CHANGE_PASSWORD",
      actor: req.user?.username || req.user?.customer_id,
      role: "Customer",
      status,
      information,
    });
  } catch (auditError) {
    console.error(
      "Unable to record buyer password change audit:",
      auditError.message,
    );
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profileUploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "buyer",
  "uploadProfile",
);
fs.mkdirSync(profileUploadDir, { recursive: true });
const profileUpload = multer({
  storage: multer.diskStorage({
    destination: profileUploadDir,
    filename: (req, file, cb) =>
      cb(
        null,
        `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      ),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
});

// Register route
router.post("/register", authRateLimiter, (req, res) => {
  const {
    username,
    first_name,
    last_name,
    email,
    phone_number,
    password,
    consent_accepted,
    consent_version,
  } = req.body;

  if (
    !username ||
    !first_name ||
    !last_name ||
    !email ||
    !phone_number ||
    !password
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const isConsentAccepted =
    consent_accepted === true ||
    consent_accepted === "true" ||
    consent_accepted === 1 ||
    consent_accepted === "1";

  if (!isConsentAccepted) {
    return res.status(400).json({
      message:
        "You must agree to the Terms of Service and Privacy Policy to create an account.",
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const policyVersion =
    String(consent_version || "1.0")
      .trim()
      .slice(0, 20) || "1.0";

  const sql =
    "INSERT INTO customer (username, first_name, last_name, email, phone_number, password, consent_given_at, consent_version) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)";

  db.query(
    sql,
    [
      username,
      first_name,
      last_name,
      email,
      phone_number,
      hashedPassword,
      policyVersion,
    ],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Username already exists" });
        }
        return res.status(500).json({ message: "Database error" });
      }

      logAudit({
        action: "REGISTER_CONSENT",
        actor: username,
        role: "Customer",
        status: "SUCCESS",
        information: `Buyer registered and accepted Privacy Policy v${policyVersion}`,
      }).catch(() => {});

      res.status(201).json({ message: "User registered successfully" });
    },
  );
});

// Login route
router.post("/login", authRateLimiter, (req, res) => {
  const { username, password } = req.body;

  const sql = `
  SELECT 
    customer_id, 
    username,
    first_name,
    last_name,
    email,
    phone_number,
    profile_image,
    is_private,
    allow_personalized_recommendations,
    consent_given_at,
    consent_version,
    password,
    COALESCE(x.is_banned, FALSE) AS is_banned
  FROM customer c
  LEFT JOIN account_access x ON x.role = 'buyer' AND x.account_id = c.customer_id
  WHERE c.username = ?`;

  db.query(sql, [username], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length === 0) {
      logAudit({
        action: "LOGIN",
        actor: username,
        role: "Customer",
        status: "FAILED",
        information: "Invalid username",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];
    if (user.is_banned) {
      return res.status(403).json({ message: "Buyer account is banned." });
    }
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      logAudit({
        action: "LOGIN",
        actor: username,
        role: "Customer",
        status: "FAILED",
        information: "Invalid password",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.customer_id,
        customer_id: user.customer_id,
        username: user.username,
        role: "buyer",
      },
      getJwtSecret(),
      { expiresIn: "1d", algorithm: "HS256" },
    );

    res.cookie("buyer_token", token, getAuthCookieOptions());

    logAudit({
      action: "LOGIN",
      actor: user.username,
      role: "Customer",
      status: "SUCCESS",
      information: "Customer logged in",
    });
    res.json({
      success: true,
      customer_id: user.customer_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number,
      profile_image: user.profile_image,
      is_private: Boolean(Number(user.is_private)),
      allow_personalized_recommendations: Boolean(
        Number(user.allow_personalized_recommendations ?? 1),
      ),
      consent_given_at: user.consent_given_at,
      consent_version: user.consent_version,
    });
  });
});

router.get("/me", authenticateBuyer, (req, res) => {
  db.query(
    "SELECT customer_id, username, first_name, last_name, email, phone_number, profile_image, is_private, allow_personalized_recommendations, consent_given_at, consent_version FROM customer WHERE customer_id = ?",
    [req.user.customer_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (!result.length)
        return res.status(404).json({ message: "Buyer not found" });
      res.json(result[0]);
    },
  );
});

router.put(
  "/me",
  authenticateBuyer,
  (req, res, next) => {
    profileUpload.single("profile_image")(req, res, (error) => {
      if (error)
        return res.status(400).json({
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? "Image must be 2MB or smaller."
              : error.message,
        });
      next();
    });
  },
  async (req, res) => {
    let uploadedKey = null;
    let committed = false;
    const removeCloudImage = async (key) => {
      if (!isB2Configured() || !key) return;
      try {
        await deleteFromB2(key);
      } catch (error) {
        console.warn("Buyer profile image cleanup failed:", error.message);
      }
    };
    try {
      const fields = [
        "username",
        "first_name",
        "last_name",
        "email",
        "phone_number",
      ];
      const updates = fields.filter((field) => Object.hasOwn(req.body, field));
      for (const field of updates) {
        if (typeof req.body[field] !== "string" || !req.body[field].trim()) {
          return res
            .status(400)
            .json({ message: "Personal information fields cannot be empty." });
        }
        req.body[field] = req.body[field].trim();
      }
      if (
        updates.includes("email") &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)
      ) {
        return res
          .status(400)
          .json({ message: "Enter a valid email address." });
      }
      const values = updates.map((field) => req.body[field]);
      if (Object.hasOwn(req.body, "is_private")) {
        if (typeof req.body.is_private !== "boolean") {
          return res
            .status(400)
            .json({ message: "Privacy setting must be a boolean." });
        }
        updates.push("is_private");
        values.push(req.body.is_private ? 1 : 0);
      }
      if (Object.hasOwn(req.body, "allow_personalized_recommendations")) {
        if (typeof req.body.allow_personalized_recommendations !== "boolean") {
          return res.status(400).json({
            message: "Recommendation preference must be a boolean.",
          });
        }
        updates.push("allow_personalized_recommendations");
        values.push(req.body.allow_personalized_recommendations ? 1 : 0);
      }
      if (!updates.length && !req.file) {
        return res
          .status(400)
          .json({ message: "No profile changes supplied." });
      }
      const [rows] = await db
        .promise()
        .query(
          "SELECT profile_image FROM customer WHERE customer_id = ? LIMIT 1",
          [req.user.customer_id],
        );
      if (!rows.length)
        return res.status(404).json({ message: "Buyer not found." });
      if (req.file) {
        const profileImageBuffer = await replaceUploadWithSafeWebp(
          req.file,
          profileUploadDir,
        );
        const profileImageName = req.file.filename;
        const key = `app-uploads/buyer/uploadProfile/${profileImageName}`;

        if (isB2Configured()) {
          try {
            await uploadToB2({
              key,
              body: profileImageBuffer,
              contentType: "image/webp",
            });
            uploadedKey = key;
          } catch (error) {
            console.warn(
              "Buyer profile B2 upload failed, continuing with local storage:",
              error.message,
            );
          }
        }

        updates.push("profile_image");
        values.push(profileImageName);
        req.file.safeFilename = profileImageName;
      }
      await db
        .promise()
        .query(
          `UPDATE customer SET ${updates.map((field) => `${field} = ?`).join(", ")} WHERE customer_id = ?`,
          [...values, req.user.customer_id],
        );
      committed = true;
      if (req.body.allow_personalized_recommendations === false) {
        await db
          .promise()
          .query(
            "DELETE FROM recommendation_interaction WHERE customer_id = ?",
            [req.user.customer_id],
          )
          .catch(() => {});
        await logAudit({
          action: "OPT_OUT_RECOMMENDATION_PROFILING",
          actor: req.user.username || req.user.customer_id,
          role: "Customer",
          status: "SUCCESS",
          information:
            "Buyer opted out of personalized SASRec recommendation profiling and cleared interaction history (RA 10173 Right to Object).",
        }).catch(() => {});
      } else if (req.body.allow_personalized_recommendations === true) {
        await logAudit({
          action: "OPT_IN_RECOMMENDATION_PROFILING",
          actor: req.user.username || req.user.customer_id,
          role: "Customer",
          status: "SUCCESS",
          information:
            "Buyer opted in to personalized SASRec recommendation profiling.",
        }).catch(() => {});
      }
      if (req.file && rows[0].profile_image) {
        await removeCloudImage(
          `app-uploads/buyer/uploadProfile/${path.basename(rows[0].profile_image)}`,
        );
        const oldLocalPath = path.join(
          profileUploadDir,
          path.basename(rows[0].profile_image),
        );
        if (fs.existsSync(oldLocalPath)) {
          fs.unlinkSync(oldLocalPath);
        }
      }
      await logAudit({
        action: "UPDATE_ACCOUNT_INFORMATION",
        actor: req.user.customer_id,
        role: "Customer",
        status: "SUCCESS",
        information: "Buyer profile updated successfully.",
      }).catch(() => {});
      res.json({
        message: "Buyer profile updated successfully.",
        profile_image: req.file?.safeFilename,
      });
    } catch (error) {
      if (uploadedKey && !committed) await removeCloudImage(uploadedKey);
      if (req.file?.path && !committed && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      console.error("Buyer profile update failed:", error.message);
      res
        .status(error.status || (error.code === "ER_DUP_ENTRY" ? 409 : 500))
        .json({
          message: error.status
            ? error.message
            : error.code === "ER_DUP_ENTRY"
              ? "Username or email already exists."
              : "Unable to update buyer profile.",
        });
    } finally {
      if (req.file?.path && !committed && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
    }
  },
);

router.put("/change-password", authenticateBuyer, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (!currentPassword || newPassword.length < 8 || newPassword.length > 128) {
    await auditBuyerPasswordChange(
      req,
      "FAILED",
      "Buyer password change failed: required password values were missing or the new password length was invalid.",
    );
    return res.status(400).json({
      message:
        "Enter your current password and a new password of at least 8 characters.",
    });
  }

  try {
    const [rows] = await db
      .promise()
      .query("SELECT password FROM customer WHERE customer_id = ? LIMIT 1", [
        req.user.customer_id,
      ]);
    if (!rows.length) {
      await auditBuyerPasswordChange(
        req,
        "FAILED",
        "Buyer password change failed: account was not found.",
      );
      return res.status(404).json({ message: "Buyer not found." });
    }
    if (!(await bcrypt.compare(currentPassword, rows[0].password))) {
      await auditBuyerPasswordChange(
        req,
        "FAILED",
        "Buyer password change failed: current password was incorrect.",
      );
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .promise()
      .query("UPDATE customer SET password = ? WHERE customer_id = ?", [
        passwordHash,
        req.user.customer_id,
      ]);
    await auditBuyerPasswordChange(
      req,
      "SUCCESS",
      "Buyer password was changed successfully.",
    );
    res.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Buyer password change failed:", error);
    await auditBuyerPasswordChange(
      req,
      "FAILED",
      `Buyer password change failed: ${error.message || "Unexpected error"}`,
    );
    res.status(500).json({ message: "Unable to change password." });
  }
});

router.get("/export-data", authenticateBuyer, async (req, res) => {
  const customerId = req.user.customer_id;

  try {
    const [customerRows] = await db
      .promise()
      .query(
        "SELECT customer_id, username, first_name, last_name, email, phone_number, profile_image, is_private, allow_personalized_recommendations, consent_given_at, consent_version, created_at FROM customer WHERE customer_id = ? LIMIT 1",
        [customerId],
      );

    if (!customerRows.length) {
      return res.status(404).json({ message: "Buyer account not found." });
    }

    const [
      [addresses],
      [orders],
      [orderItems],
      [reviews],
      [favorites],
      [interactions],
    ] = await Promise.all([
      db
        .promise()
        .query(
          "SELECT address_id, region, province, city, barangay, postal_code, street_name, is_current FROM address WHERE customer_id = ? ORDER BY address_id DESC",
          [customerId],
        )
        .catch(() => [[]]),
      db
        .promise()
        .query(
          "SELECT order_id, order_number, seller_id, buyer_name, buyer_email, payment_method, shipping_street, shipping_barangay, shipping_city, shipping_province, shipping_region, shipping_postal_code, subtotal, discount_amount, voucher_code, shipping_fee, total_amount, status, delivered_at, created_at FROM marketplace_order WHERE customer_id = ? ORDER BY created_at DESC",
          [customerId],
        )
        .catch(() => [[]]),
      db
        .promise()
        .query(
          "SELECT oi.order_item_id, oi.order_id, oi.artwork_id, oi.title, oi.artist_name, oi.unit_price, oi.quantity, oi.product_option_name, oi.line_total, oi.order_note FROM marketplace_order_item oi INNER JOIN marketplace_order o ON o.order_id = oi.order_id WHERE o.customer_id = ? ORDER BY oi.order_item_id DESC",
          [customerId],
        )
        .catch(() => [[]]),
      db
        .promise()
        .query(
          "SELECT review_id, order_id, artwork_id, rating, comment, seller_response, created_at FROM artwork_reviews WHERE customer_id = ? ORDER BY created_at DESC",
          [customerId],
        )
        .catch(() => [[]]),
      db
        .promise()
        .query(
          "SELECT favorite_id, artwork_id, created_at FROM customer_favorite WHERE customer_id = ? ORDER BY created_at DESC",
          [customerId],
        )
        .catch(() => [[]]),
      db
        .promise()
        .query(
          "SELECT interaction_id, artwork_id, event_type, search_query, filter_type, filter_value, created_at FROM recommendation_interaction WHERE customer_id = ? ORDER BY created_at DESC LIMIT 500",
          [customerId],
        )
        .catch(() => [[]]),
    ]);

    await logAudit({
      action: "EXPORT_PERSONAL_DATA",
      actor: customerRows[0].username || customerId,
      role: "Customer",
      status: "SUCCESS",
      information:
        "Buyer exported personal data package (RA 10173 Right to Data Portability).",
    }).catch(() => {});

    res.json({
      exported_at: new Date().toISOString(),
      legal_basis:
        "Republic Act No. 10173 (Data Privacy Act of 2012) - Section 18 (Right to Data Portability)",
      account: customerRows[0],
      addresses,
      orders,
      order_items: orderItems,
      reviews,
      favorites,
      recommendation_interactions: interactions,
    });
  } catch (error) {
    console.error("Buyer data export failed:", error);
    res
      .status(500)
      .json({ message: "Unable to export personal data at this time." });
  }
});

router.post("/delete-account", authenticateBuyer, async (req, res) => {
  const customerId = req.user.customer_id;
  const password = String(req.body.password || "");

  if (!password) {
    return res.status(400).json({
      message:
        "Please enter your current password to confirm account deletion.",
    });
  }

  try {
    const [customerRows] = await db
      .promise()
      .query(
        "SELECT customer_id, username, password, profile_image FROM customer WHERE customer_id = ? LIMIT 1",
        [customerId],
      );

    if (!customerRows.length) {
      return res.status(404).json({ message: "Buyer account not found." });
    }

    const customer = customerRows[0];
    const passwordMatches = await bcrypt.compare(password, customer.password);
    if (!passwordMatches) {
      await logAudit({
        action: "DELETE_ACCOUNT_REQUEST",
        actor: customer.username || customerId,
        role: "Customer",
        status: "FAILED",
        information:
          "Buyer account deletion failed: incorrect password confirmation.",
      }).catch(() => {});
      return res.status(400).json({ message: "Incorrect password." });
    }

    const [activeOrders] = await db
      .promise()
      .query(
        "SELECT order_id FROM marketplace_order WHERE customer_id = ? AND status IN ('Pending', 'Confirmed', 'Packed', 'Shipped') LIMIT 1",
        [customerId],
      )
      .catch(() => [[]]);

    if (activeOrders.length > 0) {
      return res.status(409).json({
        message:
          "You have active orders in progress. Please wait until your active orders are delivered or cancelled before deleting your account.",
      });
    }

    const anonymizedUsername = `deleted_buyer_${customerId}_${Date.now().toString(36)}`;
    const anonymizedEmail = `${anonymizedUsername}@anonymized.artmatch.local`;
    const unusablePasswordHash = await bcrypt.hash(
      `${Date.now()}-${Math.random()}-deleted`,
      10,
    );

    await Promise.all([
      db
        .promise()
        .query("DELETE FROM recommendation_interaction WHERE customer_id = ?", [
          customerId,
        ])
        .catch(() => {}),
      db
        .promise()
        .query("DELETE FROM customer_favorite WHERE customer_id = ?", [
          customerId,
        ])
        .catch(() => {}),
      db
        .promise()
        .query("DELETE FROM address WHERE customer_id = ?", [customerId])
        .catch(() => {}),
      db
        .promise()
        .query("DELETE FROM add_cart WHERE customer_id = ?", [customerId])
        .catch(() => {}),
    ]);

    await db.promise().query(
      `UPDATE customer
         SET username = ?,
             first_name = 'Deleted',
             last_name = 'Buyer',
             email = ?,
             phone_number = '0000000000',
             profile_image = NULL,
             password = ?,
             is_private = 1,
             allow_personalized_recommendations = 0
         WHERE customer_id = ?`,
      [anonymizedUsername, anonymizedEmail, unusablePasswordHash, customerId],
    );

    await db
      .promise()
      .query(
        `INSERT INTO account_access (role, account_id, strikes, is_banned, banned_at, ban_reason)
         VALUES ('buyer', ?, 0, TRUE, CURRENT_TIMESTAMP, 'Self-service account erasure under RA 10173')
         ON DUPLICATE KEY UPDATE is_banned = TRUE, banned_at = CURRENT_TIMESTAMP, ban_reason = 'Self-service account erasure under RA 10173'`,
        [customerId],
      )
      .catch(() => {});

    if (customer.profile_image) {
      await deleteFromB2(
        `app-uploads/buyer/uploadProfile/${path.basename(customer.profile_image)}`,
      ).catch(() => {});
    }

    res.clearCookie("buyer_token", clearAuthCookieOptions());

    await logAudit({
      action: "DELETE_ACCOUNT_REQUEST",
      actor: customer.username || customerId,
      role: "Customer",
      status: "SUCCESS",
      information:
        "Buyer permanently anonymized and erased personal account data (RA 10173 Right to Erasure).",
    }).catch(() => {});

    return res.json({
      message:
        "Your account and personal data have been permanently deleted and anonymized.",
    });
  } catch (error) {
    console.error("Buyer account deletion failed:", error);
    return res.status(500).json({
      message: "Unable to complete account deletion at this time.",
    });
  }
});

router.post("/logout", async (req, res) => {
  try {
    res.clearCookie("buyer_token", clearAuthCookieOptions());
    const token =
      req.cookies?.buyer_token ||
      req.headers?.authorization?.replace(/^Bearer\s+/i, "");
    if (token) {
      try {
        const user = jwt.verify(token, getJwtSecret(), {
          algorithms: ["HS256"],
        });
        await logAudit({
          action: "LOGOUT",
          actor: user.username || user.customer_id || "Customer",
          role: "Customer",
          status: "SUCCESS",
          information: "Customer logged out",
        });
      } catch {
        // Token was already expired/invalid
      }
    }
    res.json({ success: true, message: "Logout recorded" });
  } catch (error) {
    res.clearCookie("buyer_token", clearAuthCookieOptions());
    res.json({ success: true, message: "Logged out" });
  }
});

export default router;
