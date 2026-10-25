import express from "express";
import db from "../../database/db.js";

const router = express.Router();
const imagePrefix = "app-uploads/admin/events/";

const publicEventColumns = `
  event_id,
  title,
  description,
  location,
  DATE_FORMAT(start_at, '%Y-%m-%dT%H:%i:%s') AS start_at,
  DATE_FORMAT(end_at, '%Y-%m-%dT%H:%i:%s') AS end_at,
  image_key,
  status
`;

const serializeEvent = (event) => {
  const filename = event.image_key?.startsWith(imagePrefix)
    ? event.image_key.slice(imagePrefix.length)
    : null;

  return {
    event_id: event.event_id,
    title: event.title,
    description: event.description,
    location: event.location,
    start_at: event.start_at,
    end_at: event.end_at,
    status: event.status,
    image_url: filename
      ? `/uploads/admin/events/${encodeURIComponent(filename)}`
      : null,
  };
};

router.get("/", async (_req, res) => {
  try {
    const [events] = await db.promise().query(
      `SELECT ${publicEventColumns}
       FROM events
       WHERE status = 'Published'
       ORDER BY start_at ASC, event_id DESC`,
    );

    res.json(events.map(serializeEvent));
  } catch (error) {
    console.error("Unable to load buyer events:", error.code || error.name);
    res.status(500).json({ message: "Unable to load events." });
  }
});

router.get("/:id", async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ message: "Invalid event ID." });
  }

  try {
    const [events] = await db.promise().query(
      `SELECT ${publicEventColumns}
       FROM events
       WHERE event_id = ? AND status = 'Published'
       LIMIT 1`,
      [eventId],
    );

    if (!events.length) {
      return res.status(404).json({ message: "Event not found." });
    }

    return res.json(serializeEvent(events[0]));
  } catch (error) {
    console.error("Unable to load buyer event:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load event." });
  }
});

export default router;
