import assert from "node:assert/strict";
import test from "node:test";
import { createPayoutService } from "../utils/payouts.js";

function mockExecutor() {
  const store = {
    settings: new Map([["paymongo_payout_wallet_id", "wallet_initial_12345"]]),
    requests: [],
    approvals: [],
    splits: [
      { split_id: 1, order_id: 101, payout_amount: 500, payout_status: "Paid", order_number: "AM-000101", seller_name: "Test Seller 1" },
    ],
    admins: new Map([
      [1, { admin_id: 1, first_name: "Super", last_name: "Admin", role: "super admin", is_banned: 0, payout_permission: null }],
      [2, { admin_id: 2, first_name: "Finance", last_name: "One", role: "admin", is_banned: 0, payout_permission: null }],
      [3, { admin_id: 3, first_name: "Finance", last_name: "Two", role: "admin", is_banned: 0, payout_permission: null }],
      [4, { admin_id: 4, first_name: "Finance", last_name: "Three", role: "admin", is_banned: 0, payout_permission: null }],
      [5, { admin_id: 5, first_name: "Regular", last_name: "Mod", role: "moderator", is_banned: 0, payout_permission: null }],
    ]),
  };

  let nextReqId = 1;
  let nextApprovalId = 1;

  const executor = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();

      // system_settings
      if (normalized.includes("FROM system_settings WHERE setting_key = 'paymongo_payout_wallet_id'")) {
        const val = store.settings.get("paymongo_payout_wallet_id");
        return [val ? [{ setting_value: val }] : []];
      }
      if (normalized.includes("INSERT INTO system_settings")) {
        store.settings.set("paymongo_payout_wallet_id", params[0]);
        return [{ affectedRows: 1 }];
      }

      // admin lookup
      if (normalized.includes("FROM admin a JOIN admin_role r") && normalized.includes("WHERE a.admin_id=?")) {
        const adminId = Number(params[0]);
        const a = store.admins.get(adminId);
        return [a ? [{ admin_id: a.admin_id, admin_name: `${a.first_name} ${a.last_name}`, role: a.role, is_banned: a.is_banned, payout_permission: a.payout_permission }] : []];
      }

      // unsettled payouts
      if (normalized.includes("FROM seller_payment_split s JOIN marketplace_order o") && normalized.includes("payout_status IN ('Held', 'Eligible', 'Processing')")) {
        const unsettled = store.splits.filter(s => ["Held", "Eligible", "Processing"].includes(s.payout_status));
        return [unsettled];
      }

      // active request
      if (normalized.includes("FROM admin_payout_wallet_change_request r") && normalized.includes("WHERE r.status IN ('Pending', 'Approved')")) {
        const active = store.requests.filter(r => ["Pending", "Approved"].includes(r.status));
        if (!active.length) return [[]];
        const r = active[active.length - 1];
        const superA = store.admins.get(r.super_admin_id);
        return [[{ ...r, super_admin_name: superA ? `${superA.first_name} ${superA.last_name}` : "Super Admin" }]];
      }

      // check request by id with FOR UPDATE
      if (normalized.includes("FROM admin_payout_wallet_change_request WHERE request_id = ?")) {
        const reqId = Number(params[0]);
        const r = store.requests.find(x => x.request_id === reqId);
        return [r ? [{ ...r }] : []];
      }

      // check existing vote
      if (normalized.includes("FROM admin_payout_wallet_change_approval WHERE request_id = ? AND admin_id = ?")) {
        const reqId = Number(params[0]);
        const adminId = Number(params[1]);
        const vote = store.approvals.filter(v => v.request_id === reqId && v.admin_id === adminId);
        return [vote];
      }

      // insert request
      if (normalized.includes("INSERT INTO admin_payout_wallet_change_request")) {
        const newReq = {
          request_id: nextReqId++,
          super_admin_id: Number(params[0]),
          current_wallet_id: params[1],
          new_wallet_id: params[2],
          reason: params[3],
          status: "Pending",
          approvals_required: 3,
          created_at: new Date().toISOString(),
          applied_at: null,
          applied_by_admin_id: null,
          rejected_at: null,
        };
        store.requests.push(newReq);
        return [{ insertId: newReq.request_id }];
      }

      // insert approval
      if (normalized.includes("INSERT INTO admin_payout_wallet_change_approval")) {
        const approval = {
          approval_id: nextApprovalId++,
          request_id: Number(params[0]),
          admin_id: Number(params[1]),
          decision: params[2],
          comment: params[3],
          created_at: new Date().toISOString(),
        };
        store.approvals.push(approval);
        return [{ insertId: approval.approval_id }];
      }

      // get approvals for request
      if (normalized.includes("FROM admin_payout_wallet_change_approval") && normalized.includes("WHERE a.request_id = ?")) {
        const reqId = Number(params[0]);
        const matching = store.approvals.filter(v => v.request_id === reqId).map(v => {
          const a = store.admins.get(v.admin_id);
          return {
            ...v,
            role: a?.role || "admin",
            is_banned: a?.is_banned || 0,
            payout_permission: a?.payout_permission || null,
          };
        });
        return [matching];
      }

      // get decisions for request with details
      if (normalized.includes("FROM admin_payout_wallet_change_approval v") && normalized.includes("WHERE v.request_id = ?")) {
        const reqId = Number(params[0]);
        const matching = store.approvals.filter(v => v.request_id === reqId).map(v => {
          const a = store.admins.get(v.admin_id);
          return {
            ...v,
            admin_name: a ? `${a.first_name} ${a.last_name}` : "Admin",
            role: a?.role || "admin",
            payout_permission: a?.payout_permission || null,
          };
        });
        return [matching];
      }

      // update request status
      if (normalized.includes("UPDATE admin_payout_wallet_change_request SET status = 'Approved'")) {
        const reqId = Number(params[0]);
        const r = store.requests.find(x => x.request_id === reqId);
        if (r) r.status = "Approved";
        return [{ affectedRows: 1 }];
      }

      if (normalized.includes("UPDATE admin_payout_wallet_change_request SET status = 'Applied'")) {
        const adminId = Number(params[0]);
        const reqId = Number(params[1]);
        const r = store.requests.find(x => x.request_id === reqId);
        if (r) {
          r.status = "Applied";
          r.applied_by_admin_id = adminId;
          r.applied_at = new Date().toISOString();
        }
        return [{ affectedRows: 1 }];
      }

      if (normalized.includes("UPDATE admin_payout_wallet_change_request SET status = 'Rejected'")) {
        const reqId = Number(params[0]);
        const r = store.requests.find(x => x.request_id === reqId);
        if (r) {
          r.status = "Rejected";
          r.rejected_at = new Date().toISOString();
        }
        return [{ affectedRows: 1 }];
      }

      if (normalized.includes("UPDATE admin_payout_wallet_change_request SET status = 'Cancelled'")) {
        const reqId = Number(params[0]);
        const r = store.requests.find(x => x.request_id === reqId);
        if (r) r.status = "Cancelled";
        return [{ affectedRows: 1 }];
      }

      // history
      if (normalized.includes("FROM admin_payout_wallet_change_request r") && normalized.includes("WHERE r.status NOT IN ('Pending', 'Approved')")) {
        const history = store.requests.filter(r => !["Pending", "Approved"].includes(r.status));
        return [history.map(h => ({ ...h, super_admin_name: "Super Admin", applied_by_name: h.applied_by_admin_id ? "Super Admin" : null }))];
      }

      return [[]];
    },
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    getConnection: async () => executor,
    release() {},
  };

  return { executor, store, audit: async () => {} };
}

test("PayMongo wallet settings reports initial settlement health and wallet ID", async () => {
  const { executor, audit } = mockExecutor();
  const service = createPayoutService({ pool: executor, audit });
  const settings = await service.getWalletSettings({ adminId: 1 });

  assert.equal(settings.currentWalletId, "wallet_initial_12345");
  assert.equal(settings.isAllSettled, true);
  assert.equal(settings.unsettledCount, 0);
  assert.equal(settings.unsettledTotal, 0);
  assert.equal(settings.activeRequest, null);
});

test("Only a Super Admin can request a PayMongo wallet change", async () => {
  const { executor, audit } = mockExecutor();
  const service = createPayoutService({ pool: executor, audit });

  // Regular admin (adminId 2) is forbidden
  await assert.rejects(
    () => service.requestWalletChange(2, { newWalletId: "wallet_new_99999", reason: "Migration" }),
    (err) => err.status === 403 && /Only a Super Admin/.test(err.message),
  );

  // Super Admin (adminId 1) can submit request with valid format
  const req = await service.requestWalletChange(1, { newWalletId: "wallet_new_99999", reason: "Migration" });
  assert.equal(req.success, true);
  assert.equal(req.status, "Pending");
  assert.equal(req.approvalsRequired, 3);
});

test("Wallet ID format validation enforces wallet_ prefix", async () => {
  const { executor, audit } = mockExecutor();
  const service = createPayoutService({ pool: executor, audit });

  await assert.rejects(
    () => service.requestWalletChange(1, { newWalletId: "invalid_wallet_id" }),
    (err) => err.status === 400 && /valid PayMongo Wallet ID/.test(err.message),
  );
});

test("Super Admin cannot self-approve their own wallet change request", async () => {
  const { executor, audit } = mockExecutor();
  const service = createPayoutService({ pool: executor, audit });
  const req = await service.requestWalletChange(1, { newWalletId: "wallet_new_99999", reason: "Migration" });

  await assert.rejects(
    () => service.approveWalletChange(1, req.requestId, { comment: "Self approval" }),
    (err) => err.status === 403 && /cannot self-approve/.test(err.message),
  );
});

test("Requires 3 distinct payout administrator approvals before wallet change can be applied", async () => {
  const { executor, audit } = mockExecutor();
  const service = createPayoutService({ pool: executor, audit });
  const req = await service.requestWalletChange(1, { newWalletId: "wallet_new_99999", reason: "Migration" });

  // Admin 2 approves (1/3)
  const vote1 = await service.approveWalletChange(2, req.requestId, { comment: "Looks good" });
  assert.equal(vote1.approvalCount, 1);
  assert.equal(vote1.status, "Pending");

  // Duplicate vote by Admin 2 rejected
  await assert.rejects(
    () => service.approveWalletChange(2, req.requestId, { comment: "Repeat vote" }),
    (err) => err.status === 409 && /already voted/.test(err.message),
  );

  // Admin 3 approves (2/3)
  const vote2 = await service.approveWalletChange(3, req.requestId, { comment: "Approved" });
  assert.equal(vote2.approvalCount, 2);
  assert.equal(vote2.status, "Pending");

  // Attempt to apply prematurely with only 2 approvals fails
  await assert.rejects(
    () => service.applyWalletChange(1, req.requestId),
    (err) => err.status === 409 && /requires 3 administrator approvals/.test(err.message),
  );

  // Admin 4 approves (3/3) -> status becomes Approved!
  const vote3 = await service.approveWalletChange(4, req.requestId, { comment: "Third approval" });
  assert.equal(vote3.approvalCount, 3);
  assert.equal(vote3.status, "Approved");

  // Super Admin applies the approved change
  const applyRes = await service.applyWalletChange(1, req.requestId);
  assert.equal(applyRes.success, true);
  assert.equal(applyRes.status, "Applied");
  assert.equal(applyRes.walletId, "wallet_new_99999");

  // Verify wallet settings updated
  const updatedSettings = await service.getWalletSettings({ adminId: 1 });
  assert.equal(updatedSettings.currentWalletId, "wallet_new_99999");
});

test("Rejection by payout administrator sets status to Rejected", async () => {
  const { executor, audit } = mockExecutor();
  const service = createPayoutService({ pool: executor, audit });
  const req = await service.requestWalletChange(1, { newWalletId: "wallet_rejected_111", reason: "Migration" });

  const rejectRes = await service.rejectWalletChange(2, req.requestId, { comment: "Unsettled concerns" });
  assert.equal(rejectRes.success, true);
  assert.equal(rejectRes.status, "Rejected");
});

test("Super Admin can cancel a pending wallet change request", async () => {
  const { executor, audit } = mockExecutor();
  const service = createPayoutService({ pool: executor, audit });
  const req = await service.requestWalletChange(1, { newWalletId: "wallet_cancel_222", reason: "Migration" });

  const cancelRes = await service.cancelWalletChange(1, req.requestId);
  assert.equal(cancelRes.success, true);
  assert.equal(cancelRes.status, "Cancelled");
});
