import express from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import db from "../database/db.js";
import { getProgramContent, saveProgramContent } from "../database/programContent.js";
import { authenticateAdmin } from "../middleware/adminAuthMiddleware.js";
import { requireAdminPermission } from "../middleware/adminPermissionMiddleware.js";
import { logAudit } from "../utils/auditLogger.js";
import { deleteFromB2, uploadToB2, isB2Configured } from "../utils/b2Storage.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localProgramDir = path.resolve(__dirname, "../uploads/admin/program");
const imagePrefix = "app-uploads/admin/program/";
const imageTypes = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 3, fieldSize: 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (Object.values(imageTypes).includes(file.mimetype)) return callback(null, true);
    callback(Object.assign(new Error("Upload a JPEG, PNG, or WebP image."), { status: 400 }));
  },
});
const programKeys = ["architecture", "interior-design", "fine-arts"];
const textFields = ["title", "eyebrow", "subtitle", "description", "image", "stat", "statLabel"];

function validateContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return "Program content must be an object.";
  }
  for (const key of programKeys) {
    const program = content[key];
    if (!program || typeof program !== "object") return `${key} content is required.`;
    for (const field of textFields) {
      if (
        typeof program[field] !== "string" ||
        !program[field].trim() ||
        program[field].trim().length > 10000
      ) {
        return `${key} ${field} is required and must be no longer than 10,000 characters.`;
      }
    }
    if (
      !Array.isArray(program.focus) ||
      program.focus.length < 1 ||
      program.focus.length > 10 ||
      program.focus.some(
        (item) => typeof item !== "string" || !item.trim() || item.trim().length > 2000,
      )
    ) {
      return `${key} focus points must contain at least one valid entry.`;
    }
    if (
      !/^https?:\/\//i.test(program.image.trim()) &&
      !program.image.trim().startsWith("/uploads/admin/program/")
    ) {
      return `${key} image must be a valid image URL.`;
    }
  }
  return null;
}

router.get("/", async (_req, res) => {
  try {
    res.json(await getProgramContent());
  } catch (error) {
    console.error("Unable to load Program page content:", error.message);
    res.status(500).json({ message: "Unable to load Program page content." });
  }
});

router.put(
  "/",
  authenticateAdmin,
  requireAdminPermission("can_edit"),
  (req, res, next) => {
    upload.single("image")(req, res, (error) => {
      if (!error) return next();
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Program image must be 5MB or smaller."
          : error instanceof multer.MulterError
            ? "Invalid upload. Send one image and the program content."
            : error.message;
      res.status(400).json({ message });
    });
  },
  async (req, res) => {
  let uploadedKey;
  const { password } = req.body;
  if (typeof password !== "string" || !password) {
    return res.status(400).json({ message: "Admin password is required to save changes." });
  }
  let submittedContent;
  try {
    submittedContent = JSON.parse(req.body.content);
  } catch {
    return res.status(400).json({ message: "Program content must be valid JSON." });
  }
  const validationError = validateContent(submittedContent);
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
    console.error("Unable to verify admin password for Program page update:", error.message);
    return res.status(500).json({ message: "Unable to verify admin password." });
  }

  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    try {
      await logAudit({
        action: "UPDATE_PROGRAM_PAGE_CONTENT",
        actor: req.user.username || req.user.admin_id,
        role: req.user.role || "Admin",
        status: "FAILED",
        information: "Program page update rejected: incorrect password confirmation.",
      });
    } catch (error) {
      console.error("Unable to record failed Program page update:", error.message);
    }
    return res.status(401).json({ message: "Incorrect admin password." });
  }

  const content = Object.fromEntries(
    programKeys.map((key) => [
      key,
      {
        ...Object.fromEntries(textFields.map((field) => [field, submittedContent[key][field].trim()])),
        focus: submittedContent[key].focus.map((item) => item.trim()),
      },
    ]),
  );

  try {
    if (req.file) {
      let format;
      try {
        ({ format } = await sharp(req.file.buffer).metadata());
      } catch {
        format = null;
      }
      if (!imageTypes[format]) {
        return res.status(400).json({ message: "Upload a valid JPEG, PNG, or WebP image." });
      }
      const targetProgram = req.body.program;
      if (!programKeys.includes(targetProgram)) {
        return res.status(400).json({ message: "Choose a valid program for the image." });
      }
      const extension = format === "jpeg" ? "jpg" : format;
      uploadedKey = `${imagePrefix}${targetProgram}-${randomUUID()}.${extension}`;
      const filename = path.basename(uploadedKey);
      await fs.promises.mkdir(localProgramDir, { recursive: true });
      await fs.promises.writeFile(path.join(localProgramDir, filename), req.file.buffer);

      if (isB2Configured()) {
        try {
          await uploadToB2({
            key: uploadedKey,
            body: req.file.buffer,
            contentType: imageTypes[format],
          });
        } catch (b2Error) {
          console.warn("B2 upload failed, keeping local program image:", b2Error.message);
        }
      }
      content[targetProgram].image = `/uploads/admin/program/${encodeURIComponent(
        uploadedKey.slice(imagePrefix.length),
      )}`;
    }
    await saveProgramContent(content);
    await logAudit({
      action: "UPDATE_PROGRAM_PAGE_CONTENT",
      actor: req.user.username || req.user.admin_id,
      role: req.user.role || "Admin",
      status: "SUCCESS",
      information: "Program page content updated.",
    });
  } catch (error) {
    if (uploadedKey) {
      const filename = path.basename(uploadedKey);
      await fs.promises.unlink(path.join(localProgramDir, filename)).catch(() => {});
      if (isB2Configured()) {
        try {
          await deleteFromB2(uploadedKey);
        } catch (cleanupError) {
          console.error("Unable to clean failed Program image upload from B2:", cleanupError.message);
        }
      }
    }
    console.error("Unable to save Program page content:", error.message);
    return res.status(500).json({ message: "Unable to save Program page content." });
  }
  return res.json({ message: "Program page content saved.", content });
  },
);

export default router;
