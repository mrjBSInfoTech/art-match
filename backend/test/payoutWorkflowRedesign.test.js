import assert from "node:assert/strict";
import test from "node:test";
import { REQUIRED_PAYOUT_APPROVALS, REQUIRED_PAYOUT_ACCOUNT_APPROVALS, isFinanceAdmin } from "../utils/payoutApprovals.js";

test("REQUIRED_PAYOUT_APPROVALS is 1 for immediate transaction approval", () => {
  assert.equal(REQUIRED_PAYOUT_APPROVALS, 1);
});

test("REQUIRED_PAYOUT_ACCOUNT_APPROVALS is 3 for student payout method change", () => {
  assert.equal(REQUIRED_PAYOUT_ACCOUNT_APPROVALS, 3);
});

test("isFinanceAdmin authorization rules", () => {
  // Super Admin and Admin always have finance access if not banned
  assert.equal(isFinanceAdmin({ role: "super admin", is_banned: 0 }), true);
  assert.equal(isFinanceAdmin({ role: "admin", is_banned: 0 }), true);
  assert.equal(isFinanceAdmin({ role: "admin", is_banned: 1 }), false);

  // Moderator and Customize require Approved payout permission
  assert.equal(isFinanceAdmin({ role: "moderator", is_banned: 0, payout_permission: "Pending" }), false);
  assert.equal(isFinanceAdmin({ role: "moderator", is_banned: 0, payout_permission: "Rejected" }), false);
  assert.equal(isFinanceAdmin({ role: "moderator", is_banned: 0, payout_permission: null }), false);
  assert.equal(isFinanceAdmin({ role: "moderator", is_banned: 0, payout_permission: "Approved" }), true);
  assert.equal(isFinanceAdmin({ role: "moderator", is_banned: 1, payout_permission: "Approved" }), false);

  assert.equal(isFinanceAdmin({ role: "customize", is_banned: 0, payout_permission: "Pending" }), false);
  assert.equal(isFinanceAdmin({ role: "customize", is_banned: 0, payout_permission: "Approved" }), true);
  assert.equal(isFinanceAdmin({ role: "customize", is_banned: 1, payout_permission: "Approved" }), false);
});

