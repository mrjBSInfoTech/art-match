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
import adminStudentRoutes from "./routes/admin/student.js";
import adminCustomerRoutes from "./routes/admin/customer.js";
import adminAuditLogsRoutes from "./routes/admin/auditLogs.js";
import adminAccountAccessRoutes from "./routes/admin/accountAccess.js";
import adminAdminRoutes from "./routes/admin/admin.js";
import aboutContentRoutes from "./routes/aboutContent.js";
import { createAuditLogsTable } from "./utils/auditLogger.js";
import { ensureAccountAccessTable } from "./database/accountAccess.js";
import { ensureChatPublicKeysTable } from "./database/chatKeys.js";
import {
  ensureConversationReadStateTable,
  ensureMessageSenderNameColumn,
} from "./database/message.js";
import { ensureStorefrontTable } from "./database/storefront.js";
import { ensureOrderTables } from "./database/orders.js";
import { ensureBuyerPrivacyColumn } from "./database/buyerPrivacy.js";
import { ensureFavoriteTable } from "./database/favorites.js";
import { ensureArtworkSchema } from "./database/artwork.js";
import { ensureAboutContentTable } from "./database/aboutContent.js";
//import adminSalesRoutes from "./routes/admin/sales.js";
// Routes (Seller)
import sellerArtworkRoutes from "./routes/seller/artwork.js";
import sellerStorefrontRoutes from "./routes/seller/storefront.js";
import sellerOrderRoutes from "./routes/seller/orders.js";
import sellerReviewRoutes from "./routes/seller/reviews.js";
//import sellerSalesRoutes from "./routes/seller/sales.js";
import sellerAuthenticateRoutes from "./routes/seller/sellerAuthenticate.js";
// Routes (Buyer)
import buyerAuthenticateRoutes from "./routes/buyer/buyerAuthenticate.js";
import buyerAddressRoutes from "./routes/buyer/address.js";
import buyerArtworkRoutes from "./routes/buyer/artwork.js";
import buyerCartRoutes from "./routes/buyer/cart.js";
import buyerFavoriteRoutes from "./routes/buyer/favorites.js";
import buyerOrderRoutes from "./routes/buyer/orders.js";
import buyerReviewRoutes from "./routes/buyer/reviews.js";
import buyerRecommendationRoutes from "./routes/buyer/recommendation.js";

// Routes (Chat of both buyer and seller)
import chatRoutes from "./routes/chat.js";

// Backblaze B2
import { getFromB2 } from "./utils/b2Storage.js";

dotenv.config();

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      } else if (!res.headersSent &&
        (error.status === 404 || error.code === "ENOENT" || error.code === "ENOTDIR")) {
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
      if (await sendFileIfPresent(res, path.relative(B2_CACHE_ROOT, cachePath), {
        root: B2_CACHE_ROOT,
      })) return;
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

app.get(
  "/uploads/seller/uploadArtwork/:filename",

  serveB2Cached({
    keyPrefix: "app-uploads/seller/uploadArtwork",

    localFolder: path.join(__dirname, "uploads", "seller", "uploadArtwork"),

    label: "Artwork",

    cacheControl: "public, max-age=86400",
  }),
);

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

// Serve static files with absolute path
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Root route (just to test if server runs)
app.get("/", (req, res) => {
  res.send("Art Match API is running ✅");
});

// Routes (Admin)
app.use("/api/admin/authenticate", adminAuthenticateRoutes);
app.use("/api/admin/artwork", adminArtworkRoutes);
app.use("/api/admin/student", adminStudentRoutes);
app.use("/api/admin/customer", adminCustomerRoutes);
app.use("/api/admin/audit-logs", adminAuditLogsRoutes);
app.use("/api/admin/account-access", adminAccountAccessRoutes);
app.use("/api/admin/admin", adminAdminRoutes);
app.use("/api/about-content", aboutContentRoutes);
//app.use("/api/admin/sales", adminSalesRoutes);
// Routes (Seller)
app.use("/api/seller/authenticate", sellerAuthenticateRoutes);
app.use("/api/seller/artwork", sellerArtworkRoutes);
app.use("/api/seller/storefront", sellerStorefrontRoutes);
app.use("/api/seller/orders", sellerOrderRoutes);
app.use("/api/seller/reviews", sellerReviewRoutes);
//app.use("/api/seller/sales", sellerSalesRoutes);
// Routes (Buyer)
app.use("/api/buyer/authenticate", buyerAuthenticateRoutes);
app.use("/api/buyer/artworks", buyerArtworkRoutes);
app.use("/api/buyer/addresses", buyerAddressRoutes);
app.use("/api/buyer/cart", buyerCartRoutes);
app.use("/api/buyer/favorites", buyerFavoriteRoutes);
app.use("/api/buyer/orders", buyerOrderRoutes);
app.use("/api/buyer/reviews", buyerReviewRoutes);
app.use("/api/buyer/recommendation", buyerRecommendationRoutes);

// Routes (Chat of both buyer and seller)
app.use("/api/chat", chatRoutes);

// Handle 404 (unknown routes)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.status === 404 || err.statusCode === 404) {
    return res.status(404).json({ message: "File not found" });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 5000;
createAuditLogsTable().catch(() => {});
ensureAccountAccessTable();
ensureChatPublicKeysTable();
ensureMessageSenderNameColumn();
ensureBuyerPrivacyColumn()
  .then(() => ensureFavoriteTable())
  .then(() => ensureStorefrontTable())
  .then(() => ensureOrderTables())
  .then(() => ensureArtworkSchema())
  .then(() => ensureAboutContentTable())
  .then(() => ensureConversationReadStateTable())
  .then(() =>
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`)),
  )
  .catch((error) => {
    console.error("Unable to initialize database schema:", error.message);
    process.exit(1);
  });
