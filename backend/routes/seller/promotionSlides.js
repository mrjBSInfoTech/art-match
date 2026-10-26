import express from "express";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import db from "../../database/db.js";
import {
  deleteStudentPromotionSlide,
  ensurePromotionSlideCanBeRemoved,
  findStudentPromotionSlide,
  insertStudentPromotionSlide,
  listStudentPromotionSlides,
  lockPromotionSlides,
  recordPromotionSlideActivity,
  setPromotionSlideOrder,
  submitStudentPromotionSlide,
  updateStudentPromotionSlide,
} from "../../database/promotionSlides.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import { deleteFromB2, uploadToB2 } from "../../utils/b2Storage.js";

const router = express.Router();
const imagePrefix = "app-uploads/admin/promotion-slides/";
const imageTypes = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, fieldSize: 65535 },
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
  return {
    title,
    description: description || null,
    button_label: buttonLabel || null,
    button_url: buttonUrl,
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

const activitySnapshot = (slide) => ({
  title: slide.title,
  description: slide.description,
  button_label: slide.button_label,
  button_url: slide.button_url,
  status: slide.status,
  review_status: slide.review_status,
  image_original_name: slide.image_original_name,
});

const cleanImage = async (key) => {
  if (!key?.startsWith(imagePrefix)) return;
  try {
    await deleteFromB2(key);
  } catch (error) {
    console.error("Unable to clean up student promotion image:", error.name);
  }
};

router.get("/", authenticateSeller, async (req, res) => {
  try {
    const slides = await listStudentPromotionSlides(req.user.student_id);
    res.json(slides.map(serializeSlide));
  } catch (error) {
    console.error("Unable to load student promotion slides:", error.code || error.name);
    res.status(500).json({ message: "Unable to load your promotion slides." });
  }
});

const saveStudentSlide = async (req, res) => {
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

    const studentId = req.user.student_id;
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    await connection.query(
      "SELECT student_id FROM student WHERE student_id = ? FOR UPDATE",
      [studentId],
    );
    await lockPromotionSlides(connection);
    const previous = req.slideId
      ? await findStudentPromotionSlide(req.slideId, studentId, connection, true)
      : null;
    if (req.slideId && !previous) {
      await connection.rollback();
      return res.status(404).json({ message: "Promotion slide not found." });
    }
    const stillPublished =
      previous?.review_status === "accepted" &&
      Number(previous.is_currently_published) === 1;
    if (previous?.review_status === "pending" || stillPublished) {
      await connection.rollback();
      return res.status(409).json({
        message: "A requested or approved slide cannot be edited. Wait for review to finish or its 3-day publication to end.",
      });
    }
    if (!req.slideId) {
      const [counts] = await connection.query(
        "SELECT COUNT(*) AS slide_count FROM promotion_slides WHERE student_id = ?",
        [studentId],
      );
      if (Number(counts[0]?.slide_count) >= 3) {
        await connection.rollback();
        return res.status(409).json({
          message: "You can create up to 3 promotional slides.",
        });
      }
    }

    let image = previous
      ? {
          image_key: previous.image_key,
          image_original_name: previous.image_original_name,
          image_content_type: previous.image_content_type,
          image_size: previous.image_size,
        }
      : {
          image_key: null,
          image_original_name: null,
          image_content_type: null,
          image_size: null,
        };
    if (req.file) {
      const key = `${imagePrefix}${Date.now()}-${randomUUID()}.${format === "jpeg" ? "jpg" : format}`;
      await uploadToB2({ key, body: req.file.buffer, contentType: imageTypes[format] });
      uploadedKey = key;
      image = {
        image_key: key,
        image_original_name: req.file.originalname.slice(0, 255),
        image_content_type: imageTypes[format],
        image_size: req.file.size,
      };
    }

    const saved = { ...data, ...image, student_id: studentId };
    const slideId =
      req.slideId ||
      (await insertStudentPromotionSlide(saved, studentId, connection));
    if (req.slideId) {
      await updateStudentPromotionSlide(slideId, saved, connection);
    }
    if (!req.slideId) {
      const [orders] = await connection.query(
        "SELECT COALESCE(MAX(sort_order), 1) AS max_order FROM promotion_slides",
      );
      await setPromotionSlideOrder(
        connection,
        slideId,
        Number(orders[0].max_order) + 1,
      );
    }
    const slide = await findStudentPromotionSlide(slideId, studentId, connection);
    await recordPromotionSlideActivity(connection, {
      slideId,
      studentId,
      actorType: "student",
      actorId: studentId,
      actorName: req.user.student_number || String(studentId),
      action: req.slideId ? "edit" : "create",
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
    res.status(req.slideId ? 200 : 201).json(serializeSlide(slide));
  } catch (error) {
    if (connection && !committed) await connection.rollback().catch(() => {});
    if (uploadedKey && !committed) await cleanImage(uploadedKey);
    console.error("Unable to save student promotion slide:", error.code || error.name);
    res.status(error.status === 400 || error.status === 409 ? error.status : 500).json({
      message:
        error.status === 400 || error.status === 409
          ? error.message
          : "Unable to save your promotion slide. Please try again.",
    });
  } finally {
    connection?.release();
  }
};

router.post("/", authenticateSeller, withImage, saveStudentSlide);
router.put("/:id", authenticateSeller, parseSlideId, withImage, saveStudentSlide);

router.post(
  "/:id/request",
  authenticateSeller,
  parseSlideId,
  async (req, res) => {
    let connection;
    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      const slide = await findStudentPromotionSlide(
        req.slideId,
        req.user.student_id,
        connection,
        true,
      );
      if (!slide) {
        await connection.rollback();
        return res.status(404).json({ message: "Promotion slide not found." });
      }
      if (slide.review_status === "pending") {
        await connection.rollback();
        return res.status(409).json({ message: "This slide is already awaiting admin review." });
      }
      if (
        slide.review_status === "accepted" &&
        Number(slide.is_currently_published) === 1
      ) {
        await connection.rollback();
        return res.status(409).json({ message: "This slide is already published." });
      }
      await submitStudentPromotionSlide(
        req.slideId,
        req.user.student_id,
        connection,
      );
      const updated = await findStudentPromotionSlide(
        req.slideId,
        req.user.student_id,
        connection,
      );
      await recordPromotionSlideActivity(connection, {
        slideId: req.slideId,
        studentId: req.user.student_id,
        actorType: "student",
        actorId: req.user.student_id,
        actorName: req.user.student_number || String(req.user.student_id),
        action: "request",
        slideTitle: updated.title,
        details: {
          review_status: updated.review_status,
          review_requested_at: updated.review_requested_at,
        },
      });
      await connection.commit();
      res.json(serializeSlide(updated));
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      console.error("Unable to request promotion slide review:", error.code || error.name);
      res.status(500).json({ message: "Unable to request admin review." });
    } finally {
      connection?.release();
    }
  },
);

router.post(
  "/:id/withdraw",
  authenticateSeller,
  parseSlideId,
  async (req, res) => {
    let connection;
    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      const slide = await findStudentPromotionSlide(
        req.slideId,
        req.user.student_id,
        connection,
        true,
      );
      if (!slide) {
        await connection.rollback();
        return res.status(404).json({ message: "Promotion slide not found." });
      }
      if (slide.review_status !== "pending") {
        await connection.rollback();
        return res.status(409).json({
          message: "Only a request awaiting admin review can be withdrawn.",
        });
      }
      await connection.query(
        `UPDATE promotion_slides
         SET status = 'Draft', review_status = 'none',
             review_requested_at = NULL, reviewed_at = NULL
         WHERE slide_id = ? AND student_id = ?`,
        [req.slideId, req.user.student_id],
      );
      const updated = await findStudentPromotionSlide(
        req.slideId,
        req.user.student_id,
        connection,
      );
      await recordPromotionSlideActivity(connection, {
        slideId: req.slideId,
        studentId: req.user.student_id,
        actorType: "student",
        actorId: req.user.student_id,
        actorName: req.user.student_number || String(req.user.student_id),
        action: "withdraw_request",
        slideTitle: updated.title,
        details: {
          previous_review_status: slide.review_status,
          review_status: updated.review_status,
        },
      });
      await connection.commit();
      res.json(serializeSlide(updated));
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      console.error("Unable to withdraw promotion slide request:", error.code || error.name);
      res.status(500).json({ message: "Unable to withdraw your promotion request." });
    } finally {
      connection?.release();
    }
  },
);

router.delete(
  "/:id",
  authenticateSeller,
  parseSlideId,
  async (req, res) => {
    let connection;
    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();
      const lockedSlides = await lockPromotionSlides(connection);
      const slide = await findStudentPromotionSlide(
        req.slideId,
        req.user.student_id,
        connection,
        true,
      );
      if (!slide) {
        await connection.rollback();
        return res.status(404).json({ message: "Promotion slide not found." });
      }
      const stillPublished =
        slide.review_status === "accepted" &&
        Number(slide.is_currently_published) === 1;
      if (slide.review_status === "pending" || stillPublished) {
        await connection.rollback();
        return res.status(409).json({
          message: "A requested or published slide cannot be deleted.",
        });
      }
      await ensurePromotionSlideCanBeRemoved(
        connection,
        slide,
        lockedSlides.length,
      );
      await recordPromotionSlideActivity(connection, {
        slideId: req.slideId,
        studentId: req.user.student_id,
        actorType: "student",
        actorId: req.user.student_id,
        actorName: req.user.student_number || String(req.user.student_id),
        action: "delete",
        slideTitle: slide.title,
        details: { before: activitySnapshot(slide) },
      });
      await deleteStudentPromotionSlide(
        req.slideId,
        req.user.student_id,
        connection,
      );
      await setPromotionSlideOrder(connection);
      await connection.commit();
      await cleanImage(slide.image_key);
      res.json({ message: "Promotion slide deleted.", slide_id: req.slideId });
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {});
      if (error.status === 409) {
        return res.status(409).json({ message: error.message });
      }
      console.error("Unable to delete student promotion slide:", error.code || error.name);
      res.status(500).json({ message: "Unable to delete promotion slide." });
    } finally {
      connection?.release();
    }
  },
);

export default router;
