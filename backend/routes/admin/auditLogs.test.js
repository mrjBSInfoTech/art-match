import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./auditLogs.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\s*/gm, "")
  .replace("export default router;", "");

const loadRoute = (db, authenticateAdmin) => {
  let handler;
  let registeredMiddleware;
  const router = {
    get(path, middleware, routeHandler) {
      assert.equal(path, "/");
      registeredMiddleware = middleware;
      handler = routeHandler;
    },
  };
  vm.runInNewContext(source, {
    express: { Router: () => router },
    db,
    authenticateAdmin,
    ensureAuditLogsTable: async () => {},
  });
  return { handler, registeredMiddleware };
};

test("admin audit endpoint returns system-wide logs behind admin authentication", async () => {
  const auditRows = [{ audit_id: 1, role: "Student" }, { audit_id: 2, role: "Admin" }];
  let query;
  const authenticateAdmin = () => {};
  const { handler, registeredMiddleware } = loadRoute(
    {
      query(sql, params, callback) {
        query = { sql, params };
        callback(null, auditRows);
      },
    },
    authenticateAdmin,
  );
  const response = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await handler({ query: {} }, response);

  assert.equal(registeredMiddleware, authenticateAdmin);
  assert.match(query.sql, /FROM audit_logs\s+WHERE 1 = 1/);
  assert.doesNotMatch(query.sql, /AND\s+(?:actor|role)\s*=/i);
  assert.deepEqual(Array.from(query.params), []);
  assert.deepEqual(response.body, auditRows);
});
