import assert from "node:assert/strict";
import test from "node:test";
import {
  canAssignAdminRole,
  normalizeAdminRole,
} from "./adminPermissionMiddleware.js";

test("admin role assignment normalizes role names and enforces strict rank", () => {
  assert.equal(normalizeAdminRole("  ADMIN "), "admin");
  assert.equal(canAssignAdminRole(" ADMIN ", " moderator "), true);
  assert.equal(canAssignAdminRole("admin", "admin"), false);
  assert.equal(canAssignAdminRole("moderator", "admin"), false);
  assert.equal(canAssignAdminRole("super admin", "super admin"), true);
  assert.equal(canAssignAdminRole("unknown", "moderator"), false);
});
