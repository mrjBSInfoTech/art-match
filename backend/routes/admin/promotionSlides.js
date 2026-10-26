import express from "express";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import db from "../../database/db.js";
import {
  findPromotionSlide,
  ensurePromotionSlideCanBeRemoved,
  insertPromotionSlide,
  lockPromotionSlides,
  listPromotionSlides,
  recordPromotionSlideActivity,
  removePromotionSlide,
  savePromotionSlide,
  setPromotionSlideOrder,
} from "../../database/promotionSlides.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { requireAdminPermission } from "../../middleware/adminPermissionMiddleware.js";
import { deleteFromB2, uploadToB2 } from "../../utils/b2Storage.js";
import { logAudit } from "../../utils/auditLogger.js";

const router = express.Router();
const imagePrefix = "app-uploads/admin/promotion-slides/";
const imageTypes = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6, fieldSize: 65535 },
  fileFilter: (_req, file, callback) => {
    if (Object.values(imageTypes).includes(file.mimetype)) return callback(null, true);
    callback(Object.assign(new Error("Upload a JPEG, PNG, or WebP image."), { status: 400 }));
  },
});

const parseSlideId = (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid promotion slide ID." });
  }
  req.slideId = id;
  next();
};

const withImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Promotion image must be 5MB or smaller."
        : error instanceof multer.MulterError
          ? "Invalid upload. Send one image and the promotion fields."
          : error.message;
    res.status(400).json({ message });
  });
};

const safeButtonUrl = (value) => {
  if (!value) return null;
  const url = String(value).trim();
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : null;
  } catch {
    return null;
  }
};

const validateSlide = (body = {}) => {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const buttonLabel =
    typeof body.button_label === "string" ? body.button_label.trim() : "";
  const buttonUrl = safeButtonUrl(body.button_url);
  const status = body.status ?? "Draft";
  const sortOrder = Number(body.sort_order ?? 2);

  if (!title || title.length > 200) {
    throw Object.assign(new Error("Title is required and must be 200 characters or fewer."), { status: 400 });
  }
  if (Buffer.byteLength(description, "utf8") > 65535) {
    throw Object.assign(new Error("Description must fit within 65KB."), { status: 400 });
  }
  if (buttonLabel.length > 60) {
    throw Object.assign(new Error("Button label must be 60 characters or fewer."), { status: 400 });
  }
  if (body.button_url && !buttonUrl) {
    throw Object.assign(new Error("Button link must be a relative path or an HTTP(S) URL."), { status: 400 });
  }
  if (Boolean(buttonLabel) !== Boolean(buttonUrl)) {
    throw Object.assign(new Error("Provide both a button label and a button link, or leave both empty."), { status: 400 });
  }
  if (!["Draft", "Published"].includes(status)) {
    throw Object.assign(new Error("Choose Draft or Published status."), { status: 400 });
  }
  if (!Number.isSafeInteger(sortOrder) || sortOrder < 2 || sortOrder > 2147483647) {
    throw Object.assign(new Error("Choose a valid display position."), { status: 400 });
  }
  return {
    title,
    description: description || null,
    button_label: buttonLabel || null,
    button_url: buttonUrl,
    status,
    sort_order: sortOrder,
  };
};

const serializeSlide = (slide) => {
  const filename = slide.image_key?.startsWith(imagePrefix)
    ? slide.image_key.slice(imagePrefix.length)
    : null;
  return {
    ...slide,
    image_url: filename
      ? `/uploads/admin/promotion-slides/${encodeURIComponent(filename)}`
      : null,
  };
};

const cleanImage = async (key) => {
  if (!key?.startsWith(imagePrefix)) return;
  try {
    await deleteFromB2(key);
  } catch (error) {
    console.error("Unable to clean up promotion image:", error.name);
  }
};

const audit = async (req, action, title) => {
  try {
    await logAudit({
      action,
      actor: req.user.username || String(req.user.admin_id),
      role: req.adminAccess?.role || req.user.role || "Admin",
      status: "SUCCESS",
      information: `Promotion slide: ${title}`,
    });
  } catch (error) {
    console.error("Unable to record promotion slide audit:", error.name);
  }
};

const activitySnapshot = (slide) => ({
  title: slide.title,
  description: slide.description,
  button_label: slide.button_label,
  button_url: slide.button_url,
  status: slide.status,
  sort_order: slide.sort_order,
  image_original_name: slide.image_original_name,
});

router.get("/", authenticateAdmin, async (_req, res) => {
  try {
    res.json((await listPromotionSlides()).map(serializeSlide));
  } catch (error) {
    console.error("Unable to load promotion slides:", error.code || error.name);
    res.status(500).json({ message: "Unable to load promotion slides." });
  }
});

router.get("/requests", authenticateAdmin, async (_req, res) => {
  try {
    const [slides] = await db.promise().query(
      `SELECT ps.*, s.student_number, s.first_name, s.last_name
       FROM promotion_slides ps
       JOIN student s ON s.student_id = ps.student_id
       WHERE ps.review_status = 'pending'
       ORDER BY ps.review_requested_at ASC, ps.slide_id ASC`,
    );
    res.json(slides.map(serializeSlide));
  } catch (error) {
    console.error("Unable to load promotion slide requests:", error.code || error.name);
    res.status(500).json({ message: "Unable to load promotion slide requests." });
  }
});

router.get("/:id", authenticateAdmin, parseSlideId, async (req, res) => {
  try {
    const slide = await findPromotionSlide(req.slideId);
    if (!slide) return res.status(404).json({ message: "Promotion slide not found." });
    res.json(serializeSlide(slide));
  } catch (error) {
    console.error("Unable to load promotion slide:", error.code || error.name);
    res.status(500).json({ message: "Unable to load promotion slide." });
  }
});

const persistSlide = async (req, res) => {
  let connection;
  let uploadedKey;
  let committed = false;
  try {
    const data = validateSlide(req.body);
    if (!req.slideId && !req.file) {
      return res.status(400).json({ message: "Please upload a promotion image." });
    }
    let format;
    if (req.file) {
      try {
        ({ format } = await sharp(req.file.buffer).metadata());
      } catch {
        // Invalid image bytes are rejected below.
      }
      if (!imageTypes[format]) {
        return res.status(400).json({ message: "Upload a valid JPEG, PNG, or WebP image." });
      }
    }

    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const lockedSlides = await lockPromotionSlides(connection);
    const previous = req.slideId
      ? await findPromotionSlide(req.slideId, connection)
      : null;
    if (req.slideId && !previous) {
      await connection.rollback();
      return res.status(404).json({ message: "Promotion slide not found." });
    }
    if (previous?.student_id) {
      await connection.rollback();
      return res.status(403).json({
        message: "Student promotion slides must be managed through the review queue.",
      });
    }
    const maximumPosition = lockedSlides.length + (req.slideId ? 1 : 2);
    if (data.sort_order > maximumPosition) {
      throw Object.assign(
        new Error(`Choose a display position from 2 to ${maximumPosition}.`),
        { status: 400 },
      );
    }
    const saved = { ...previous, ...data };
    if (req.file) {
      const key = `${imagePrefix}${Date.now()}-${randomUUID()}.${format === "jpeg" ? "jpg" : format}`;
      await uploadToB2({ key, body: req.file.buffer, contentType: imageTypes[format] });
      uploadedKey = key;
      Object.assign(saved, {
        image_key: key,
        image_original_name: req.file.originalname.slice(0, 255),
        image_content_type: imageTypes[format],
        image_size: req.file.size,
      });
    }
    const id =
      req.slideId ||
      (await insertPromotionSlide(saved, req.user.admin_id, connection));
    if (req.slideId) await savePromotionSlide(id, saved, connection);
    await setPromotionSlideOrder(connection, id, data.sort_order);
    const slide = await findPromotionSlide(id, connection);
    const activityAction = !req.slideId
      ? "create"
      : previous.status !== slide.status
        ? slide.status === "Published"
          ? "publish"
          : "unpublish"
        : "edit";
    await recordPromotionSlideActivity(connection, {
      slideId: id,
      actorType: "admin",
      actorId: req.user.admin_id,
      actorName: req.user.username || String(req.user.admin_id),
      action: activityAction,
      slideTitle: slide.title,
      details: {
        before: req.slideId ? activitySnapshot(previous) : null,
        after: activitySnapshot(slide),
      },
    });
    await connection.commit();
    committed = true;
    if (uploadedKey && previous?.image_key !== uploadedKey) {
      await cleanImage(previous?.image_key);
    }
    await audit(req, req.slideId ? "UPDATE_PROMOTION_SLIDE" : "CREATE_PROMOTION_SLIDE", saved.title);
    res.status(req.slideId ? 200 : 201).json(serializeSlide(slide));
  } catch (error) {
    if (connection && !committed) await connection.rollback().catch(() => {});
    if (uploadedKey && !committed) await cleanImage(uploadedKey);
    console.error("Unable to save promotion slide:", error.code || error.name);
    res.status(error.status === 400 ? 400 : 500).json({
      message:
        error.status === 400
          ? error.message
          : "Unable to save promotion slide. Please try again.",
    });
  } finally {
    connection?.release();
  }
};

router.post("/", authenticateAdmin, requireAdminPermission("can_add"), withImage, persistSlide);
router.put("/:id", authenticateAdmin, requireAdminPermission("can_edit"), parseSlideId, withImage, persistSlide);

router.post(
  "/:id/review",
  authenticateAdmin,
  requireAdminPermission("can_edit"),
  parseSlideId,
  async (req, res) => {
    const decision = req.body?.decision;
    if (!["accept", "reject"].includes(decision)) {
      return res.status(400).json({ message: "Choose accept or reject." });
    }
    let connection;
    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      const slide = await findPromotionSlide(req.slideId, connection, true);
      if (!slide || !slide.student_id) {
        await connection.rollback();
        return res.status(404).json({ message: "Student promotion request not found." });
      }
      if (slide.review_status !== "pending") {
        await connection.rollback();
        return res.status(409).json({ message: "This promotion request has already been reviewed." });
      }
      if (decision === "accept") {
        await connection.query(
          `UPDATE promotion_slides
           SET status = 'Published', review_status = 'accepted',
               reviewed_at = CURRENT_TIMESTAMP,
               published_until = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 3 DAY)
           WHERE slide_id = ?`,
          [req.slideId],
        );
      } else {
        await connection.query(
          `UPDATE promotion_slides
           SET status = 'Draft', review_status = 'rejected',
               reviewed_at = CURRENT_TIMESTAMP, published_until = NULL
           WHERE slide_id = ?`,
          [req.slideId],
        );
      }
      const updatedSlide = await findPromotionSlide(req.slideId, connection);
      await recordPromotionSlideActivity(connection, {
        slideId: req.slideId,
        studentId: slide.student_id,
        actorType: "admin",
        actorId: req.user.admin_id,
        actorName: req.user.username || String(req.user.admin_id),
        action: decision === "accept" ? "approve" : "reject",
        slideTitle: updatedSlide.title,
        details: {
          decision,
          review_status: updatedSlide.review_status,
          published_until: updatedSlide.published_until,
        },
      });
      await connection.commit();
      await audit(
        req,
        decision === "accept" ? "APPROVE_PROMOTION_SLIDE" : "REJECT_PROMOTION_SLIDE",
        slide.title,
      );
      res.json(serializeSlide(updatedSlide));
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      console.error("Unable to review promotion slide:", error.code || error.name);
      res.status(500).json({ message: "Unable to review promotion slide." });
    } finally {
      connection?.release();
    }
  },
);

router.post(
  "/:id/unpublish",
  authenticateAdmin,
  requireAdminPermission("can_edit"),
  parseSlideId,
  async (req, res) => {
    let connection;
    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      const lockedSlides = await lockPromotionSlides(connection);
      const slide = await findPromotionSlide(req.slideId, connection, true);
      if (!slide || !slide.student_id || slide.review_status !== "accepted") {
        await connection.rollback();
        return res.status(404).json({
          message: "Approved student promotion slide not found.",
        });
      }

      await ensurePromotionSlideCanBeRemoved(
        connection,
        slide,
        lockedSlides.length,
      );
      await connection.query(
        `UPDATE promotion_slides
         SET status = 'Draft', review_status = 'none',
             review_requested_at = NULL, reviewed_at = NULL,
             published_until = NULL
         WHERE slide_id = ?`,
        [req.slideId],
      );
      const updatedSlide = await findPromotionSlide(req.slideId, connection);
      await recordPromotionSlideActivity(connection, {
        slideId: req.slideId,
        studentId: slide.student_id,
        actorType: "admin",
        actorId: req.user.admin_id,
        actorName: req.user.username || String(req.user.admin_id),
        action: "unpublish",
        slideTitle: updatedSlide.title,
        details: {
          review_status: updatedSlide.review_status,
          status: updatedSlide.status,
        },
      });
      await connection.commit();
      await audit(req, "UNPUBLISH_STUDENT_PROMOTION_SLIDE", slide.title);
      res.json(serializeSlide(updatedSlide));
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      if (error.status === 409) {
        return res.status(409).json({ message: error.message });
      }
      console.error("Unable to unpublish student promotion slide:", error.code || error.name);
      res.status(500).json({ message: "Unable to unpublish student promotion slide." });
    } finally {
      connection?.release();
    }
  },
);

router.delete(
  "/:id",
  authenticateAdmin,
  requireAdminPermission("can_delete"),
  parseSlideId,
  async (req, res) => {
    let connection;
    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      const lockedSlides = await lockPromotionSlides(connection);
      const slide = await findPromotionSlide(req.slideId, connection, true);
      if (!slide) {
        await connection.rollback();
        return res.status(404).json({ message: "Promotion slide not found." });
      }
      await ensurePromotionSlideCanBeRemoved(
        connection,
        slide,
        lockedSlides.length,
      );
      await recordPromotionSlideActivity(connection, {
        slideId: req.slideId,
        studentId: slide.student_id,
        actorType: "admin",
        actorId: req.user.admin_id,
        actorName: req.user.username || String(req.user.admin_id),
        action: "delete",
        slideTitle: slide.title,
        details: { before: activitySnapshot(slide) },
      });
      await removePromotionSlide(req.slideId, connection);
      await setPromotionSlideOrder(connection);
      await connection.commit();
      await cleanImage(slide.image_key);
      await audit(req, "DELETE_PROMOTION_SLIDE", slide.title);
      res.json({ message: "Promotion slide deleted successfully.", slide_id: req.slideId });
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      if (error.status === 409) {
        return res.status(409).json({ message: error.message });
      }
      console.error("Unable to delete promotion slide:", error.code || error.name);
      res.status(500).json({ message: "Unable to delete promotion slide. Please try again." });
    } finally {
      connection?.release();
    }
  },
);

export default router;
