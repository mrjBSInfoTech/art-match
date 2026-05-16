import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";

// Routes
import aboutRoutes from "./routes/about.js";
import officialAccountRoutes from "./routes/officialAccount.js";
import announcementRoutes from "./routes/announcement.js";
import fileRoutes from "./routes/file.js";
import citizenRoutes from "./routes/citizen.js";
import concernRoutes from "./routes/concern.js";
import messageDetectionRoutes from "./routes/messageDetection.js";
import residentRoutes from "./routes/resident.js";
import officialRoutes from "./routes/official.js";
import historyRoutes from "./routes/history.js";
import authRoutes from "./routes/authentication.js";
import householdRoutes from "./routes/household.js";
import loginRoutes from "./routes/login.js";
import postRoutes from "./routes/post.js";

dotenv.config();

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files with absolute path
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route (just to test if server runs)
app.get("/", (req, res) => {
  res.send("Product Management API is running ✅");
});

// Routes
app.use("/api/about", aboutRoutes);
app.use("/api/officialAccounts", officialAccountRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/citizens", citizenRoutes);
app.use("/api/concerns", concernRoutes);
app.use("/api/messageDetection", messageDetectionRoutes);
app.use("/api/residents", residentRoutes);
app.use("/api/households", householdRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/officials", officialRoutes);
app.use("/api/post", postRoutes);
app.use("/api/login", loginRoutes);
app.use("/api/authentication", authRoutes);


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
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
