import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
// Routes (Admin)
import adminAuthenticateRoutes from "./routes/admin/adminAuthentication.js";
import adminArtworkRoutes from "./routes/admin/artwork.js";
import adminEventRoutes from "./routes/admin/event.js";
import adminPromotionSlideRoutes from "./routes/admin/promotionSlides.js";
import adminStudentRoutes from "./routes/admin/student.js";
import adminCustomerRoutes from "./routes/admin/customer.js";
import adminAuditLogsRoutes from "./routes/admin/auditLogs.js";
import adminAccountAccessRoutes from "./routes/admin/accountAccess.js";
import adminAdminRoutes from "./routes/admin/admin.js";
import adminSystemSettingsRoutes from "./routes/admin/systemSettings.js";
import adminPayoutRoutes from "./routes/admin/payouts.js";
import adminDashboardRoutes from "./routes/admin/dashboard.js";
import sellerPayoutAccountRoutes from "./routes/seller/payouts.js";
import { ensurePayoutTables } from "./database/payouts.js";
import aboutContentRoutes from "./routes/aboutContent.js";
import { createAuditLogsTable } from "./utils/auditLogger.js";
import { ensureAccountAccessTable } from "./database/accountAccess.js";
import {
  ensureChatKeyRecoveryTable,
  ensureChatPublicKeysTable,
} from "./database/chatKeys.js";
import {
  ensureConversationReadStateTable,
  ensureMessageSenderNameColumn,
} from "./database/message.js";
import { ensureEventsTable } from "./database/events.js";
import { ensurePromotionSlidesTable } from "./database/promotionSlides.js";
import { ensurePromotionHeaderRequestsTable } from "./database/promotionHeaderRequests.js";
import { ensureStorefrontTable } from "./database/storefront.js";
import { ensureVoucherTables } from "./database/vouchers.js";
import { ensureOrderTables } from "./database/orders.js";
import { ensureReturnTables } from "./database/returns.js";
import { ensureCertificateTables } from "./database/certificates.js";
import { startCertificateDeliveryScheduler } from "./utils/certificates.js";
import { ensureStudentAccountSchema } from "./database/student.js";
import { ensureSystemSettingsTable } from "./database/systemSettings.js";
import { ensurePaymentSplitTable } from "./database/paymentSplits.js";
import { ensureBuyerPrivacyColumn } from "./database/buyerPrivacy.js";
import { ensureFavoriteTable } from "./database/favorites.js";
import { ensureArtistFollowTable } from "./database/artistFollows.js";
import { ensureArtworkSchema } from "./database/artwork.js";
import { ensureArtworkWatermarkTables } from "./database/artworkWatermarks.js";
import { ensureAboutContentTable } from "./database/aboutContent.js";
import { ensureFaqTable } from "./database/faq.js";
import { ensureSupportChatTables } from "./database/supportChat.js";
import buyerFaqRoutes from "./routes/buyer/faq.js";
import supportChatRoutes from "./routes/supportChat.js";
import { authenticateBuyer } from "./middleware/buyerAuthMiddleware.js";
import {
  getCustomerIdForWatermarkCode,
  getWatermarkCode,
  getWatermarkedArtwork,
} from "./utils/artworkWatermark.js";
import {
  ARTWORK_IMAGE_URL_TTL_SECONDS,
  signArtworkImageUrl,
  verifyArtworkImageUrl,
} from "./utils/artworkImageSignature.js";
import {
  DEFAULT_ARTWORK_VARIANT,
  isArtworkVariant,
} from "./utils/artworkDerivatives.js";
import {
  artworkImageRateLimit,
  recordArtworkDenied,
} from "./middleware/artworkRateLimit.js";
import { ensureArtworkDerivatives } from "./utils/artworkDerivativeBackfill.js";
//import adminSalesRoutes from "./routes/admin/sales.js";
// Routes (Seller)
import sellerArtworkRoutes from "./routes/seller/artwork.js";
import sellerStorefrontRoutes from "./routes/seller/storefront.js";
import sellerPromotionSlideRoutes from "./routes/seller/promotionSlides.js";
import sellerVoucherRoutes from "./routes/seller/vouchers.js";
import sellerOrderRoutes from "./routes/seller/orders.js";
import sellerReturnRoutes from "./routes/seller/returns.js";
import sellerCertificateRoutes from "./routes/seller/certificates.js";
import sellerReviewRoutes from "./routes/seller/reviews.js";
//import sellerSalesRoutes from "./routes/seller/sales.js";
import sellerAuthenticateRoutes from "./routes/seller/sellerAuthenticate.js";
import sellerAuditLogsRoutes from "./routes/seller/auditLogs.js";
// Routes (Buyer)
import buyerAuthenticateRoutes from "./routes/buyer/buyerAuthenticate.js";
import buyerAddressRoutes from "./routes/buyer/address.js";
import buyerArtworkRoutes from "./routes/buyer/artwork.js";
import buyerArtistRoutes from "./routes/buyer/artists.js";
import buyerEventRoutes from "./routes/buyer/event.js";
import buyerPromotionSlideRoutes from "./routes/buyer/promotionSlides.js";
import buyerCartRoutes from "./routes/buyer/cart.js";
import buyerFavoriteRoutes from "./routes/buyer/favorites.js";
import buyerOrderRoutes from "./routes/buyer/orders.js";
import buyerReturnRoutes from "./routes/buyer/returns.js";
import buyerCertificateRoutes from "./routes/buyer/certificates.js";
import buyerReviewRoutes from "./routes/buyer/reviews.js";
import buyerRecommendationRoutes from "./routes/buyer/recommendation.js";

// Routes (Payments)
import paymongoPaymentRoutes from "./routes/payments/paymongo.js";
import { assertPayoutProviderConfiguration } from "./utils/payoutProvider.js";

// Routes (Chat of both buyer and seller)
import chatRoutes from "./routes/chat.js";

// Backblaze B2
import { getFromB2 } from "./utils/b2Storage.js";

dotenv.config();
assertPayoutProviderConfiguration();

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(
  express.json({
    verify: (req, res, buffer) => {
      /*
       * PayMongo signature verification
       * needs the EXACT raw JSON body.
       */
      if (req.originalUrl.startsWith("/api/payments/paymongo/webhook")) {
        req.rawBody = Buffer.from(buffer);
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use("/api/admin/payouts", adminPayoutRoutes);
app.use("/api/seller/payout-account", sellerPayoutAccountRoutes);

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, "uploads/seller/"),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// =====================================================
// Backblaze B2 local disk cache
// =====================================================

const B2_CACHE_ROOT = path.join(__dirname, ".cache", "b2");

fs.mkdirSync(B2_CACHE_ROOT, {
  recursive: true,
});

/*
 * Prevent several simultaneous requests
 * for the same uncached B2 object from
 * downloading the same file repeatedly.
 */
const b2InFlight = new Map();

/*
 * If the B2 download cap has been reached,
 * temporarily stop hammering B2 on every
 * image request.
 */
let b2DownloadBlockedUntil = 0;

const B2_CAP_COOLDOWN_MS = 15 * 60 * 1000;

const isB2CapError = (error) => {
  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("cap exceeded") ||
    message.includes("transaction (class b) cap") ||
    message.includes("download bandwidth")
  );
};

const getCachePath = (key) => {
  const parts = key
    .split("/")
    .filter(Boolean)
    .map((part) => path.basename(part));

  return path.join(B2_CACHE_ROOT, ...parts);
};

const bodyToBuffer = async (body) => {
  if (!body) {
    throw new Error("B2 returned an empty file body.");
  }

  if (typeof body.transformToByteArray === "function") {
    const bytes = await body.transformToByteArray();

    return Buffer.from(bytes);
  }

  const chunks = [];

  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

/*
 * Download one B2 object and store it
 * in the local cache.
 *
 * Multiple simultaneous requests for
 * the same key share the same download.
 */
const downloadAndCacheB2 = async (key, cachePath) => {
  if (b2InFlight.has(key)) {
    return b2InFlight.get(key);
  }

  const operation = (async () => {
    const object = await getFromB2(key);

    const body = await bodyToBuffer(object.Body);

    await fs.promises.mkdir(path.dirname(cachePath), {
      recursive: true,
    });

    await fs.promises.writeFile(cachePath, body);

    return {
      body,
      contentType: object.ContentType || null,
    };
  })();

  b2InFlight.set(key, operation);

  try {
    return await operation;
  } finally {
    b2InFlight.delete(key);
  }
};

/*
 * Creates a normal Express middleware
 * for cached private B2 objects.
 */
const sendFileIfPresent = (res, filePath, options = {}) =>
  new Promise((resolve, reject) => {
    res.sendFile(filePath, options, (error) => {
      if (!error || res.destroyed || error.code === "ECONNABORTED") {
        resolve(true);
      } else if (
        !res.headersSent &&
        (error.status === 404 ||
          error.code === "ENOENT" ||
          error.code === "ENOTDIR")
      ) {
        resolve(false);
      } else {
        reject(error);
      }
    });
  });

const serveB2Cached =
  ({
    keyPrefix,
    localFolder,
    label,
    cacheControl = "private, max-age=86400",
  }) =>
  async (req, res, next) => {
    const fileName = path.basename(req.params.filename);

    const key = `${keyPrefix}/${fileName}`;

    const cachePath = getCachePath(key);

    /*
     * 1. Already cached locally.
     *
     * No B2 request required.
     */
    if (fs.existsSync(cachePath)) {
      res.setHeader("Cache-Control", cacheControl);

      res.setHeader("X-ArtMatch-Storage", "cache");

      // A relative path keeps the trusted .cache root out of Express's
      // hidden-file check, while hidden files within the cache stay blocked.
      if (
        await sendFileIfPresent(res, path.relative(B2_CACHE_ROOT, cachePath), {
          root: B2_CACHE_ROOT,
        })
      )
        return;
    }

    /*
     * 2. Check whether an old local
     * copy still exists.
     *
     * This is useful for files migrated
     * to B2 but intentionally not deleted
     * from the old uploads folder.
     */
    if (localFolder) {
      const localPath = path.join(localFolder, fileName);

      if (fs.existsSync(localPath)) {
        try {
          await fs.promises.mkdir(path.dirname(cachePath), {
            recursive: true,
          });

          await fs.promises.copyFile(localPath, cachePath);

          console.log(`${label} cached from old local copy:`, fileName);
        } catch (cacheError) {
          console.warn(`${label} local cache copy failed:`, cacheError.message);
        }

        res.setHeader("Cache-Control", cacheControl);

        res.setHeader("X-ArtMatch-Storage", "local");

        if (await sendFileIfPresent(res, localPath)) return;
      }
    }

    /*
     * 3. If we recently detected the
     * B2 cap, don't repeatedly send
     * doomed requests during the cooldown.
     */
    if (Date.now() < b2DownloadBlockedUntil) {
      return next();
    }

    /*
     * 4. Not available locally.
     * Download it from B2 once.
     */
    try {
      const result = await downloadAndCacheB2(key, cachePath);

      if (result.contentType) {
        res.setHeader("Content-Type", result.contentType);
      }

      res.setHeader("Cache-Control", cacheControl);

      res.setHeader("X-ArtMatch-Storage", "b2");

      console.log(`${label} downloaded and cached:`, key);

      return res.send(result.body);
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;

      if (status === 404 || error?.name === "NoSuchKey") {
        return next();
      }

      if (isB2CapError(error)) {
        const wasAlreadyBlocked = Date.now() < b2DownloadBlockedUntil;

        b2DownloadBlockedUntil = Math.max(
          b2DownloadBlockedUntil,
          Date.now() + B2_CAP_COOLDOWN_MS,
        );

        /*
         * Only print the warning once.
         * Other image requests may already
         * have been in flight when the cap
         * was detected.
         */
        if (!wasAlreadyBlocked) {
          console.error("");
          console.error("⚠️ B2 download cap is currently exceeded.");

          console.error("B2 downloads are temporarily paused for 15 minutes.");

          console.error("Cached/local images will continue working.");

          console.error("");
        }

        return next();
      }

      console.error(`${label} B2 download error:`, error.message);

      return next();
    }
  };

// =====================================================
// Artwork images
// =====================================================

const optionalBuyerAuthentication = (req, res, next) => {
  if (!req.headers.authorization) return next();
  authenticateBuyer(req, res, next);
};

// Only the low-res derivatives are ever published. The original stays private:
// it is never signed, never sent, and never named in a response.
app.get(
  "/api/artwork-image-url/:filename",
  artworkImageRateLimit,
  optionalBuyerAuthentication,
  async (req, res) => {
    const filename = req.params.filename;
    const variant = req.query.variant || DEFAULT_ARTWORK_VARIANT;
    if (
      !filename ||
      path.basename(filename) !== filename ||
      !isArtworkVariant(variant)
    ) {
      return res.status(400).json({ message: "Invalid artwork image." });
    }

    const code = req.user?.customer_id
      ? await getWatermarkCode(req.user.customer_id)
      : "GUEST";
    const expiresAt =
      Math.floor(Date.now() / 1000) + ARTWORK_IMAGE_URL_TTL_SECONDS;
    const signature = signArtworkImageUrl(filename, code, expiresAt, { variant });
    const imageUrl = new URL(
      `/api/artwork-images/${encodeURIComponent(filename)}`,
      "http://artmatch.invalid",
    );
    imageUrl.searchParams.set("variant", variant);
    imageUrl.searchParams.set("expires", String(expiresAt));
    imageUrl.searchParams.set("code", code);
    imageUrl.searchParams.set("signature", signature);

    res.set("Cache-Control", "no-store");
    res.json({ url: `${imageUrl.pathname}${imageUrl.search}`, variant });
  },
);

app.get(
  "/api/artwork-images/:filename",
  artworkImageRateLimit,
  async (req, res, next) => {
    const filename = req.params.filename;
    const { expires, code, signature } = req.query;
    const variant = req.query.variant || DEFAULT_ARTWORK_VARIANT;
    if (
      !filename ||
      path.basename(filename) !== filename ||
      !verifyArtworkImageUrl(filename, code, expires, signature, { variant })
    ) {
      await recordArtworkDenied(req);
      return res.status(403).json({ message: "Invalid or expired image URL." });
    }

    try {
      const customerId =
        code === "GUEST" ? null : await getCustomerIdForWatermarkCode(code);
      if (code !== "GUEST" && !customerId) {
        await recordArtworkDenied(req);
        return res.status(403).json({ message: "Invalid or expired image URL." });
      }

      const image = await getWatermarkedArtwork(filename, customerId, variant);

      res.set({
        "Cache-Control": `private, max-age=${Math.max(
          0,
          Math.min(180, Number(expires) - Math.floor(Date.now() / 1000)),
        )}`,
        "Content-Type": image.contentType,
        Vary: "Authorization",
        "X-ArtMatch-Watermark-Code": image.code,
        "X-ArtMatch-Invisible-Watermark": "DCT-8x8-v1",
        "X-ArtMatch-Variant": variant,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      });
      return res.send(image.body);
    } catch (error) {
      // Never echo storage details or file paths to the browser.
      if (error.status === 404) {
        return res.status(404).json({ message: "Artwork image not found." });
      }
      return next(error);
    }
  },
);

// Legacy path kept as a signing oracle only: it never returns image bytes, so
// the raw upload directory is not a public file server.
app.get("/uploads/seller/uploadArtwork/:filename", artworkImageRateLimit, (req, res) => {
  const filename = req.params.filename;
  if (!filename || path.basename(filename) !== filename) {
    return res.status(404).json({ message: "Artwork image not found." });
  }
  return res.status(404).json({ message: "Artwork image not found." });
});

// =====================================================
// Seller profile images
// =====================================================

app.get(
  [
    "/uploads/seller/uploadProfile/:filename",
    "/uploads/seller/profile/:filename",
  ],

  serveB2Cached({
    keyPrefix: "app-uploads/seller/uploadProfile",

    localFolder: path.join(__dirname, "uploads", "seller", "uploadProfile"),

    label: "Seller profile",
  }),
);

// =====================================================
// Buyer profile images
// =====================================================

app.get(
  [
    "/uploads/buyer/uploadProfile/:filename",
    "/uploads/buyer/profile/:filename",
  ],

  serveB2Cached({
    keyPrefix: "app-uploads/buyer/uploadProfile",

    localFolder: path.join(__dirname, "uploads", "buyer", "uploadProfile"),

    label: "Buyer profile",
  }),
);

// =====================================================
// Admin profile images
// =====================================================

app.get(
  "/uploads/admin/uploadAdmin/:filename",

  serveB2Cached({
    keyPrefix: "app-uploads/admin/uploadAdmin",

    localFolder: path.join(__dirname, "uploads", "admin", "uploadAdmin"),

    label: "Admin profile",
  }),
);

// =====================================================
// Event images
// =====================================================

app.get(
  "/uploads/admin/events/:filename",

  serveB2Cached({
    keyPrefix: "app-uploads/admin/events",

    localFolder: path.join(__dirname, "uploads", "admin", "events"),

    label: "Event image",
  }),
);

// =====================================================
// Promotion slide images
// =====================================================

app.get(
  "/uploads/admin/promotion-slides/:filename",

  serveB2Cached({
    keyPrefix: "app-uploads/admin/promotion-slides",

    localFolder: path.join(__dirname, "uploads", "admin", "promotion-slides"),

    label: "Promotion slide",
  }),
);

// =====================================================
// Chat attachments
// =====================================================

app.get(
  "/uploads/chat/:filename",

  serveB2Cached({
    keyPrefix: "app-uploads/chat",

    localFolder: path.join(__dirname, "uploads", "chat"),

    label: "Chat attachment",
  }),
);

// Serve static files with absolute path.
// The artwork directory is excluded: originals live there and must never be
// reachable without a signed, rate-limited request.
const artworkUploadFolder = path.join(__dirname, "uploads", "seller", "uploadArtwork");
app.use(
  "/uploads",
  (req, res, next) =>
    req.path.startsWith("/seller/uploadArtwork")
      ? res.status(404).json({ message: "Artwork image not found." })
      : next(),
  express.static(path.join(__dirname, "uploads")),
);

// Root route (just to test if server runs)
app.get("/", (req, res) => {
  res.send("Art Match API is running ✅");
});

// Routes (Admin)
app.use("/api/admin/authenticate", adminAuthenticateRoutes);
app.use("/api/admin/artwork", adminArtworkRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/event", adminEventRoutes);
app.use("/api/admin/promotion-slides", adminPromotionSlideRoutes);
app.use("/api/admin/student", adminStudentRoutes);
app.use("/api/admin/customer", adminCustomerRoutes);
app.use("/api/admin/audit-logs", adminAuditLogsRoutes);
app.use("/api/admin/account-access", adminAccountAccessRoutes);
app.use("/api/admin/admin", adminAdminRoutes);
app.use("/api/admin/system-settings", adminSystemSettingsRoutes);
app.use("/api/about-content", aboutContentRoutes);
//app.use("/api/admin/sales", adminSalesRoutes);
// Routes (Seller)
app.use("/api/seller/authenticate", sellerAuthenticateRoutes);
app.use("/api/seller/audit-logs", sellerAuditLogsRoutes);
app.use("/api/seller/artwork", sellerArtworkRoutes);
app.use("/api/seller/storefront", sellerStorefrontRoutes);
app.use("/api/seller/promotion-slides", sellerPromotionSlideRoutes);
app.use("/api/seller/vouchers", sellerVoucherRoutes);
app.use("/api/seller/orders", sellerOrderRoutes);
app.use("/api/seller/returns", sellerReturnRoutes);
app.use("/api/seller/certificates", sellerCertificateRoutes);
app.use("/api/seller/reviews", sellerReviewRoutes);
//app.use("/api/seller/sales", sellerSalesRoutes);
// Routes (Buyer)
app.use("/api/buyer/authenticate", buyerAuthenticateRoutes);
app.use("/api/buyer/artworks", buyerArtworkRoutes);
app.use("/api/buyer/artists", buyerArtistRoutes);
app.use("/api/buyer/addresses", buyerAddressRoutes);
app.use("/api/buyer/event", buyerEventRoutes);
app.use("/api/buyer/promotion-slides", buyerPromotionSlideRoutes);
app.use("/api/buyer/cart", buyerCartRoutes);
app.use("/api/buyer/favorites", buyerFavoriteRoutes);
app.use("/api/buyer/orders", buyerOrderRoutes);
app.use("/api/buyer/returns", buyerReturnRoutes);
app.use("/api/buyer/certificates", buyerCertificateRoutes);
app.use("/api/buyer/reviews", buyerReviewRoutes);
app.use("/api/buyer/recommendation", buyerRecommendationRoutes);
app.use("/api/buyer/faqs", buyerFaqRoutes);

// Routes (Payments)
app.use("/api/payments/paymongo", paymongoPaymentRoutes);

// Routes (Chat of both buyer and seller)
app.use("/api/chat", chatRoutes);

// Routes (Buyer <-> admin support chat)
app.use("/api/support-chat", supportChatRoutes);

// Handle 404 (unknown routes)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON request body" });
  }
  if (err.status === 404 || err.statusCode === 404) {
    return res.status(404).json({ message: "File not found" });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 5000;
createAuditLogsTable().catch(() => {});
ensureAccountAccessTable()
  .then(() => ensureBuyerPrivacyColumn())
  .then(() => ensureFavoriteTable())
  .then(() => ensureStorefrontTable())
  .then(() => ensureOrderTables())
  .then(() => ensureArtworkSchema())
  .then(() => ensureVoucherTables())
  .then(() => ensureStudentAccountSchema())
  .then(() => ensureArtistFollowTable())
  .then(() => ensureSystemSettingsTable())
  .then(() => ensurePaymentSplitTable())
  .then(() => ensureArtworkWatermarkTables())
  .then(() => ensureAboutContentTable())
  .then(() => ensureFaqTable())
  .then(() => ensureSupportChatTables())
  .then(() => ensureEventsTable())
  .then(() => ensurePromotionSlidesTable())
  .then(() => ensurePromotionHeaderRequestsTable())
  .then(() => ensureConversationReadStateTable())
  .then(() => ensureReturnTables())
  .then(() => ensurePayoutTables())
  .then(() => ensureMessageSenderNameColumn())
  .then(() => ensureCertificateTables())
  .then(() => ensureChatPublicKeysTable())
  .then(() => ensureChatKeyRecoveryTable())
  .then(
    () =>
      new Promise((resolve) => {
        const server = app.listen(PORT, () => {
          console.log(`✅ Server running on port ${PORT}`);
          resolve(server);
        });
      }),
  )
  .then(() => {
    startCertificateDeliveryScheduler();
    // Background: generate the low-res public files for older artworks.
    // Never blocks startup and never rejects.
    ensureArtworkDerivatives({ logger: console }).catch((error) =>
      console.error("Artwork derivative backfill error:", error.message),
    );
  })
  .catch((error) => {
    console.error("Unable to initialize database schema:", error.message);
    process.exit(1);
  });
