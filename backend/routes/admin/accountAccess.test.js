import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./accountAccess.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replace("export default router;", "");

const loadRoutes = (database) => {
  const handlers = new Map();
  const router = {
    use() {},
    get(path, ...callbacks) { handlers.set(`get:${path}`, callbacks.at(-1)); },
    post(path, ...callbacks) { handlers.set(`post:${path}`, callbacks.at(-1)); },
    put(path, ...callbacks) { handlers.set(`put:${path}`, callbacks.at(-1)); },
  };
  vm.runInNewContext(source, {
    express: { Router: () => router },
    db: database,
    authenticateAdmin() {},
    requireAdminPermission() { return () => {}; },
    addStrike() {},
    setBanned() {},
    console,
  });
  return handlers;
};

const createResponse = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("strike/ban report supports role and text filters and returns complete events", () => {
  const events = [{ action: "STRIKE" }, { action: "BAN" }];
  let query;
  const handlers = loadRoutes({
    query(sql, params, callback) {
      query = { sql, params };
      callback(null, events);
    },
  });
  const response = createResponse();

  handlers.get("get:/reports")({ query: { role: "seller", search: "policy" } }, response);

  assert.match(query.sql, /FROM strike_logs sl/);
  assert.match(query.sql, /UNION ALL/);
  assert.match(query.sql, /FROM ban_logs bl/);
  assert.match(query.sql, /ORDER BY datetime DESC, event_id DESC/);
  assert.deepEqual(Array.from(query.params), ["seller", "seller", "policy", "%policy%"]);
  assert.deepEqual(Array.from(response.body, (event) => event.action), ["STRIKE", "BAN"]);
});

test("strike/ban report validates filters and reports database errors", () => {
  const handlers = loadRoutes({
    query(_sql, _params, callback) { callback(new Error("Database unavailable")); },
  });
  const invalidRoleResponse = createResponse();
  handlers.get("get:/reports")({ query: { role: "admin", search: "" } }, invalidRoleResponse);
  assert.equal(invalidRoleResponse.statusCode, 400);

  const invalidSearchResponse = createResponse();
  handlers.get("get:/reports")({ query: { role: "", search: "x".repeat(201) } }, invalidSearchResponse);
  assert.equal(invalidSearchResponse.statusCode, 400);

  const databaseErrorResponse = createResponse();
  handlers.get("get:/reports")({ query: { role: "", search: "" } }, databaseErrorResponse);
  assert.equal(databaseErrorResponse.statusCode, 500);
  assert.equal(databaseErrorResponse.body.message, "Database unavailable");
});
