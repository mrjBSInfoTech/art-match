import { createHash } from "node:crypto";
import { decryptPayoutAccount } from "./payoutAccount.js";

export const REQUIRED_PAYOUT_APPROVALS = 3;
export const isFinanceAdmin = admin => Boolean(admin && ["admin", "super admin"].includes(admin.role) && !Number(admin.is_banned));

// Ciphertexts change when an identical account is saved again. Hash the
// canonical destination, not the random encryption envelope. Neither the full
// number nor this internal fingerprint is included in an API response/audit.
export function payoutApprovalSnapshot(eligibility, account, providerName, providerMode = providerName === "demo" ? "demo" :
  /^sk_live_/.test(String(process.env.PAYMONGO_SECRET_KEY || "").trim()) ? "live" : "test") {
  if (!account) return null;
  const { split, order } = eligibility;
  return createHash("sha256").update(JSON.stringify({
    splitId: Number(split.split_id), orderId: Number(order.order_id), sellerId: Number(split.seller_id),
    paymentId: order.paymongo_payment_id, currency: split.currency,
    gross: eligibility.grossAmountCentavos, refund: eligibility.refundAmountCentavos,
    amount: eligibility.payoutAmountCentavos, payoutProvider: providerName, providerMode,
    destinationType: account.destination_type, institutionCode: account.institution_code,
    institutionProvider: account.institution_provider, accountName: account.account_name,
    accountNumber: decryptPayoutAccount(account.account_number_ciphertext, split.seller_id),
  })).digest("hex");
}

export function validPayoutApprovalCount(cycle, decisions) {
  if (!cycle) return 0;
  return new Set(decisions.filter(decision => decision.decision === "Approved" &&
    Number(decision.admin_id) !== Number(cycle.requested_by_admin_id) && isFinanceAdmin(decision))
    .map(decision => Number(decision.admin_id))).size;
}

export function payoutApprovalDto(cycle, decisions = [], { snapshotChanged = false } = {}) {
  if (!cycle) return { cycleId: null, status: "Not Requested", approvalCount: 0,
    requiredApprovals: REQUIRED_PAYOUT_APPROVALS, decisions: [], requestedByAdminId: null, requestedByName: null };
  const count = validPayoutApprovalCount(cycle, decisions);
  let status = cycle.approval_status;
  if (["Pending Approval", "Approved"].includes(status) && snapshotChanged) status = "Invalidated";
  else if (status === "Approved" && count < REQUIRED_PAYOUT_APPROVALS && !cycle.released_at) status = "Pending Approval";
  return {
    cycleId: cycle.cycle_id, status, requestedByAdminId: cycle.requested_by_admin_id,
    requestedByName: cycle.requested_by_name, requestedAt: cycle.requested_at,
    approvedAt: cycle.approved_at, releasedByAdminId: cycle.released_by_admin_id,
    releasedAt: cycle.released_at, approvalCount: count, requiredApprovals: REQUIRED_PAYOUT_APPROVALS,
    invalidationReason: cycle.invalidation_reason || (snapshotChanged ? "Payout details changed. Request fresh approvals." : null),
    decisions: decisions.map(row => ({ adminId: row.admin_id, adminName: row.admin_name,
      decision: row.decision, comment: row.comment, createdAt: row.created_at, authorized: isFinanceAdmin(row) })),
  };
}

export function payoutApprovalActions({ approval, payoutStatus, eligible, hasDestination, adminId, financeAuthorized, providerEnabled }) {
  const economic = payoutStatus === "Eligible" && eligible && hasDestination;
  const open = ["Pending Approval", "Approved"].includes(approval.status) && !approval.releasedAt;
  const alreadyVoted = approval.decisions.some(row => Number(row.adminId) === Number(adminId));
  return {
    canRequest: Boolean(financeAuthorized && economic && (!open || approval.releasedAt)),
    canApprove: Boolean(financeAuthorized && economic && approval.status === "Pending Approval" && !approval.releasedAt &&
      Number(adminId) !== Number(approval.requestedByAdminId) && !alreadyVoted),
    canReject: Boolean(financeAuthorized && economic && open &&
      Number(adminId) !== Number(approval.requestedByAdminId) && !alreadyVoted),
    canRelease: Boolean(financeAuthorized && economic && providerEnabled && approval.status === "Approved" &&
      approval.approvalCount >= REQUIRED_PAYOUT_APPROVALS && !approval.releasedAt),
    canReconcile: Boolean(financeAuthorized && ["Processing", "Failed"].includes(payoutStatus)),
  };
}
