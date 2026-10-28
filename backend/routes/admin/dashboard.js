import express from "express";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { getAdminDashboard } from "../../utils/adminDashboard.js";

const router = express.Router();
router.get("/", authenticateAdmin, async (_req, res) => {
  res.set("Cache-Control", "no-store");
  try { return res.json(await getAdminDashboard()); }
  catch (error) {
    console.error("Admin dashboard query failed:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load dashboard statistics." });
  }
});
export default router;
