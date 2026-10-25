import express from "express";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import db from "../../database/db.js";
import { listEvents, findEvent, insertEvent, saveEvent, removeEvent } from "../../database/events.js";
import { authenticateAdmin } from "../../middleware/adminAuthMiddleware.js";
import { requireAdminPermission } from "../../middleware/adminPermissionMiddleware.js";
import { uploadToB2, deleteFromB2 } from "../../utils/b2Storage.js";
import { logAudit } from "../../utils/auditLogger.js";

const router = express.Router();
const imagePrefix = "app-uploads/admin/events/";
const imageTypes = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6, fieldSize: 65535 },
  fileFilter: (_req, file, callback) => {
    if (Object.values(imageTypes).includes(file.mimetype)) return callback(null, true);
    callback(Object.assign(new Error("Please upload a JPEG, PNG, or WebP image."), { status: 400 }));
  },
});

function eventId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid event ID." });
  req.eventId = id;
  next();
}

function withImage(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();
    res.status(400).json({ message: error.code === "LIMIT_FILE_SIZE"
      ? "Event image must be 5MB or smaller." : error instanceof multer.MulterError
        ? "Invalid event upload. Send one image and the event fields." : error.message });
  });
}

function parseDate(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "00"] = match;
  const date = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second));
  if (+year < 1000 || date.getUTCFullYear() !== +year || date.getUTCMonth() !== +month - 1 ||
    date.getUTCDate() !== +day || date.getUTCHours() !== +hour ||
    date.getUTCMinutes() !== +minute || date.getUTCSeconds() !== +second) return null;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function validateEvent(body = {}) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const start = parseDate(body.start_at);
  const end = body.end_at ? parseDate(body.end_at) : null;
  const status = body.status ?? "Draft";
  if (!title || title.length > 200) throw Object.assign(new Error("Event title is required and must be 200 characters or fewer."), { status: 400 });
  if (!description || Buffer.byteLength(description, "utf8") > 65535) throw Object.assign(new Error("Event description is required and must fit within 65KB."), { status: 400 });
  if (location.length > 255) throw Object.assign(new Error("Location must be 255 characters or fewer."), { status: 400 });
  if (!start || (body.end_at && !end)) throw Object.assign(new Error("Enter valid event dates and times."), { status: 400 });
  if (end && end < start) throw Object.assign(new Error("Event end date cannot be before the start date."), { status: 400 });
  if (!["Draft", "Published", "Archived"].includes(status)) throw Object.assign(new Error("Choose a valid event status."), { status: 400 });
  return { title, description, location: location || null, start_at: start, end_at: end, status };
}

function serializeEvent(event) {
  const filename = event.image_key?.startsWith(imagePrefix) ? event.image_key.slice(imagePrefix.length) : null;
  return { ...event, image_url: filename
    ? `/uploads/admin/events/${encodeURIComponent(filename)}` : null };
}

async function cleanImage(key) {
  if (!key?.startsWith(imagePrefix)) return;
  try { await deleteFromB2(key); }
  catch (error) { console.error("Unable to clean up event image:", error.name); }
}

async function audit(req, action, title) {
  try {
    await logAudit({ action, actor: req.user.username || String(req.user.admin_id),
      role: req.adminAccess?.role || req.user.role || "Admin", status: "SUCCESS", information: `Event: ${title}` });
  } catch (error) { console.error("Unable to record event audit:", error.name); }
}

router.get("/", authenticateAdmin, async (_req, res) => {
  try { res.json((await listEvents()).map(serializeEvent)); }
  catch (error) { console.error("Unable to load events:", error.code || error.name); res.status(500).json({ message: "Unable to load events." }); }
});

router.get("/:id", authenticateAdmin, eventId, async (req, res) => {
  try {
    const event = await findEvent(req.eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });
    res.json(serializeEvent(event));
  } catch (error) { console.error("Unable to load event:", error.code || error.name); res.status(500).json({ message: "Unable to load event." }); }
});

async function persistEvent(req, res) {
  let connection;
  let uploadedKey;
  let committed = false;
  try {
    const data = validateEvent(req.body);
    if (!req.eventId && !req.file) return res.status(400).json({ message: "Please upload an event image." });
    let format;
    if (req.file) {
      try { ({ format } = await sharp(req.file.buffer).metadata()); } catch { /* Invalid image bytes. */ }
      if (!imageTypes[format]) return res.status(400).json({ message: "Please upload a valid JPEG, PNG, or WebP image." });
    }
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const previous = req.eventId ? await findEvent(req.eventId, connection, true) : null;
    if (req.eventId && !previous) {
      await connection.rollback();
      return res.status(404).json({ message: "Event not found." });
    }
    const saved = { ...previous, ...data };
    if (req.file) {
      const key = `${imagePrefix}${Date.now()}-${randomUUID()}.${format === "jpeg" ? "jpg" : format}`;
      await uploadToB2({ key, body: req.file.buffer, contentType: imageTypes[format] });
      uploadedKey = key;
      Object.assign(saved, { image_key: key, image_original_name: req.file.originalname.slice(0, 255),
        image_content_type: imageTypes[format], image_size: req.file.size });
    }
    const id = req.eventId || await insertEvent(saved, req.user.admin_id, connection);
    if (req.eventId) await saveEvent(id, saved, connection);
    const event = await findEvent(id, connection);
    await connection.commit();
    committed = true;
    if (uploadedKey && previous?.image_key !== uploadedKey) await cleanImage(previous?.image_key);
    await audit(req, req.eventId ? "UPDATE_EVENT" : "CREATE_EVENT", saved.title);
    res.status(req.eventId ? 200 : 201).json(serializeEvent(event));
  } catch (error) {
    if (connection && !committed) await connection.rollback().catch(() => {});
    if (uploadedKey && !committed) await cleanImage(uploadedKey);
    console.error("Unable to save event:", error.code || error.name);
    res.status(error.status === 400 ? 400 : 500).json({ message: error.status === 400 ? error.message : "Unable to save event. Please try again." });
  } finally { connection?.release(); }
}

router.post("/", authenticateAdmin, requireAdminPermission("can_add"), withImage, persistEvent);
router.put("/:id", authenticateAdmin, requireAdminPermission("can_edit"), eventId, withImage, persistEvent);

router.delete("/:id", authenticateAdmin, requireAdminPermission("can_delete"), eventId, async (req, res) => {
  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();
    const event = await findEvent(req.eventId, connection, true);
    if (!event) { await connection.rollback(); return res.status(404).json({ message: "Event not found." }); }
    await removeEvent(req.eventId, connection);
    await connection.commit();
    await cleanImage(event.image_key);
    await audit(req, "DELETE_EVENT", event.title);
    res.json({ message: "Event deleted successfully.", event_id: req.eventId });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("Unable to delete event:", error.code || error.name);
    res.status(500).json({ message: "Unable to delete event. Please try again." });
  } finally { connection?.release(); }
});

export default router;
