// Runs the real event router against MySQL and B2 using one temporary event.
// Only the uniquely named fixture and its own images/audit entries are removed.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import db from "../database/db.js";
import { ensureEventsTable } from "../database/events.js";
import router from "../routes/admin/event.js";
import { getFromB2, deleteFromB2 } from "../utils/b2Storage.js";

const title = `Event integration check ${randomUUID()}`;
const keys = new Set();
let eventId;
let server;
try {
  await ensureEventsTable();
  const [admins] = await db.promise().query(`SELECT a.admin_id FROM admin a JOIN admin_role r ON r.admin_id = a.admin_id
    WHERE r.role IN ('super admin', 'admin') OR
    (r.role = 'customize' AND r.can_add = 1 AND r.can_edit = 1 AND r.can_delete = 1) LIMIT 1`);
  assert.ok(admins.length, "An existing admin with add/edit/delete permissions is required.");
  const token = jwt.sign({ admin_id: admins[0].admin_id }, process.env.JWT_SECRET || "your_secret_key", { expiresIn: "5m" });
  // Pass the local API URL to verify the actual running server, including its route mount.
  let base = process.argv[2];
  if (base) {
    assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+\/api\/admin\/event\/?$/,
      "Only a local ArtMatch event API may receive the temporary admin token.");
    base = base.replace(/\/$/, "");
  } else {
    const app = express();
    app.use(express.json());
    app.use("/api/admin/event", router);
    server = await new Promise(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
    base = `http://127.0.0.1:${server.address().port}/api/admin/event`;
  }
  const request = async (method, path = "", data, image) => {
    let body;
    if (data) {
      body = new FormData();
      Object.entries(data).forEach(([key, value]) => body.append(key, value));
      if (image) body.append("image", new Blob([image], { type: "image/png" }), "integration-check.png");
    }
    const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}` }, body });
    const result = await response.json();
    assert.ok(response.ok, `${method} failed (${response.status}): ${result.message || "Unexpected response"}`);
    return result;
  };
  const image = await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } }).png().toBuffer();
  const data = { title, description: "Temporary event integration fixture", location: "Test gallery", start_at: "2026-12-01T09:00", end_at: "2026-12-01T17:00", status: "Draft" };
  const created = await request("POST", "", data, image);
  eventId = created.event_id;
  keys.add(created.image_key);
  assert.equal(created.title, title);
  assert.equal(created.start_at, "2026-12-01T09:00:00");
  assert.match(created.image_url, /^\/uploads\/admin\/events\//);
  const stored = await getFromB2(created.image_key);
  assert.deepEqual(Buffer.from(await stored.Body.transformToByteArray()), image);
  assert.ok((await request("GET")).some(event => event.event_id === eventId));
  const edited = await request("PUT", `/${eventId}`, { ...data, description: "Edited fixture", end_at: "" });
  assert.equal(edited.end_at, null);
  assert.equal(edited.image_key, created.image_key);
  const replaced = await request("PUT", `/${eventId}`, data, image);
  keys.add(replaced.image_key);
  assert.notEqual(replaced.image_key, created.image_key);
  await assert.rejects(getFromB2(created.image_key), error => error.$metadata?.httpStatusCode === 404);
  assert.equal((await request("GET", `/${eventId}`)).image_key, replaced.image_key);
  await request("DELETE", `/${eventId}`);
  assert.ok(!(await request("GET")).some(event => event.event_id === eventId));
  await assert.rejects(getFromB2(replaced.image_key), error => error.$metadata?.httpStatusCode === 404);
  console.log("PASS: real MySQL event CRUD, authenticated API, date round-trip, B2 upload/read/replacement/deletion.");
} catch (error) {
  console.error("Event integration check failed:", error.code || error.message);
  process.exitCode = 1;
} finally {
  try {
    // The title includes a fresh UUID, so this cleanup cannot match existing events.
    const [fixtures] = await db.promise().query("SELECT image_key FROM events WHERE title = ?", [title]);
    fixtures.forEach(event => { if (event.image_key) keys.add(event.image_key); });
    await db.promise().query("DELETE FROM events WHERE title = ?", [title]);
    await db.promise().query("DELETE FROM audit_logs WHERE action IN ('CREATE_EVENT', 'UPDATE_EVENT', 'DELETE_EVENT') AND information = ?", [`Event: ${title}`]);
    for (const key of keys) {
      if (key.startsWith("app-uploads/admin/events/")) await deleteFromB2(key);
    }
  } catch (error) { console.error("Unable to clean event test fixture:", error.code || error.name); process.exitCode = 1; }
  if (server) await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
  await db.promise().end();
}
