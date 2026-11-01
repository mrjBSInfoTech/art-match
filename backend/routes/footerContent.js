import express from "express";
import bcrypt from "bcryptjs";
import db from "../database/db.js";
import { getFooterContent, saveFooterContent } from "../database/footerContent.js";
import { authenticateAdmin } from "../middleware/adminAuthMiddleware.js";
import { requireAdminPermission } from "../middleware/adminPermissionMiddleware.js";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();
const socialPlatforms = ["Twitter", "Facebook", "Instagram", "LinkedIn", "YouTube"];

function isValidLinkUrl(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 2000) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  return isValidExternalUrl(value);
}

function isValidExternalUrl(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 2000) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validateFooterContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return "Footer content must be an object.";
  }

  for (const [field, maxLength] of [
    ["brandName", 120],
    ["description", 2000],
    ["copyright", 500],
  ]) {
    if (
      typeof content[field] !== "string" ||
      !content[field].trim() ||
      content[field].trim().length > maxLength
    ) {
      return `${field} is required and must be no longer than ${maxLength} characters.`;
    }
  }

  if (!Array.isArray(content.columns) || content.columns.length > 6) {
    return "Footer must have no more than 6 link columns.";
  }
  for (const column of content.columns) {
    if (
      !column ||
      typeof column.title !== "string" ||
      !column.title.trim() ||
      column.title.trim().length > 120 ||
      !Array.isArray(column.links) ||
      column.links.length > 20
    ) {
      return "Each footer column needs a title and no more than 20 links.";
    }
    for (const link of column.links) {
      if (
        !link ||
        typeof link.label !== "string" ||
        !link.label.trim() ||
        link.label.trim().length > 120 ||
        !isValidLinkUrl(link.url)
      ) {
        return "Footer links need a label and a valid internal or HTTP(S) URL.";
      }
    }
  }

  if (!Array.isArray(content.socials) || content.socials.length > 10) {
    return "Footer must have no more than 10 social links.";
  }
  for (const social of content.socials) {
    if (
      !social ||
      !socialPlatforms.includes(social.platform) ||
      (social.url !== "" && !isValidExternalUrl(social.url))
    ) {
      return "Social links must use a supported platform and a valid HTTP(S) URL.";
    }
  }
  return null;
}

router.get("/", async (_req, res) => {
  try {
    res.json(await getFooterContent());
  } catch (error) {
    console.error("Unable to load footer content:", error.message);
    res.status(500).json({ message: "Unable to load footer content." });
  }
});

router.put("/", authenticateAdmin, requireAdminPermission("can_edit"), async (req, res) => {
  const { password } = req.body;
  if (typeof password !== "string" || !password) {
    return res.status(400).json({ message: "Admin password is required to save changes." });
  }

  const validationError = validateFooterContent(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

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
    console.error("Unable to verify admin password for footer update:", error.message);
    return res.status(500).json({ message: "Unable to verify admin password." });
  }

  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    try {
      await logAudit({
        action: "UPDATE_FOOTER_CONTENT",
        actor: req.user.username || req.user.admin_id,
        role: req.user.role || "Admin",
        status: "FAILED",
        information: "Footer update rejected: incorrect password confirmation.",
      });
    } catch (error) {
      console.error("Unable to record failed footer update:", error.message);
    }
    return res.status(401).json({ message: "Incorrect admin password." });
  }

  const content = {
    brandName: req.body.brandName.trim(),
    description: req.body.description.trim(),
    columns: req.body.columns.map(({ title, links }) => ({
      title: title.trim(),
      links: links.map(({ label, url }) => ({ label: label.trim(), url: url.trim() })),
    })),
    copyright: req.body.copyright.trim(),
    socials: req.body.socials.map(({ platform, url }) => ({
      platform,
      url: url.trim(),
    })),
  };

  try {
    await saveFooterContent(content);
  } catch (error) {
    console.error("Unable to save footer content:", error.message);
    return res.status(500).json({ message: "Unable to save footer content." });
  }

  try {
    await logAudit({
      action: "UPDATE_FOOTER_CONTENT",
      actor: req.user.username || req.user.admin_id,
      role: req.user.role || "Admin",
      status: "SUCCESS",
      information: `Footer content updated (columns: ${content.columns.length}; social links: ${content.socials.length}).`,
    });
  } catch (error) {
    console.error("Footer content was saved but audit logging failed:", error.message);
    return res.status(500).json({
      message: "Footer content was saved, but the audit log could not be recorded. Contact a system administrator.",
      contentSaved: true,
    });
  }
  return res.json({ message: "Footer content saved.", content });
});

export default router;
