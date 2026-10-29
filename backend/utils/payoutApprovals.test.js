import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { encryptPayoutAccount } from "./payoutAccount.js";
import { isFinanceAdmin, validPayoutApprovalCount, payoutApprovalSnapshot, payoutApprovalDto, payoutApprovalActions } from "./payoutApprovals.js";

const cycle = { cycle_id: 12, requested_by_admin_id: 1, approval_status: "Pending Approval" };
const decision = (admin_id, changes = {}) => ({ admin_id, role: "admin", is_banned: 0, decision: "Approved", ...changes });
test("quorum counts distinct current finance admins, excluding requester, rejects, demotions and bans", () => {
  assert.equal(validPayoutApprovalCount(cycle, [decision(1),decision(2),decision(2),decision(3),
    decision(4,{ role: "moderator" }),decision(5,{ is_banned: 1 }),decision(6,{ decision: "Rejected" }),decision(7,{ role: "super admin" })]), 3);
  assert.equal(isFinanceAdmin({ role: "admin", is_banned: 1 }), false);
});
test("approval DTO removes an old quorum when current admin permissions no longer qualify", () => {
  const dto = payoutApprovalDto({ ...cycle, approval_status: "Approved" }, [decision(2),decision(3),decision(4,{ role: "moderator" })]);
  assert.equal(dto.status, "Pending Approval");
  assert.equal(dto.approvalCount, 2);
  assert.equal(dto.decisions[2].authorized, false);
});
test("requester can release after quorum but cannot vote; two approvals cannot enable release", () => {
  const approval = payoutApprovalDto({ ...cycle, approval_status: "Approved" }, [decision(2),decision(3),decision(4)]);
  const context = { approval, payoutStatus: "Eligible", eligible: true, hasDestination: true, adminId: 1, financeAuthorized: true, providerEnabled: true };
  assert.equal(payoutApprovalActions(context).canRelease, true);
  assert.equal(payoutApprovalActions(context).canApprove, false);
  assert.equal(payoutApprovalActions({ ...context, approval: { ...approval, approvalCount: 2 } }).canRelease, false);
  assert.equal(payoutApprovalActions({ ...context, payoutStatus: "Paid" }).canRelease, false);
});
test("snapshot detects amount, provider and destination changes without persisting account numbers", () => {
  const previous = process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY;
  process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  try {
    const eligibility = { split: { split_id: 1, seller_id: 9, currency: "PHP" }, order: { order_id: 8, paymongo_payment_id: "pay_fixture" },
      grossAmountCentavos: 10000, refundAmountCentavos: 0, payoutAmountCentavos: 10000 };
    const account = { destination_type: "bank", institution_code: "TEST", institution_provider: "instapay", account_name: "Test Seller",
      account_number_ciphertext: encryptPayoutAccount("999999990001", 9) };
    const snapshot = payoutApprovalSnapshot(eligibility, account, "demo");
    assert.match(snapshot, /^[a-f0-9]{64}$/);
    assert.equal(payoutApprovalSnapshot(eligibility, { ...account, account_number_ciphertext: encryptPayoutAccount("999999990001", 9) }, "demo"), snapshot);
    assert.notEqual(payoutApprovalSnapshot({ ...eligibility, payoutAmountCentavos: 9999 }, account, "demo"), snapshot);
    assert.notEqual(payoutApprovalSnapshot(eligibility, account, "paymongo"), snapshot);
    assert.notEqual(payoutApprovalSnapshot(eligibility, account, "paymongo", "test"), payoutApprovalSnapshot(eligibility, account, "paymongo", "live"));
    assert.notEqual(payoutApprovalSnapshot(eligibility, { ...account, account_name: "Other Seller" }, "demo"), snapshot);
    assert.equal(payoutApprovalDto(cycle, [], { snapshotChanged: true }).status, "Invalidated");
  } finally {
    if (previous === undefined) delete process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY;
    else process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = previous;
  }
});
