import express from "express";
import bcrypt from "bcryptjs";
import db from "../database/db.js";
import {
  getAboutContent,
  saveAboutContent,
} from "../database/aboutContent.js";
import { authenticateAdmin } from "../middleware/adminAuthMiddleware.js";
import { requireAdminPermission } from "../middleware/adminPermissionMiddleware.js";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();
const textFields = ["collegeName", "tagline", "introduction", "vision", "mission", "history"];

function validateContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return "About page content must be an object.";
  }

  for (const field of textFields) {
    if (
      typeof content[field] !== "string" ||
      !content[field].trim() ||
      content[field].trim().length > 10000
    ) {
      return `${field} is required and must be no longer than 10,000 characters.`;
    }
  }

  for (const field of ["goals", "objectives"]) {
    if (
      !Array.isArray(content[field]) ||
      content[field].length < 1 ||
      content[field].length > 50 ||
      content[field].some(
        (item) =>
          typeof item !== "string" ||
          !item.trim() ||
          item.trim().length > 2000,
      )
    ) {
      return `${field} must contain at least one non-empty entry, with no more than 50 entries of up to 2,000 characters each.`;
    }
  }

  for (const field of ["offerings", "contacts"]) {
    const keys = field === "offerings" ? ["title", "description"] : ["label", "value"];
    if (
      !Array.isArray(content[field]) ||
      (field === "offerings" && content[field].length < 1) ||
      content[field].length > 50 ||
      content[field].some((item) =>
        !item ||
        keys.some(
          (key) =>
            typeof item[key] !== "string" ||
            !item[key].trim() ||
            item[key].trim().length > 2000,
        ),
      )
    ) {
      return `${field} must contain valid, non-empty fields${field === "offerings" ? " and at least one entry" : ""}.`;
    }
  }

  return null;
}

router.get("/", async (req, res) => {
  try {
    res.json(await getAboutContent());
  } catch (error) {
    console.error("Unable to load About page content:", error.message);
    res.status(500).json({ message: "Unable to load About page content." });
  }
});

router.put("/", authenticateAdmin, requireAdminPermission("can_edit"), async (req, res) => {
  const { password } = req.body;
  if (typeof password !== "string" || !password) {
    return res.status(400).json({ message: "Admin password is required to save changes." });
  }

  const validationError = validateContent(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  let admin;
  try {
    admin = await new Promise((resolve, reject) => {
      db.query(
        "SELECT password FROM admin WHERE admin_id = ?",
        [req.user.admin_id],
        (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        },
      );
    });
  } catch (error) {
    console.error("Unable to verify admin password for About page update:", error.message);
    return res.status(500).json({ message: "Unable to verify admin password." });
  }

  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    try {
      await logAudit({
        action: "UPDATE_ABOUT_PAGE_CONTENT",
        actor: req.user.username || req.user.admin_id,
        role: req.user.role || "Admin",
        status: "FAILED",
        information: "About page update rejected: incorrect password confirmation.",
      });
    } catch (error) {
      console.error("Unable to record failed About page update:", error.message);
    }
    return res.status(401).json({ message: "Incorrect admin password." });
  }

  const content = Object.fromEntries(
    textFields.map((field) => [field, req.body[field].trim()]),
  );
  content.goals = req.body.goals.map((goal) => goal.trim());
  content.objectives = req.body.objectives.map((objective) => objective.trim());
  content.offerings = req.body.offerings.map(({ title, description }) => ({
    title: title.trim(),
    description: description.trim(),
  }));
  content.contacts = req.body.contacts.map(({ label, value }) => ({
    label: label.trim(),
    value: value.trim(),
  }));

  try {
    await saveAboutContent(content);
  } catch (error) {
    console.error("Unable to save About page content:", error.message);
    return res.status(500).json({ message: "Unable to save About page content." });
  }

  try {
    await logAudit({
      action: "UPDATE_ABOUT_PAGE_CONTENT",
      actor: req.user.username || req.user.admin_id,
      role: req.user.role || "Admin",
      status: "SUCCESS",
      information: `About page content updated (college: ${content.collegeName}; goals: ${content.goals.length}; objectives: ${content.objectives.length}; offerings: ${content.offerings.length}; contacts: ${content.contacts.length}).`,
    });
    res.json({ message: "About page content saved.", content });
  } catch (error) {
    console.error("About page content was saved but audit logging failed:", error.message);
    res.status(500).json({
      message: "About page content was saved, but the audit log could not be recorded. Contact a system administrator.",
      contentSaved: true,
    });
  }
});

export default router;
