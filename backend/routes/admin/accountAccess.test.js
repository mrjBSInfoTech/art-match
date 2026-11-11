import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./accountAccess.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replace("export default router;", "");

const loadRoutes = (database, accessActions = {}) => {
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
    addStrike: accessActions.addStrike || (() => {}),
    setBanned: accessActions.setBanned || (() => {}),
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

test("seller strike route records the seller role and admin actor", async () => {
  let strikeArgs;
  const handlers = loadRoutes(
    {},
    {
      addStrike: async (...args) => {
        strikeArgs = args;
        return { strikes: 1, is_banned: false };
      },
    },
  );
  const response = createResponse();

  await handlers.get("post:/:role/:id/strike")(
    { params: { role: "seller", id: "42" }, body: { reason: "Policy violation" }, user: { admin_id: 7 } },
    response,
  );

  assert.deepEqual(Array.from(strikeArgs), ["seller", 42, "Policy violation", 7]);
  assert.equal(response.body.access.strikes, 1);
});

test("seller ban route records seller bans and unbans", async () => {
  const banArgs = [];
  const handlers = loadRoutes(
    {},
    {
      setBanned: async (...args) => {
        banArgs.push(args);
        return { is_banned: args[2] };
      },
    },
  );
  const banResponse = createResponse();
  await handlers.get("put:/:role/:id/ban")(
    { params: { role: "seller", id: "42" }, body: { banned: true, reason: "Repeated violations" }, user: { admin_id: 7 } },
    banResponse,
  );
  const unbanResponse = createResponse();
  await handlers.get("put:/:role/:id/ban")(
    { params: { role: "seller", id: "42" }, body: { banned: false }, user: { admin_id: 7 } },
    unbanResponse,
  );

  assert.deepEqual(Array.from(banArgs[0]), ["seller", 42, true, "Repeated violations", 7]);
  assert.deepEqual(Array.from(banArgs[1]), ["seller", 42, false, undefined, 7]);
  assert.equal(banResponse.body.access.is_banned, true);
  assert.equal(unbanResponse.body.access.is_banned, false);
});
