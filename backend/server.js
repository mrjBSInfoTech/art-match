import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
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

// Artwork images stored in
// private Backblaze B2.
app.get(
  "/uploads/seller/uploadArtwork/:filename",

  async (req, res, next) => {
    try {
      const fileName = path.basename(req.params.filename);

      const key = `app-uploads/seller/uploadArtwork/${fileName}`;

      const object = await getFromB2(key);

      if (object.ContentType) {
        res.setHeader("Content-Type", object.ContentType);
      }

      res.setHeader("Cache-Control", "public, max-age=3600");

      if (object.Body && typeof object.Body.pipe === "function") {
        object.Body.pipe(res);

        return;
      }

      const bytes = await object.Body.transformToByteArray();

      res.send(Buffer.from(bytes));
    } catch (error) {
      // If B2 does not have this
      // image yet, allow the old
      // local folder to handle it.
      const status = error?.$metadata?.httpStatusCode;

      if (status === 404 || error?.name === "NoSuchKey") {
        return next();
      }

      console.error("B2 artwork download error:", error.message);

      return next();
    }
  },
);

// Seller profile images stored
// in private Backblaze B2.
//
// Support BOTH URLs because older frontend
// pages use /profile while newer pages
// use /uploadProfile.
app.get(
  [
    "/uploads/seller/uploadProfile/:filename",
    "/uploads/seller/profile/:filename",
  ],

  async (req, res, next) => {
    try {
      const fileName = path.basename(req.params.filename);

      // Actual B2 folder name
      const key = `app-uploads/seller/uploadProfile/${fileName}`;

      const object = await getFromB2(key);

      if (object.ContentType) {
        res.setHeader("Content-Type", object.ContentType);
      }

      res.setHeader("Cache-Control", "public, max-age=3600");

      if (object.Body && typeof object.Body.pipe === "function") {
        object.Body.pipe(res);
        return;
      }

      const bytes = await object.Body.transformToByteArray();

      res.send(Buffer.from(bytes));
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;

      if (status === 404 || error?.name === "NoSuchKey") {
        return next();
      }

      console.error("B2 seller profile download error:", error.message);

      return next();
    }
  },
);

// Match the seller profile storage flow while preserving existing buyer URLs.
app.get(
  [
    "/uploads/buyer/uploadProfile/:filename",
    "/uploads/buyer/profile/:filename",
  ],
  async (req, res, next) => {
    try {
      const filename = path.basename(req.params.filename);
      let object;
      try {
        object = await getFromB2(`app-uploads/buyer/uploadProfile/${filename}`);
      } catch (error) {
        if (
          error?.$metadata?.httpStatusCode !== 404 &&
          error?.name !== "NoSuchKey"
        )
          throw error;
        object = await getFromB2(`app-uploads/buyer/profile/${filename}`);
      }
      if (object.ContentType) res.setHeader("Content-Type", object.ContentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      if (object.Body && typeof object.Body.pipe === "function") {
        object.Body.pipe(res);
        return;
      }
      res.send(Buffer.from(await object.Body.transformToByteArray()));
    } catch (error) {
      if (
        error?.$metadata?.httpStatusCode !== 404 &&
        error?.name !== "NoSuchKey"
      ) {
        console.error("B2 buyer profile download error:", error.message);
      }
      next();
    }
  },
);

// Keep older buyer image URLs working with the renamed uploadProfile folder.
app.use(
  "/uploads/buyer/profile",
  express.static(path.join(__dirname, "uploads", "buyer", "uploadProfile")),
);

// Buyer profile images stored
// in private Backblaze B2.
//
// Support BOTH URLs because the
// frontend currently uses /profile,
// while the real folder is uploadProfile.
app.get(
  [
    "/uploads/buyer/uploadProfile/:filename",
    "/uploads/buyer/profile/:filename",
  ],

  async (req, res, next) => {
    try {
      const fileName = path.basename(req.params.filename);

      const key = `app-uploads/buyer/uploadProfile/${fileName}`;

      const object = await getFromB2(key);

      if (object.ContentType) {
        res.setHeader("Content-Type", object.ContentType);
      }

      res.setHeader("Cache-Control", "public, max-age=3600");

      if (object.Body && typeof object.Body.pipe === "function") {
        object.Body.pipe(res);
        return;
      }

      const bytes = await object.Body.transformToByteArray();

      res.send(Buffer.from(bytes));
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;

      if (status === 404 || error?.name === "NoSuchKey") {
        return next();
      }

      console.error("B2 buyer profile download error:", error.message);

      return next();
    }
  },
);

// Admin profile images stored
// in private Backblaze B2.
app.get(
  "/uploads/admin/uploadAdmin/:filename",

  async (req, res, next) => {
    try {
      const fileName =
        path.basename(
          req.params.filename,
        );

      const key =
        `app-uploads/admin/uploadAdmin/${fileName}`;

      const object =
        await getFromB2(key);

      if (object.ContentType) {
        res.setHeader(
          "Content-Type",
          object.ContentType,
        );
      }

      res.setHeader(
        "Cache-Control",
        "private, max-age=3600",
      );

      if (
        object.Body &&
        typeof object.Body.pipe ===
          "function"
      ) {
        object.Body.pipe(res);
        return;
      }

      const bytes =
        await object.Body
          .transformToByteArray();

      res.send(
        Buffer.from(bytes),
      );
    } catch (error) {
      const status =
        error?.$metadata
          ?.httpStatusCode;

      if (
        status === 404 ||
        error?.name ===
          "NoSuchKey"
      ) {
        return next();
      }

      console.error(
        "B2 admin profile download error:",
        error.message,
      );

      return next();
    }
  },
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
  .then(() => ensureConversationReadStateTable())
  .then(() =>
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`)),
  )
  .catch((error) => {
    console.error("Unable to initialize database schema:", error.message);
    process.exit(1);
  });
