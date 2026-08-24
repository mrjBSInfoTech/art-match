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
import { createAuditLogsTable } from "./utils/auditLogger.js";
//import adminSalesRoutes from "./routes/admin/sales.js";
// Routes (Seller)
import sellerArtworkRoutes from "./routes/seller/artwork.js";
//import sellerSalesRoutes from "./routes/seller/sales.js";
import sellerAuthenticateRoutes from "./routes/seller/sellerAuthenticate.js";
// Routes (Buyer)
//import buyerArtworkRoutes from "./routes/buyer/artwork.js";
import buyerAuthenticateRoutes from "./routes/buyer/buyerAuthenticate.js";
import buyerAddressRoutes from "./routes/buyer/address.js";
import buyerArtworkRoutes from "./routes/buyer/artwork.js";
import buyerCartRoutes from "./routes/buyer/cart.js";

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
//app.use("/api/admin/sales", adminSalesRoutes);
// Routes (Seller)
app.use("/api/seller/authenticate", sellerAuthenticateRoutes);
app.use("/api/seller/artwork", sellerArtworkRoutes);
//app.use("/api/seller/sales", sellerSalesRoutes);
// Routes (Buyer)
app.use("/api/buyer/authenticate", buyerAuthenticateRoutes);
app.use("/api/buyer/artworks", buyerArtworkRoutes);
app.use("/api/buyer/addresses", buyerAddressRoutes);
app.use("/api/buyer/cart", buyerCartRoutes);

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
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
