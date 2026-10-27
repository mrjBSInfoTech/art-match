import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./auditLogs.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replace("export default router;", "");

const loadRoute = (db) => {
  let handler;
  const router = {
    get(path, ...handlers) {
      assert.equal(path, "/");
      handler = handlers.at(-1);
    },
  };
  vm.runInNewContext(source, {
    express: { Router: () => router },
    db,
    console: { error() {} },
    authenticateSeller: (_req, _res, next) => next(),
  });
  return handler;
};

test("seller audit endpoint scopes rows to the authenticated student identity", async () => {
  let query;
  const handler = loadRoute({
    query(sql, params, callback) {
      query = { sql, params };
      callback(null, [{ audit_id: 1, actor: "STU-1" }]);
    },
  });
  const response = {
    headers: {},
    set(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  handler({ user: { student_id: 17, student_number: "STU-1" } }, response);

  assert.match(query.sql, /role IN \('Student', 'seller'\)/);
  assert.match(query.sql, /actor IN \(\?\)/);
  assert.deepEqual(Array.from(query.params[0]), ["STU-1", "17"]);
  assert.equal(response.headers["Cache-Control"], "no-store");
  assert.deepEqual(response.body, [{ audit_id: 1, actor: "STU-1" }]);
});

test("seller audit endpoint reports database errors instead of returning empty results", async () => {
  const handler = loadRoute({
    query(_sql, _params, callback) {
      callback(new Error("database unavailable"));
    },
  });
  const response = {
    set() {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  handler({ user: { student_id: 17 } }, response);

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.message, "Unable to load your audit logs.");
});
