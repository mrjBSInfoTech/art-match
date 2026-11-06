import { randomUUID } from "node:crypto";
import db from "../database/db.js";
import * as providerApi from "./payoutProvider.js";
import { calculateProcessingFee } from "./paymentSplit.js";
import { getPayoutHoldPolicy, loadPayoutEligibility, refreshSellerPayoutEligibility, payoutToCentavos } from "./payoutEligibility.js";
import { encryptPayoutAccount, decryptPayoutAccount, payoutAccountDto, maskPayoutAccount } from "./payoutAccount.js";
import { logAudit } from "./auditLogger.js";
import { REQUIRED_PAYOUT_APPROVALS, REQUIRED_PAYOUT_ACCOUNT_APPROVALS, isFinanceAdmin, payoutApprovalSnapshot, validPayoutApprovalCount,
  payoutApprovalDto, payoutApprovalActions } from "./payoutApprovals.js";

export class PayoutError extends Error {
  constructor(status, message) { super(message); this.name = "PayoutError"; this.status = status; }
}
const fail = (status, message) => { throw new PayoutError(status, message); };
const id = value => {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0) fail(400, "A valid payout identifier is required.");
  return result;
};
const rows = async (executor, sql, params = []) => (await executor.query(sql, params))[0];
const allowedBody = (body, keys) => {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => !keys.includes(key))) {
    fail(400, "Unexpected payout fields. Amount, seller and payout status are determined by the server.");
  }
};

export function createPayoutService({ pool = db.promise(), provider = providerApi, audit = logAudit } = {}) {
  const configuredProviderName = () => provider.getPayoutProviderName?.() || provider.name || "paymongo";
  const configuredProviderMode = () => configuredProviderName() === "demo" ? "demo" :
    /^sk_live_/.test(String(process.env.PAYMONGO_SECRET_KEY || "").trim()) ? "live" : "test";
  // An attempt's adapter is immutable. Switching the configured provider must
  // never turn a historical simulated transfer into a real provider request.
  const adapterFor = name => provider.forPayoutProvider ? provider.forPayoutProvider(name) : provider;
  const transaction = async callback => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally { connection.release(); }
  };
  const auditAction = async (adminId, action, payout, status = "SUCCESS") => {
    await audit({ action, actor: String(adminId || "PayMongo"), role: adminId ? "Admin" : "System", status,
      information: `Payout ${payout.split_id}, order ${payout.order_id}, seller ${payout.seller_id}, PHP ${Number(payout.payout_amount || 0).toFixed(2)}.` })
      .catch(error => console.error("Payout audit failed:", error.code || error.name));

    if (payout?.seller_id) {
      const orderNum = payout.order_id ? `AM-${String(payout.order_id).padStart(6, "0")}` : `Split #${payout.split_id}`;
      const amount = Number(payout.payout_amount || 0).toFixed(2);
      const actionDescriptions = {
        PAYOUT_REQUESTED: `Payout requested for order ${orderNum} (PHP ${amount}). Pending admin approvals.`,
        PAYOUT_APPROVED: `Payout approved for order ${orderNum} (PHP ${amount}).`,
        PAYOUT_REJECTED: `Payout rejected for order ${orderNum} (PHP ${amount}).`,
        PAYOUT_RELEASED: `Payout transfer initiated for order ${orderNum} (PHP ${amount}).`,
        PAYOUT_SUCCEEDED: `Payout completed successfully for order ${orderNum} (PHP ${amount}).`,
        PAYOUT_DEMO_SUCCEEDED: `Payout demo simulation completed for order ${orderNum} (PHP ${amount}).`,
        PAYOUT_FAILED: `Payout transfer failed for order ${orderNum} (PHP ${amount}).`,
        PAYOUT_RECONCILED: `Payout reconciled for order ${orderNum} (PHP ${amount}).`,
        PAYOUT_STATUS_UPDATED: `Payout status updated for order ${orderNum} (PHP ${amount}).`,
        PAYOUT_REFUND_VERIFIED: `Payout adjusted for returned order ${orderNum} (refund verified).`,
      };
      await audit({
        action,
        actor: String(payout.seller_id),
        role: "Student",
        status,
        information: actionDescriptions[action] || `Payout activity for order ${orderNum} (PHP ${amount}). Status: ${status}.`,
      }).catch(error => console.error("Seller payout audit failed:", error.code || error.name));
    }
  };
  const admin = async (executor, adminId, { lock = false } = {}) => (await rows(executor, `SELECT a.admin_id,
    CONCAT(a.first_name,' ',a.last_name) AS admin_name,r.role,COALESCE(ac.is_banned,0) AS is_banned,
    (SELECT p.status FROM admin_payout_permission_request p WHERE p.admin_id=a.admin_id LIMIT 1) AS payout_permission
    FROM admin a JOIN admin_role r ON r.admin_id=a.admin_id
    LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=a.admin_id
    WHERE a.admin_id=?${lock ? " FOR UPDATE" : ""}`, [id(adminId)]))[0];
  const requireAdmin = async (executor, adminId, options) => {
    const actor = await admin(executor, adminId, options);
    if (!isFinanceAdmin(actor)) fail(403, "Only an administrator with finance access can manage payouts.");
    return actor;
  };
  const approvalState = async (executor, split, { lock = false } = {}) => {
    if (!split.approval_cycle_id) return { cycle: null, decisions: [] };
    const cycle = (await rows(executor, `SELECT c.*,CONCAT(a.first_name,' ',a.last_name) AS requested_by_name
      FROM seller_payout_approval_cycle c JOIN admin a ON a.admin_id=c.requested_by_admin_id
      WHERE c.cycle_id=? AND c.split_id=?${lock ? " FOR UPDATE" : ""}`, [split.approval_cycle_id,split.split_id]))[0];
    if (!cycle) fail(409, "Payout approval history requires administrator review.");
    const decisions = await rows(executor, `SELECT v.*,CONCAT(a.first_name,' ',a.last_name) AS admin_name,
      r.role,COALESCE(ac.is_banned,0) AS is_banned,
      (SELECT p.status FROM admin_payout_permission_request p WHERE p.admin_id=v.admin_id LIMIT 1) AS payout_permission
      FROM seller_payout_approval v
      JOIN admin a ON a.admin_id=v.admin_id LEFT JOIN admin_role r ON r.admin_id=v.admin_id
      LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=v.admin_id
      WHERE v.cycle_id=? ORDER BY v.approval_id${lock ? " FOR UPDATE" : ""}`, [cycle.cycle_id]);
    return { cycle, decisions };
  };
  const invalidateCycle = async (connection, cycle, reason) => {
    if (cycle && !cycle.released_at && ["Pending Approval", "Approved"].includes(cycle.approval_status)) {
      await rows(connection, `UPDATE seller_payout_approval_cycle SET approval_status='Invalidated',
        approved_at=NULL,invalidation_reason=? WHERE cycle_id=? AND released_at IS NULL`, [reason,cycle.cycle_id]);
    }
  };
  const notifyAdmins = async (connection, payout, message) => {
    await rows(connection, `INSERT INTO account_notifications (role,account_id,notification_type,message,order_id)
      SELECT 'admin',a.admin_id,'payout',?,? FROM admin a JOIN admin_role r ON r.admin_id=a.admin_id
      LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=a.admin_id
      WHERE r.role IN ('admin','super admin') AND COALESCE(ac.is_banned,0)=0`, [message,payout.order_id]);
  };
  const capability = async () => {
    try {
      const result = await provider.getPayoutCapability();
      // A seller may see readiness, not the platform's aggregate Wallet balance.
      return {
        enabled: Boolean(result?.enabled),
        mode: result?.mode || configuredProviderMode(),
        message: result?.message || null,
        provider: result?.provider || configuredProviderName(),
        simulated: result?.simulated || false,
        walletConfigured: Boolean(result?.walletConfigured),
        feeReserveCentavos: result?.feeReserveCentavos ?? null,
      };
    } catch (error) {
      return {
        enabled: false,
        mode: configuredProviderMode(),
        message: error.message || "Payout provider is unavailable.",
        provider: configuredProviderName(),
        simulated: configuredProviderName() === "demo",
        walletConfigured: false,
        feeReserveCentavos: null,
      };
    }
  };
  const getAccount = async sellerId => {
    const accountRow = (await rows(pool, "SELECT * FROM seller_payout_account WHERE student_id = ?", [id(sellerId)]))[0];
    const pendingRequestRow = (await rows(pool, `SELECT r.*,
      (SELECT COUNT(DISTINCT a.admin_id) FROM seller_payout_account_approval a WHERE a.request_id=r.request_id AND a.decision='Approved') AS approval_count
      FROM seller_payout_account_request r
      WHERE r.student_id = ? AND r.status = 'Pending'
      ORDER BY r.request_id DESC LIMIT 1`, [id(sellerId)]))[0];
    
    let pendingRequest = null;
    if (pendingRequestRow) {
      let maskedNum = "••••••••";
      try {
        maskedNum = maskPayoutAccount(decryptPayoutAccount(pendingRequestRow.account_number_ciphertext, sellerId));
      } catch { /* fallback */ }
      pendingRequest = {
        requestId: pendingRequestRow.request_id,
        status: pendingRequestRow.status,
        destinationType: pendingRequestRow.destination_type,
        institutionCode: pendingRequestRow.institution_code,
        institutionName: pendingRequestRow.institution_name,
        institutionProvider: pendingRequestRow.institution_provider,
        accountName: pendingRequestRow.account_name,
        maskedAccountNumber: maskedNum,
        approvalCount: Number(pendingRequestRow.approval_count || 0),
        requiredApprovals: REQUIRED_PAYOUT_ACCOUNT_APPROVALS,
        requestedAt: pendingRequestRow.requested_at,
      };
    } else {
      const lastRejected = (await rows(pool, `SELECT * FROM seller_payout_account_request
        WHERE student_id = ? AND status = 'Rejected'
        ORDER BY request_id DESC LIMIT 1`, [id(sellerId)]))[0];
      if (lastRejected) {
        let maskedNum = "••••••••";
        try {
          maskedNum = maskPayoutAccount(decryptPayoutAccount(lastRejected.account_number_ciphertext, sellerId));
        } catch { /* fallback */ }
        pendingRequest = {
          requestId: lastRejected.request_id,
          status: lastRejected.status,
          destinationType: lastRejected.destination_type,
          institutionCode: lastRejected.institution_code,
          institutionName: lastRejected.institution_name,
          institutionProvider: lastRejected.institution_provider,
          accountName: lastRejected.account_name,
          maskedAccountNumber: maskedNum,
          approvalCount: 0,
          requiredApprovals: REQUIRED_PAYOUT_ACCOUNT_APPROVALS,
          requestedAt: lastRejected.requested_at,
          rejectionReason: lastRejected.rejection_reason,
        };
      }
    }
    return {
      account: payoutAccountDto(accountRow),
      pendingRequest,
      capability: await capability(),
    };
  };
  const saveAccount = async (sellerId, body) => {
    id(sellerId);
    allowedBody(body, ["institutionCode", "provider", "accountName", "accountNumber"]);
    const name = typeof body.accountName === "string" ? body.accountName.trim() : "";
    const number = typeof body.accountNumber === "string" ? body.accountNumber.trim() : "";
    if (name.length < 2 || name.length > 180 || !/^[\p{L}\p{M}\p{N} .,'’&()\-]+$/u.test(name)) fail(400, "Enter a valid payout account name.");
    if (!/^\d{6,34}$/.test(number)) fail(400, "Enter a valid payout account number using 6 to 34 digits.");
    const institutions = await provider.listPayoutInstitutions();
    const institution = institutions.find(value => value.code === body.institutionCode && value.provider === body.provider);
    if (!institution) fail(400, "Choose a currently supported payout institution.");
    const ciphertext = encryptPayoutAccount(number, sellerId);
    await transaction(async connection => {
      const sellers = await rows(connection, "SELECT student_id FROM student WHERE student_id = ? FOR UPDATE", [sellerId]);
      if (!sellers.length) fail(404, "Seller not found.");
      const processing = await rows(connection, "SELECT split_id FROM seller_payment_split WHERE seller_id = ? AND payout_status = 'Processing' LIMIT 1", [sellerId]);
      if (processing.length) fail(409, "A payout is processing. Update your destination after it finishes.");
      
      const existingPending = await rows(connection, "SELECT request_id FROM seller_payout_account_request WHERE student_id = ? AND status = 'Pending' FOR UPDATE", [sellerId]);
      if (existingPending.length) {
        const reqId = existingPending[0].request_id;
        await rows(connection, "DELETE FROM seller_payout_account_approval WHERE request_id = ?", [reqId]);
        await rows(connection, `UPDATE seller_payout_account_request
          SET destination_type=?, institution_code=?, institution_name=?, institution_provider=?,
              account_name=?, account_number_ciphertext=?, requested_at=CURRENT_TIMESTAMP
          WHERE request_id=?`,
          [institution.destinationType || "bank", institution.code, institution.name, institution.provider, name, ciphertext, reqId]);
      } else {
        await rows(connection, `INSERT INTO seller_payout_account_request
          (student_id,destination_type,institution_code,institution_name,institution_provider,account_name,account_number_ciphertext,status)
          VALUES (?,?,?,?,?,?,?,'Pending')`,
          [sellerId, institution.destinationType || "bank", institution.code, institution.name, institution.provider, name, ciphertext]);
      }
    });
    return getAccount(sellerId);
  };

  const list = async ({ sellerId, payoutId, adminId } = {}) => {
    if (sellerId !== undefined) id(sellerId);
    const eligibility = await refreshSellerPayoutEligibility(pool, { sellerId });
    const eligibilityByOrder = new Map(eligibility.map(value => [Number(value.order.order_id), value]));
    const filters = ["o.payment_method = 'paymongo'", "o.payment_status IN ('Paid','Refunded')", "COALESCE(s.payout_provider, '') <> 'demo'"];
    const params = [];
    if (sellerId !== undefined) { filters.push("s.seller_id = ?"); params.push(sellerId); }
    if (payoutId !== undefined) { filters.push("s.split_id = ?"); params.push(id(payoutId)); }
    const data = await rows(pool, `SELECT s.*, o.order_number,o.status AS order_status,o.payment_method,o.payment_status,
      o.paid_at AS buyer_paid_at,o.delivered_at,CONCAT(st.first_name,' ',st.last_name) AS seller_name,
      pa.student_id AS account_student_id,pa.destination_type,pa.institution_code,pa.institution_name,pa.institution_provider,
      pa.account_name,pa.account_number_ciphertext,
      (SELECT GROUP_CONCAT(DISTINCT rr.status ORDER BY rr.status SEPARATOR ', ') FROM marketplace_return_request rr WHERE rr.order_id=s.order_id) AS return_statuses,
      (SELECT GROUP_CONCAT(DISTINCT rf.status ORDER BY rf.status SEPARATOR ', ') FROM seller_order_refund rf WHERE rf.order_id=s.order_id) AS refund_statuses,
      (SELECT COALESCE(NULLIF(i.image, ''), a.image) FROM marketplace_order_item i LEFT JOIN artwork a ON a.artwork_id = i.artwork_id WHERE i.order_id=s.order_id LIMIT 1) AS artwork_image,
      (SELECT COALESCE(NULLIF(i.title, ''), a.title) FROM marketplace_order_item i LEFT JOIN artwork a ON a.artwork_id = i.artwork_id WHERE i.order_id=s.order_id LIMIT 1) AS artwork_title
      FROM seller_payment_split s JOIN marketplace_order o ON o.order_id=s.order_id
      JOIN student st ON st.student_id=s.seller_id LEFT JOIN seller_payout_account pa ON pa.student_id=s.seller_id
      WHERE ${filters.join(" AND ")} ORDER BY s.created_at DESC,s.split_id DESC`, params);
    const available = await capability();
    const financeAuthorized = adminId != null && isFinanceAdmin(await admin(pool, adminId));
    const orders = await Promise.all(data.map(async row => {
      const current = eligibilityByOrder.get(Number(row.order_id));
      const { cycle, decisions } = await approvalState(pool, row);
      const open = cycle && !cycle.released_at && ["Pending Approval", "Approved"].includes(cycle.approval_status);
      const requesterAuthorized = !open || isFinanceAdmin(await admin(pool, cycle.requested_by_admin_id));
      const snapshotChanged = Boolean(open && (!current?.canSend || !row.account_student_id || !requesterAuthorized ||
        (cycle.approval_status === "Approved" && validPayoutApprovalCount(cycle, decisions) < REQUIRED_PAYOUT_APPROVALS) ||
        payoutApprovalSnapshot(current, row, configuredProviderName()) !== cycle.snapshot_hash));
      if (snapshotChanged) await invalidateCycle(pool, cycle, "Payout eligibility, amount, destination, provider or requester permissions changed. Request fresh approvals.");
      const approval = payoutApprovalDto(cycle, decisions, { snapshotChanged });
      const effectiveFee = Number(row.processing_fee_amount) > 0
        ? Number(row.processing_fee_amount)
        : (row.payment_method === "paymongo" ? calculateProcessingFee(row.gross_amount) : 0);
      const effectiveNet = Number(row.processing_fee_amount) > 0
        ? Number(row.net_amount)
        : Math.max(0, Number(row.gross_amount) - Number(row.commission_amount) - effectiveFee);
      const effectivePayout = current?.payoutAmountCentavos != null
        ? current.payoutAmountCentavos / 100
        : Math.max(0, effectiveNet - Number(row.refund_amount || 0));

      return {
      payoutId: row.split_id, splitId: row.split_id, orderId: row.order_id,
      orderNumber: row.order_number || `AM-${String(row.order_id).padStart(6, "0")}`,
      artworkImage: row.artwork_image || null, artworkTitle: row.artwork_title || null,
      sellerId: row.seller_id, sellerName: row.seller_name, status: row.order_status,
      paymentMethod: row.payment_method, paymentStatus: row.payment_status, paidAt: row.buyer_paid_at,
      gross: Number(row.gross_amount), commission: Number(row.commission_amount), processingFee: effectiveFee,
      net: effectiveNet, refundAmount: Number(row.refund_amount || 0), payoutAmount: effectivePayout,
      payoutStatus: row.payout_status, payoutReference: row.payout_reference,
      providerBatchId: row.provider_batch_id || null,
      providerTransferId: row.provider_transfer_id, holdReason: row.hold_reason, failureReason: row.failure_reason,
      payoutProvider: row.payout_provider || null, isDemo: false,
      providerReference: row.provider_reference || row.payout_reference,
      approval, actions: payoutApprovalActions({ approval, payoutStatus: row.payout_status, eligible: Boolean(current?.canSend),
        hasDestination: Boolean(row.account_student_id), adminId, financeAuthorized, providerEnabled: available.enabled }),
      eligibleAt: row.eligible_at, deliveredAt: row.delivered_at, settledAt: row.paid_at,
      returnStatus: row.return_statuses || "None", refundStatus: row.refund_statuses || "None",
      returnRequests: (eligibilityByOrder.get(Number(row.order_id))?.returns || []).map(value => ({
        returnRequestId: value.return_request_id, status: value.status,
        returnedAmount: value.returned_amount_centavos / 100, refundedAmount: value.succeeded_refund_centavos / 100,
      })),
      destination: row.account_student_id ? payoutAccountDto({ ...row, student_id: row.account_student_id }) : null,
    }; }));
    const totals = { held: 0, eligible: 0, processing: 0, paid: 0, failed: 0, cancelled: 0, reversed: 0, pending: 0 };
    for (const payout of orders) {
      const bucket = payout.payoutStatus.toLowerCase();
      if (bucket in totals) totals[bucket] += payout.payoutAmount;
    }
    for (const key of Object.keys(totals)) totals[key] = Number(totals[key].toFixed(2));
    totals.pending = Number((totals.held + totals.eligible + totals.processing + totals.failed).toFixed(2));
    return { currency: "PHP", totals, orders, currentAdminId: adminId || null, payoutPolicy: getPayoutHoldPolicy(), providerCapability: available };
  };

  const assertPaymentRefunds = async order => {
    if (!order.paymongo_payment_id) fail(409, "The verified buyer payment reference is missing.");
    const refunds = await rows(pool, "SELECT provider_refund_id,provider_payment_id,amount,status FROM seller_order_refund WHERE provider_payment_id = ?", [order.paymongo_payment_id]);
    const payment = await provider.inspectPaymentRefunds(order.paymongo_payment_id, { order, refunds });
    if (payment.paymentId !== order.paymongo_payment_id || payment.status !== "paid") fail(409, "The buyer payment cannot currently fund a payout.");
    for (const refund of payment.refunds) {
      if (refund.status === "failed") continue;
      const known = refunds.find(row => row.provider_refund_id === refund.id);
      if (!known || payoutToCentavos(known.amount) !== refund.amountCentavos ||
          known.status.toLowerCase() !== (refund.status === "succeeded" ? "succeeded" : "pending")) {
        fail(409, "A buyer refund requires verified order allocation before any payout from this payment.");
      }
    }
  };

  const lockedPayout = async (connection, payoutId) => {
    const seed = (await rows(connection, "SELECT order_id,seller_id FROM seller_payment_split WHERE split_id=?", [id(payoutId)]))[0];
    if (!seed) fail(404, "Payout not found.");
    // Match the established financial lock order used by returns/fulfillment.
    await rows(connection, "SELECT order_id FROM marketplace_order WHERE order_id=? FOR UPDATE", [seed.order_id]);
    await rows(connection, "SELECT student_id FROM student WHERE student_id=? FOR UPDATE", [seed.seller_id]);
    const eligibility = await loadPayoutEligibility(connection, seed.order_id, { lock: true });
    if (!eligibility || Number(eligibility.split.split_id) !== Number(payoutId)) fail(404, "Payout not found.");
    const account = (await rows(connection, "SELECT * FROM seller_payout_account WHERE student_id=? FOR UPDATE", [seed.seller_id]))[0];
    return { eligibility, account, ...(await approvalState(connection, eligibility.split, { lock: true })) };
  };
  const snapshotProblem = async (connection, context) => {
    const { eligibility, account, cycle, decisions } = context;
    if (!cycle || cycle.released_at) return null;
    const requester = await admin(connection, cycle.requested_by_admin_id, { lock: true });
    if (!eligibility.canSend || !account || !isFinanceAdmin(requester) ||
        (cycle.approval_status === "Approved" && validPayoutApprovalCount(cycle, decisions) < REQUIRED_PAYOUT_APPROVALS) ||
        cycle.snapshot_hash !== payoutApprovalSnapshot(eligibility, account, configuredProviderName())) {
      const reason = "Payout eligibility, amount, destination, provider or requester permissions changed. Request fresh approvals.";
      await invalidateCycle(connection, cycle, reason);
      return new PayoutError(409, eligibility.holdReason || reason);
    }
    return null;
  };
  const resultFor = async (payoutId, adminId) => ({ payout: (await list({ payoutId, adminId })).orders[0] });

  const request = async (payoutId, adminId, body = {}) => {
    allowedBody(body, []);
    const seed = (await rows(pool, "SELECT order_id FROM seller_payment_split WHERE split_id=?", [id(payoutId)]))[0];
    if (!seed) fail(404, "Payout not found.");
    await refreshSellerPayoutEligibility(pool, { orderId: seed.order_id });
    const payout = await transaction(async connection => {
      const context = await lockedPayout(connection, payoutId);
      await requireAdmin(connection, adminId, { lock: true });
      const { eligibility, account, cycle } = context;
      if (!eligibility.canSend) fail(409, eligibility.holdReason || "This payout is not eligible, is processing, or has already been paid.");
      if (!account) fail(422, "Seller payout destination is not configured.");
      await snapshotProblem(connection, context);
      // Re-read after a possible snapshot invalidation, under the same lock.
      const existing = (await approvalState(connection, eligibility.split)).cycle;
      if (existing && !existing.released_at && ["Pending Approval", "Approved"].includes(existing.approval_status)) {
        fail(409, "This payout already has an active approval request.");
      }
      const previous = await rows(connection, "SELECT status FROM seller_payout_attempt WHERE split_id=? ORDER BY attempt_id DESC LIMIT 1 FOR UPDATE", [payoutId]);
      if (previous.length && previous[0].status !== "Failed") fail(409, "An existing payout must be reconciled before another request.");
      const name = configuredProviderName();
      if (!["demo", "paymongo"].includes(name)) fail(503, "Payout provider is not configured.");
      const inserted = await rows(connection, `INSERT INTO seller_payout_approval_cycle
        (split_id,requested_by_admin_id,payout_provider,payout_mode,amount_centavos,snapshot_hash) VALUES (?,?,?,?,?,?)`,
      [payoutId,adminId,name,configuredProviderMode(),eligibility.payoutAmountCentavos,payoutApprovalSnapshot(eligibility, account, name)]);
      await rows(connection, "UPDATE seller_payment_split SET approval_cycle_id=? WHERE split_id=?", [inserted.insertId,payoutId]);
      await notifyAdmins(connection, eligibility.split, `Payout ${eligibility.order.order_number || `AM-${payoutId}`} requires three independent admin approvals.`);
      return eligibility.split;
    });
    await auditAction(adminId, "PAYOUT_REQUESTED", payout);
    return resultFor(payoutId, adminId);
  };

  const vote = async (payoutId, adminId, body, decision) => {
    allowedBody(body, ["comment"]);
    if (body.comment != null && typeof body.comment !== "string") fail(400, "Enter a valid approval comment.");
    const comment = body.comment?.trim() || null;
    if ((comment && comment.length > 500) || (decision === "Rejected" && !comment)) {
      fail(400, decision === "Rejected" ? "A rejection comment is required (maximum 500 characters)." : "Approval comments must be at most 500 characters.");
    }
    const outcome = await transaction(async connection => {
      let context = await lockedPayout(connection, payoutId);
      await requireAdmin(connection, adminId, { lock: true });
      let { eligibility, cycle, decisions } = context;
      if (!cycle) {
        if (eligibility.split.payout_status !== "Eligible" || !eligibility.canSend) {
          fail(409, eligibility.holdReason || "This payout is not currently eligible for approval.");
        }
        if (!context.account) fail(422, "Seller payout destination is not configured.");
        const providerName = configuredProviderName();
        const mode = configuredProviderMode();
        const snapshot = payoutApprovalSnapshot(eligibility, context.account, providerName, mode);
        const inserted = await rows(connection, `INSERT INTO seller_payout_approval_cycle
          (split_id,requested_by_admin_id,approval_status,payout_provider,payout_mode,amount_centavos,snapshot_hash)
          VALUES (?,?,'Pending Approval',?,?,?,?)`,
          [eligibility.split.split_id, adminId, providerName, mode, eligibility.payoutAmountCentavos, snapshot]);
        await rows(connection, "UPDATE seller_payment_split SET approval_cycle_id=? WHERE split_id=?", [inserted.insertId, eligibility.split.split_id]);
        context = await lockedPayout(connection, payoutId);
        cycle = context.cycle;
        decisions = context.decisions;
      }
      const problem = await snapshotProblem(connection, context);
      if (problem) return { error: problem };
      if (cycle.released_at || !["Pending Approval", "Approved"].includes(cycle.approval_status)) fail(409, "This approval cycle is closed. Request a new payout approval cycle.");
      if (decisions.some(row => Number(row.admin_id) === Number(adminId))) fail(409, "You have already voted on this payout request.");
      if (decision === "Approved" && cycle.approval_status === "Approved") fail(409, "This payout already has required approval.");
      await rows(connection, "INSERT INTO seller_payout_approval (cycle_id,admin_id,decision,comment) VALUES (?,?,?,?)", [cycle.cycle_id,adminId,decision,comment]);
      const current = await approvalState(connection, eligibility.split, { lock: true });
      const count = validPayoutApprovalCount(cycle, current.decisions);
      const status = decision === "Rejected" ? "Rejected" : count >= REQUIRED_PAYOUT_APPROVALS ? "Approved" : "Pending Approval";
      await rows(connection, `UPDATE seller_payout_approval_cycle SET approval_status=?,
        approved_at=IF(?='Approved',CURRENT_TIMESTAMP,NULL) WHERE cycle_id=?`, [status,status,cycle.cycle_id]);
      await notifyAdmins(connection, eligibility.split, status === "Rejected" ? `Payout ${eligibility.order.order_number} was rejected.` :
        status === "Approved" ? `Payout ${eligibility.order.order_number} is approved for release.` :
          `Payout ${eligibility.order.order_number} has ${count} of 1 approval.`);
      return { payout: eligibility.split };
    });
    if (outcome.error) throw outcome.error;
    await auditAction(adminId, decision === "Approved" ? "PAYOUT_APPROVED" : "PAYOUT_REJECTED", outcome.payout);
    return resultFor(payoutId, adminId);
  };
  const approve = (payoutId, adminId, body = {}) => vote(payoutId, adminId, body, "Approved");
  const reject = (payoutId, adminId, body = {}) => vote(payoutId, adminId, body, "Rejected");
  const approvals = async (payoutId, adminId) => {
    await requireAdmin(pool, adminId);
    const { payout } = await resultFor(payoutId, adminId);
    if (!payout) fail(404, "Payout not found.");
    return { approval: payout.approval };
  };

  const applyTransfer = async (attemptId, transfer) => {
    const persisted = (await rows(pool, "SELECT payout_provider,payout_mode FROM seller_payout_attempt WHERE attempt_id=?", [attemptId]))[0];
    if (!persisted) fail(404, "Payout attempt not found.");
    const providerName = persisted.payout_provider || "paymongo";
    const currentMode = providerName === "demo" ? "demo" : (await adapterFor(providerName).getPayoutCapability()).mode;
    if (currentMode !== persisted.payout_mode) fail(409, "Payout credential mode changed. Restore the original provider mode before reconciliation.");
    const expectedLive = persisted.payout_mode === "live";
    return transaction(async connection => {
    const seed = (await rows(connection, "SELECT s.order_id FROM seller_payout_attempt a JOIN seller_payment_split s ON s.split_id=a.split_id WHERE a.attempt_id=?", [attemptId]))[0];
    if (!seed) fail(404, "Payout attempt not found.");
    await rows(connection, "SELECT order_id FROM marketplace_order WHERE order_id=? FOR UPDATE", [seed.order_id]);
    const attempt = (await rows(connection, "SELECT * FROM seller_payout_attempt WHERE attempt_id=? FOR UPDATE", [attemptId]))[0];
    const split = (await rows(connection, "SELECT * FROM seller_payment_split WHERE split_id=? FOR UPDATE", [attempt.split_id]))[0];
    if (transfer.reference !== attempt.provider_reference || transfer.amountCentavos !== Number(attempt.amount_centavos) ||
        transfer.currency !== "PHP" || transfer.livemode !== expectedLive ||
        (providerName === "demo" ? transfer.payoutProvider !== "demo" : transfer.payoutProvider === "demo") ||
        transfer.destination?.institutionCode !== attempt.institution_code ||
        transfer.destination?.accountNumber !== decryptPayoutAccount(attempt.account_number_ciphertext, split.seller_id) ||
        transfer.destination?.accountName !== attempt.account_name || transfer.provider !== attempt.institution_provider ||
        (attempt.provider_transfer_id && attempt.provider_transfer_id !== transfer.id) ||
        !["pending", "succeeded", "failed"].includes(transfer.status)) fail(502, "Provider transfer does not match this payout. Reconciliation is required.");
    if (attempt.status === "Paid" || split.payout_status === "Paid") return split;
    if (attempt.status === "Failed" && transfer.status !== "failed") fail(409, "Provider transfer conflicts with a terminal payout result.");
    const status = transfer.status === "succeeded" ? "Paid" : transfer.status === "failed" ? "Failed" : "Processing";
    // An old failed attempt cannot overwrite a newer attempt or its successful result.
    const latest = (await rows(connection, "SELECT MAX(attempt_id) AS attempt_id FROM seller_payout_attempt WHERE split_id=?", [split.split_id]))[0];
    if (Number(latest.attempt_id) !== Number(attemptId)) return split;
    const failureMessage = status === "Failed"
      ? (transfer.failureCode ? `The provider confirmed that the transfer failed (${transfer.failureCode}).` : "The provider confirmed that the transfer failed.")
      : null;
    await rows(connection, `UPDATE seller_payout_attempt SET provider_batch_id=COALESCE(?,provider_batch_id),provider_transfer_id=?,status=?,failure_reason=?,
      paid_at=IF(?='Paid',COALESCE(paid_at,CURRENT_TIMESTAMP),paid_at),failed_at=IF(?='Failed',COALESCE(failed_at,CURRENT_TIMESTAMP),failed_at)
      WHERE attempt_id=?`, [transfer.batchId || null, transfer.id, status, failureMessage, status, status, attemptId]);
    await rows(connection, `UPDATE seller_payment_split SET payout_status=?,provider_batch_id=COALESCE(?,provider_batch_id),provider_transfer_id=?,provider_reference=?,payout_provider=?,
      payout_reference=?,failure_reason=?,paid_at=IF(?='Paid',COALESCE(paid_at,CURRENT_TIMESTAMP),paid_at),
      failed_at=IF(?='Failed',COALESCE(failed_at,CURRENT_TIMESTAMP),failed_at) WHERE split_id=?`,
    [status, transfer.batchId || null, transfer.id, transfer.providerReference || attempt.provider_reference, providerName, attempt.provider_reference,
      failureMessage, status, status, split.split_id]);
    if (split.payout_status !== status) await rows(connection, `INSERT INTO account_notifications (role,account_id,notification_type,message,order_id)
      VALUES ('seller',?,'payout',?,?)`, [split.seller_id, providerName === "demo"
        ? `Demo payout for order AM-${String(split.order_id).padStart(6, "0")} is ${status.toLowerCase()}. Simulation only; no money moved.`
        : `Payout for order AM-${String(split.order_id).padStart(6, "0")} is ${status.toLowerCase()}.`, split.order_id]);
    return { ...split, payout_status: status, payout_provider: providerName };
    });
  };

  const send = async (payoutId, adminId, body = {}) => {
    allowedBody(body, []);
    await requireAdmin(pool, adminId);
    const initialSplit = (await rows(pool, "SELECT * FROM seller_payment_split WHERE split_id=?", [id(payoutId)]))[0];
    if (!initialSplit) fail(404, "Payout not found.");
    if (["Paid", "Processing"].includes(initialSplit.payout_status)) fail(409, "This payout is already processing or has already been paid.");
    const initialApproval = await approvalState(pool, initialSplit);
    if (!initialApproval.cycle || initialApproval.cycle.approval_status !== "Approved" ||
        validPayoutApprovalCount(initialApproval.cycle, initialApproval.decisions) < REQUIRED_PAYOUT_APPROVALS) {
      fail(409, "One authorized admin approval is required before release.");
    }
    const available = await capability();
    if (!available.enabled) fail(503, available.message || "PayMongo Wallet payouts are not enabled.");
    const seed = (await rows(pool, "SELECT o.* FROM seller_payment_split s JOIN marketplace_order o ON o.order_id=s.order_id WHERE s.split_id=?", [id(payoutId)]))[0];
    if (!seed) fail(404, "Payout not found.");
    await assertPaymentRefunds(seed);
    // Network preflight happens before any MySQL lock; the provider also enforces its balance.
    await provider.getPayoutWallet();
    const reserved = await transaction(async connection => {
      const context = await lockedPayout(connection, payoutId);
      await requireAdmin(connection, adminId, { lock: true });
      const { eligibility, account, cycle, decisions } = context;
      const split = eligibility.split;
      const problem = await snapshotProblem(connection, context);
      if (problem) return { error: problem };
      if (split.payout_status !== "Eligible" || !eligibility.canSend) fail(409, eligibility.holdReason || "This payout is not eligible, is already processing, or has already been paid.");
      if (!cycle || cycle.approval_status !== "Approved" || cycle.released_at ||
          validPayoutApprovalCount(cycle, decisions) < REQUIRED_PAYOUT_APPROVALS) fail(409, "One authorized admin approval is required before release.");
      const previous = await rows(connection, "SELECT * FROM seller_payout_attempt WHERE split_id=? ORDER BY attempt_id DESC LIMIT 1 FOR UPDATE", [payoutId]);
      if (previous.length && previous[0].status !== "Failed") fail(409, "An existing payout must be reconciled before another attempt.");
      if (!account) fail(422, "Seller payout destination is not configured.");
      const providerName = configuredProviderName();
      if (cycle.payout_provider !== providerName) fail(409, "Payout provider changed. Request fresh approvals.");
      const reference = provider.createPayoutReference?.(payoutId, providerName) || `AM-PO-${payoutId}-${randomUUID()}`;
      const result = await rows(connection, `INSERT INTO seller_payout_attempt (split_id,payout_provider,payout_mode,provider_reference,status,amount_centavos,currency,
        destination_type,institution_code,institution_name,institution_provider,account_name,account_number_ciphertext,admin_id)
        VALUES (?,?,?,?,'Processing',?,'PHP',?,?,?,?,?,?,?)`, [payoutId, providerName, configuredProviderMode(), reference, eligibility.payoutAmountCentavos,
        account.destination_type,account.institution_code,account.institution_name,account.institution_provider,
        account.account_name,account.account_number_ciphertext,adminId]);
      await rows(connection, `UPDATE seller_payment_split SET payout_status='Processing',payout_amount=?,refund_amount=?,
        requested_at=CURRENT_TIMESTAMP,payout_reference=?,payout_provider=?,provider_batch_id=NULL,provider_transfer_id=NULL,provider_reference=NULL,failure_reason=NULL WHERE split_id=?`,
      [eligibility.payoutAmountCentavos / 100, eligibility.refundAmountCentavos / 100, reference, providerName, payoutId]);
      await rows(connection, "UPDATE seller_payout_approval_cycle SET released_by_admin_id=?,released_at=CURRENT_TIMESTAMP WHERE cycle_id=? AND released_at IS NULL", [adminId,cycle.cycle_id]);
      return { attemptId: result.insertId, split, providerName, amountCentavos: eligibility.payoutAmountCentavos, reference,
        destination: { accountNumber: decryptPayoutAccount(account.account_number_ciphertext, seed.seller_id),
          accountName: account.account_name,institutionCode: account.institution_code,provider: account.institution_provider } };
    });
    if (reserved.error) throw reserved.error;
    await auditAction(adminId, "PAYOUT_RELEASED", { ...reserved.split, payout_amount: reserved.amountCentavos / 100 });
    try {
      const transfer = await adapterFor(reserved.providerName).createPayoutTransfer({ amountCentavos: reserved.amountCentavos,
        reference: reserved.reference, destination: reserved.destination });
      const result = await applyTransfer(reserved.attemptId, transfer);
      await auditAction(adminId, result.payout_status === "Paid" ? (reserved.providerName === "demo" ? "PAYOUT_DEMO_SUCCEEDED" : "PAYOUT_SUCCEEDED") : result.payout_status === "Failed" ? "PAYOUT_FAILED" : "PAYOUT_PROCESSING", result);
      return resultFor(payoutId, adminId);
    } catch (error) {
      // A timeout or persistence error can occur after money moved. Keep the
      // reservation and reconcile by its durable reference; never resend here.
      const definitive = typeof provider.PayoutProviderError === "function" && error instanceof provider.PayoutProviderError && error.ambiguous === false;
      await transaction(async connection => {
        await rows(connection, "SELECT order_id FROM marketplace_order WHERE order_id=? FOR UPDATE", [seed.order_id]);
        const attempt = (await rows(connection, "SELECT * FROM seller_payout_attempt WHERE attempt_id=? FOR UPDATE", [reserved.attemptId]))[0];
        if (attempt.status !== "Processing") return;
        await rows(connection, "UPDATE seller_payout_attempt SET status=?,failure_reason=? WHERE attempt_id=?", [definitive ? "Failed" : "Unknown", definitive ? "Provider rejected the transfer before acceptance." : "Transfer result is unknown. Reconcile before retrying.", reserved.attemptId]);
        await rows(connection, "UPDATE seller_payment_split SET payout_status=?,failure_reason=?,failed_at=IF(?,CURRENT_TIMESTAMP,failed_at) WHERE split_id=? AND payout_status='Processing'",
          [definitive ? "Failed" : "Processing", definitive ? "Provider rejected the transfer. Review the destination or Wallet balance." : "Transfer confirmation is pending. Reconcile before retrying.", definitive, payoutId]);
      });
      await auditAction(adminId, "PAYOUT_FAILED", { ...reserved.split, payout_amount: reserved.amountCentavos / 100 }, definitive ? "FAILED" : "UNKNOWN");
      throw error;
    }
  };

  const reconcile = async (payoutId, adminId, body = {}) => {
    allowedBody(body, []);
    await requireAdmin(pool, adminId);
    const attempt = (await rows(pool, "SELECT * FROM seller_payout_attempt WHERE split_id=? ORDER BY attempt_id DESC LIMIT 1", [id(payoutId)]))[0];
    if (!attempt) fail(409, "This payout has no provider attempt to reconcile.");
    const adapter = adapterFor(attempt.payout_provider || "paymongo");
    const originalMode = attempt.payout_mode || "test";
    if ((attempt.payout_provider === "demo" ? "demo" : (await adapter.getPayoutCapability()).mode) !== originalMode) {
      fail(409, "Payout credential mode changed. Restore the original provider mode before reconciliation.");
    }
    const split = (await rows(pool, "SELECT seller_id FROM seller_payment_split WHERE split_id=?", [payoutId]))[0];
    const frozen = { reference: attempt.provider_reference, amountCentavos: Number(attempt.amount_centavos),
      destination: { accountNumber: decryptPayoutAccount(attempt.account_number_ciphertext, split.seller_id),
        accountName: attempt.account_name, institutionCode: attempt.institution_code, provider: attempt.institution_provider } };
    const transfer = attempt.provider_transfer_id
      ? await adapter.retrievePayoutTransfer(attempt.provider_transfer_id, frozen)
      : await adapter.findPayoutTransferByReference(attempt.provider_reference, frozen);
    if (!transfer && attempt.status !== "Failed") fail(409, "No conclusive provider result was found. The payout remains reserved; do not resend it.");
    if (transfer) await applyTransfer(attempt.attempt_id, transfer);
    if ((!transfer && attempt.status === "Failed") || transfer?.status === "failed") {
      await transaction(async connection => {
        const split = (await rows(connection, "SELECT order_id FROM seller_payment_split WHERE split_id=?", [payoutId]))[0];
        const eligibility = await loadPayoutEligibility(connection, split.order_id, { lock: true });
        if (eligibility.nextStatus === "Eligible" && eligibility.split.payout_status === "Failed") {
          await rows(connection, "UPDATE seller_payment_split SET payout_status='Eligible',hold_reason=NULL WHERE split_id=? AND payout_status='Failed'", [payoutId]);
        }
      });
    }
    const payout = (await list({ payoutId, adminId })).orders[0];
    await auditAction(adminId, "PAYOUT_RECONCILED", { split_id: payoutId,order_id: payout.orderId,seller_id: payout.sellerId,payout_amount: payout.payoutAmount });
    return { payout };
  };

  const handleTransferEvent = async event => {
    const resource = event?.data;
    // Signed events only trigger a server-side status lookup. Never trust a
    // browser callback or nested status field as final transfer confirmation.
    const transferId = resource?.attributes?.transfer_id || resource?.transfer_id ||
      (String(resource?.id || "").startsWith("tr_") ? resource.id : null);
    if (!transferId) return { ignored: true };
    const attempt = (await rows(pool, "SELECT attempt_id,payout_provider FROM seller_payout_attempt WHERE provider_transfer_id=?", [transferId]))[0];
    if (!attempt || attempt.payout_provider === "demo") return { ignored: true };
    const result = await applyTransfer(attempt.attempt_id, await adapterFor("paymongo").retrievePayoutTransfer(transferId));
    await auditAction(null, result.payout_status === "Paid" ? "PAYOUT_SUCCEEDED" : "PAYOUT_STATUS_UPDATED", result);
    return { payout_status: result.payout_status };
  };

  const verifyRefund = async (payoutId, adminId, body = {}) => {
    allowedBody(body, ["providerRefundId", "returnRequestId"]);
    await requireAdmin(pool, adminId);
    if (typeof body.providerRefundId !== "string" || !/^[a-zA-Z0-9_-]{4,100}$/.test(body.providerRefundId)) fail(400, "Enter a valid provider refund ID.");
    const requestId = body.returnRequestId == null || body.returnRequestId === "" ? null : id(body.returnRequestId);
    const refund = await provider.retrievePayoutRefund(body.providerRefundId);
    if (refund.id !== body.providerRefundId || refund.currency !== "PHP" ||
        refund.livemode !== ((await capability()).mode === "live") ||
        !Number.isSafeInteger(refund.amountCentavos) || refund.amountCentavos <= 0 ||
        !["pending", "processing", "succeeded", "failed"].includes(refund.status)) fail(502, "Unable to verify this refund with PayMongo.");
    const state = refund.status === "succeeded" ? "Succeeded" : refund.status === "failed" ? "Failed" : "Pending";
    await transaction(async connection => {
      const seed = (await rows(connection, "SELECT order_id FROM seller_payment_split WHERE split_id=?", [id(payoutId)]))[0];
      if (!seed) fail(404, "Payout not found.");
      const current = await loadPayoutEligibility(connection, seed.order_id, { lock: true });
      if (!current || current.order.payment_method !== "paymongo" || !["Paid", "Refunded"].includes(current.order.payment_status)) fail(409, "Only confirmed online payments can have payout refund evidence.");
      if (["Processing", "Paid"].includes(current.split.payout_status)) fail(409, "This payout is already reserved or paid. Contact support to resolve the refund.");
      if (current.order.paymongo_payment_id !== refund.paymentId || refund.amountCentavos > payoutToCentavos(current.order.total_amount)) fail(409, "This refund does not match this seller order. Shared-payment refunds require explicit order-level resolution.");
      if (requestId) {
        const request = current.returns.find(value => value.return_request_id === requestId);
        if (!request || ["Rejected", "Cancelled"].includes(request.status) || refund.amountCentavos > request.returned_amount_centavos) fail(409, "This refund does not match the selected returned items.");
        const allocated = current.refunds.filter(value => Number(value.return_request_id) === requestId &&
          value.provider_refund_id !== refund.id && value.status !== "Failed").reduce((sum, value) => sum + payoutToCentavos(value.amount), 0);
        if (state !== "Failed" && allocated + refund.amountCentavos > request.returned_amount_centavos) fail(409, "Refund evidence exceeds the returned item value.");
      }
      const allocated = current.refunds.filter(value => value.provider_refund_id !== refund.id && value.status !== "Failed")
        .reduce((sum, value) => sum + payoutToCentavos(value.amount), 0);
      if (state !== "Failed" && allocated + refund.amountCentavos > payoutToCentavos(current.order.total_amount)) fail(409, "Refund evidence exceeds this seller order value.");
      const previous = (await rows(connection, "SELECT * FROM seller_order_refund WHERE provider_refund_id=? FOR UPDATE", [refund.id]))[0];
      if (previous && (Number(previous.order_id) !== seed.order_id || previous.provider_payment_id !== refund.paymentId ||
          payoutToCentavos(previous.amount) !== refund.amountCentavos || Number(previous.return_request_id || 0) !== Number(requestId || 0))) fail(409, "This provider refund is already allocated to an order or return.");
      if (previous?.status === "Succeeded" && state !== "Succeeded") fail(409, "A successful refund cannot be reversed by stale provider data.");
      await rows(connection, `INSERT INTO seller_order_refund (order_id,return_request_id,provider_refund_id,provider_payment_id,amount,status)
        VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)`,
      [seed.order_id,requestId,refund.id,refund.paymentId,refund.amountCentavos / 100,state]);
    });
    const payout = (await list({ payoutId, adminId })).orders[0];
    await auditAction(adminId, "PAYOUT_REFUND_VERIFIED", { split_id: payoutId,order_id: payout.orderId,seller_id: payout.sellerId,payout_amount: payout.payoutAmount });
    return { payout, refundStatus: state };
  };

  const listAccountRequests = async ({ status, adminId } = {}) => {
    let currentAdmin = null;
    if (adminId != null) {
      currentAdmin = await admin(pool, adminId);
    }
    const financeAuthorized = currentAdmin != null && isFinanceAdmin(currentAdmin);
    const filterStatus = status && status !== "All" ? status : null;
    const reqRows = await rows(pool, `
      SELECT r.*,
        st.first_name, st.last_name, st.email, st.profile_image,
        pa.destination_type AS current_destination_type,
        pa.institution_code AS current_institution_code,
        pa.institution_name AS current_institution_name,
        pa.institution_provider AS current_institution_provider,
        pa.account_name AS current_account_name,
        pa.account_number_ciphertext AS current_account_number_ciphertext,
        (SELECT COUNT(DISTINCT a.admin_id) FROM seller_payout_account_approval a
          JOIN admin ad ON ad.admin_id = a.admin_id
          JOIN admin_role ar ON ar.admin_id = ad.admin_id
          LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=ad.admin_id
          LEFT JOIN admin_payout_permission_request perm ON perm.admin_id=ad.admin_id
          WHERE a.request_id = r.request_id AND a.decision = 'Approved'
            AND COALESCE(ac.is_banned,0)=0
            AND (ar.role IN ('admin','super admin') OR (ar.role IN ('moderator','customize') AND perm.status='Approved'))
        ) AS approval_count,
        (SELECT COUNT(*) FROM seller_payout_account_approval a WHERE a.request_id = r.request_id AND a.admin_id = ?) AS user_voted
      FROM seller_payout_account_request r
      JOIN student st ON st.student_id = r.student_id
      LEFT JOIN seller_payout_account pa ON pa.student_id = r.student_id
      WHERE (? IS NULL OR r.status = ?)
      ORDER BY (CASE WHEN r.status = 'Pending' THEN 0 ELSE 1 END), r.requested_at DESC
    `, [adminId || 0, filterStatus, filterStatus]);

    const requestIds = reqRows.map(r => r.request_id);
    let allDecisions = [];
    if (requestIds.length > 0) {
      allDecisions = await rows(pool, `
        SELECT a.*, CONCAT(ad.first_name, ' ', ad.last_name) AS admin_name, ar.role,
          COALESCE(ac.is_banned,0) AS is_banned,
          (SELECT p.status FROM admin_payout_permission_request p WHERE p.admin_id=a.admin_id LIMIT 1) AS payout_permission
        FROM seller_payout_account_approval a
        JOIN admin ad ON ad.admin_id = a.admin_id
        LEFT JOIN admin_role ar ON ar.admin_id = ad.admin_id
        LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=ad.admin_id
        WHERE a.request_id IN (${requestIds.map(() => "?").join(",")})
        ORDER BY a.approval_id ASC
      `, requestIds);
    }

    const decisionsByReq = new Map();
    for (const d of allDecisions) {
      if (!decisionsByReq.has(d.request_id)) decisionsByReq.set(d.request_id, []);
      decisionsByReq.get(d.request_id).push({
        approvalId: d.approval_id,
        adminId: d.admin_id,
        adminName: d.admin_name,
        decision: d.decision,
        comment: d.comment,
        createdAt: d.created_at,
        authorized: isFinanceAdmin(d),
      });
    }

    const requests = reqRows.map(r => {
      let requestedMasked = "••••••••";
      try {
        requestedMasked = maskPayoutAccount(decryptPayoutAccount(r.account_number_ciphertext, r.student_id));
      } catch {}
      let currentMasked = null;
      if (r.current_account_number_ciphertext) {
        try {
          currentMasked = maskPayoutAccount(decryptPayoutAccount(r.current_account_number_ciphertext, r.student_id));
        } catch {}
      }
      const userVoted = Number(r.user_voted || 0) > 0;
      const canVote = financeAuthorized && r.status === "Pending" && !userVoted;
      return {
        requestId: r.request_id,
        studentId: r.student_id,
        studentName: `${r.first_name || ""} ${r.last_name || ""}`.trim() || `Student ${r.student_id}`,
        studentEmail: r.email || "",
        studentAvatar: r.profile_image ? (r.profile_image.startsWith("http") ? r.profile_image : `/uploads/seller/uploadProfile/${encodeURIComponent(r.profile_image)}`) : null,
        status: r.status,
        destinationType: r.destination_type,
        institutionCode: r.institution_code,
        institutionName: r.institution_name,
        institutionProvider: r.institution_provider,
        accountName: r.account_name,
        maskedAccountNumber: requestedMasked,
        currentDestination: r.current_institution_name ? {
          institutionName: r.current_institution_name,
          accountName: r.current_account_name,
          maskedAccountNumber: currentMasked,
        } : null,
        approvalCount: Number(r.approval_count || 0),
        requiredApprovals: REQUIRED_PAYOUT_ACCOUNT_APPROVALS,
        rejectionReason: r.rejection_reason,
        requestedAt: r.requested_at,
        approvedAt: r.approved_at,
        rejectedAt: r.rejected_at,
        decisions: decisionsByReq.get(r.request_id) || [],
        canApprove: canVote,
        canReject: canVote,
        userVoted,
      };
    });

    return { requests, requiredApprovals: REQUIRED_PAYOUT_ACCOUNT_APPROVALS };
  };

  const approveAccountRequest = async (requestId, adminId, body = {}) => {
    allowedBody(body, ["comment"]);
    const comment = body.comment?.trim() || null;
    const reqId = id(requestId);
    const updated = await transaction(async connection => {
      await requireAdmin(connection, adminId, { lock: true });
      const reqList = await rows(connection, "SELECT * FROM seller_payout_account_request WHERE request_id = ? FOR UPDATE", [reqId]);
      if (!reqList.length) fail(404, "Payout account change request not found.");
      const req = reqList[0];
      if (req.status !== "Pending") fail(409, "This change request is already resolved.");

      const existingVote = await rows(connection, "SELECT * FROM seller_payout_account_approval WHERE request_id = ? AND admin_id = ?", [reqId, adminId]);
      if (existingVote.length) fail(409, "You have already voted on this payout account request.");

      await rows(connection, "INSERT INTO seller_payout_account_approval (request_id, admin_id, decision, comment) VALUES (?, ?, 'Approved', ?)", [reqId, adminId, comment]);

      const validVotes = await rows(connection, `
        SELECT a.admin_id, r.role, COALESCE(ac.is_banned,0) AS is_banned,
          (SELECT p.status FROM admin_payout_permission_request p WHERE p.admin_id=a.admin_id LIMIT 1) AS payout_permission
        FROM seller_payout_account_approval a
        JOIN admin ad ON ad.admin_id=a.admin_id
        JOIN admin_role r ON r.admin_id=a.admin_id
        LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=a.admin_id
        WHERE a.request_id = ? AND a.decision = 'Approved'
      `, [reqId]);
      const validCount = new Set(validVotes.filter(v => isFinanceAdmin(v)).map(v => Number(v.admin_id))).size;

      let approved = false;
      if (validCount >= REQUIRED_PAYOUT_ACCOUNT_APPROVALS) {
        approved = true;
        await rows(connection, "UPDATE seller_payout_account_request SET status = 'Approved', approved_at = CURRENT_TIMESTAMP WHERE request_id = ?", [reqId]);
        await rows(connection, `
          INSERT INTO seller_payout_account (student_id, destination_type, institution_code, institution_name, institution_provider, account_name, account_number_ciphertext)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            destination_type = VALUES(destination_type),
            institution_code = VALUES(institution_code),
            institution_name = VALUES(institution_name),
            institution_provider = VALUES(institution_provider),
            account_name = VALUES(account_name),
            account_number_ciphertext = VALUES(account_number_ciphertext),
            updated_at = CURRENT_TIMESTAMP
        `, [req.student_id, req.destination_type, req.institution_code, req.institution_name, req.institution_provider, req.account_name, req.account_number_ciphertext]);

        await rows(connection, `
          INSERT INTO account_notifications (role, account_id, notification_type, message)
          VALUES ('seller', ?, 'payout', 'Your payout destination change request has been approved by 3 administrators and updated.')
        `, [req.student_id]);
      }

      return { req, validCount, approved };
    });

    await audit({
      action: updated.approved ? "PAYOUT_ACCOUNT_APPROVED" : "PAYOUT_ACCOUNT_VOTED",
      actor: String(adminId),
      role: "Admin",
      status: "SUCCESS",
      information: `Payout account request ${reqId} for student ${updated.req.student_id} approved (${updated.validCount}/${REQUIRED_PAYOUT_ACCOUNT_APPROVALS}).`,
    }).catch(err => console.error("Payout account approval audit failed:", err));

    return (await listAccountRequests({ adminId })).requests.find(r => r.requestId === reqId);
  };

  const rejectAccountRequest = async (requestId, adminId, body = {}) => {
    allowedBody(body, ["reason", "comment"]);
    const reason = (body.reason || body.comment || "").trim();
    if (!reason || reason.length > 500) fail(400, "A rejection reason is required (maximum 500 characters).");
    const reqId = id(requestId);
    const updated = await transaction(async connection => {
      await requireAdmin(connection, adminId, { lock: true });
      const reqList = await rows(connection, "SELECT * FROM seller_payout_account_request WHERE request_id = ? FOR UPDATE", [reqId]);
      if (!reqList.length) fail(404, "Payout account change request not found.");
      const req = reqList[0];
      if (req.status !== "Pending") fail(409, "This change request is already resolved.");

      await rows(connection, "INSERT INTO seller_payout_account_approval (request_id, admin_id, decision, comment) VALUES (?, ?, 'Rejected', ?)", [reqId, adminId, reason]);
      await rows(connection, "UPDATE seller_payout_account_request SET status = 'Rejected', rejection_reason = ?, rejected_at = CURRENT_TIMESTAMP WHERE request_id = ?", [reason, reqId]);

      await rows(connection, `
        INSERT INTO account_notifications (role, account_id, notification_type, message)
        VALUES ('seller', ?, 'payout', CONCAT('Your payout destination change request was rejected: ', ?))
      `, [req.student_id, reason]);

      return req;
    });

    await audit({
      action: "PAYOUT_ACCOUNT_REJECTED",
      actor: String(adminId),
      role: "Admin",
      status: "SUCCESS",
      information: `Payout account request ${reqId} for student ${updated.student_id} was rejected. Reason: ${reason}`,
    }).catch(err => console.error("Payout account reject audit failed:", err));

    return (await listAccountRequests({ adminId })).requests.find(r => r.requestId === reqId);
  };

  const getAdminPermissionStatus = async adminId => {
    const actor = await admin(pool, adminId);
    if (!actor) fail(404, "Admin not found.");
    const role = actor.role;
    if (["admin", "super admin"].includes(role)) {
      return {
        role,
        permissionStatus: "Approved",
        isAuthorized: true,
        canRequest: false,
        request: null,
      };
    }
    const permRows = await rows(pool, "SELECT * FROM admin_payout_permission_request WHERE admin_id = ?", [id(adminId)]);
    const req = permRows[0] || null;
    const status = req ? req.status : "Not Requested";
    return {
      role,
      permissionStatus: status,
      isAuthorized: status === "Approved",
      canRequest: status === "Not Requested" || status === "Rejected",
      request: req ? {
        requestId: req.request_id,
        status: req.status,
        reason: req.reason,
        rejectionReason: req.rejection_reason,
        requestedAt: req.requested_at,
        reviewedAt: req.reviewed_at,
      } : null,
    };
  };

  const requestAdminPayoutPermission = async (adminId, body = {}) => {
    allowedBody(body, ["reason", "notes"]);
    const reason = (body.reason || body.notes || "").trim() || null;
    const actor = await admin(pool, adminId);
    if (!actor) fail(404, "Admin not found.");
    if (!["moderator", "customize"].includes(actor.role)) {
      fail(400, "Only Customizable or Moderation admins need to request payout permissions.");
    }
    const existing = (await rows(pool, "SELECT * FROM admin_payout_permission_request WHERE admin_id = ?", [id(adminId)]))[0];
    if (existing && existing.status === "Pending") {
      fail(409, "A permission request is already pending review.");
    }
    if (existing && existing.status === "Approved") {
      fail(409, "You already have permission to manage student payouts.");
    }

    await transaction(async connection => {
      await rows(connection, `
        INSERT INTO admin_payout_permission_request (admin_id, status, reason, requested_at)
        VALUES (?, 'Pending', ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          status = 'Pending',
          reason = VALUES(reason),
          reviewed_by_admin_id = NULL,
          rejection_reason = NULL,
          requested_at = CURRENT_TIMESTAMP,
          reviewed_at = NULL
      `, [adminId, reason]);

      await rows(connection, `
        INSERT INTO account_notifications (role, account_id, notification_type, message)
        SELECT 'admin', a.admin_id, 'payout', CONCAT('Admin ', ?, ' requested permission to manage student payouts.')
        FROM admin a JOIN admin_role r ON r.admin_id=a.admin_id
        LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=a.admin_id
        WHERE r.role = 'super admin' AND COALESCE(ac.is_banned,0)=0
      `, [actor.admin_name || `Admin ${adminId}`]);
    });

    await audit({
      action: "ADMIN_PAYOUT_PERMISSION_REQUESTED",
      actor: String(adminId),
      role: "Admin",
      status: "SUCCESS",
      information: `Admin ${actor.admin_name || adminId} (${actor.role}) requested permission to manage student payouts.`,
    }).catch(err => console.error("Payout permission request audit failed:", err));

    return getAdminPermissionStatus(adminId);
  };

  const listAdminPermissionRequests = async superAdminId => {
    const actor = (await rows(pool, `
      SELECT r.role, COALESCE(ac.is_banned,0) AS is_banned
      FROM admin_role r
      LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=r.admin_id
      WHERE r.admin_id = ?
    `, [id(superAdminId)]))[0];
    if (!actor || actor.role !== "super admin" || Number(actor.is_banned) !== 0) {
      fail(403, "Only Super Admins can review payout permission requests.");
    }

    const requests = await rows(pool, `
      SELECT p.*,
        CONCAT(a.first_name, ' ', a.last_name) AS admin_name,
        a.email AS admin_email,
        a.image AS admin_image,
        r.role AS admin_role,
        CONCAT(rev.first_name, ' ', rev.last_name) AS reviewer_name
      FROM admin_payout_permission_request p
      JOIN admin a ON a.admin_id = p.admin_id
      JOIN admin_role r ON r.admin_id = a.admin_id
      LEFT JOIN admin rev ON rev.admin_id = p.reviewed_by_admin_id
      ORDER BY (CASE WHEN p.status = 'Pending' THEN 0 ELSE 1 END), p.requested_at DESC
    `);

    return {
      requests: requests.map(r => ({
        requestId: r.request_id,
        adminId: r.admin_id,
        adminName: r.admin_name,
        adminEmail: r.admin_email,
        adminAvatar: r.admin_image ? (r.admin_image.startsWith("http") ? r.admin_image : `/uploads/admin/uploadAdmin/${encodeURIComponent(r.admin_image)}`) : null,
        adminRole: r.admin_role,
        status: r.status,
        reason: r.reason,
        rejectionReason: r.rejection_reason,
        reviewerName: r.reviewer_name,
        requestedAt: r.requested_at,
        reviewedAt: r.reviewed_at,
      })),
    };
  };

  const approveAdminPermissionRequest = async (superAdminId, requestId) => {
    const reqId = id(requestId);
    const actor = (await rows(pool, `
      SELECT r.role, COALESCE(ac.is_banned,0) AS is_banned
      FROM admin_role r
      LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=r.admin_id
      WHERE r.admin_id = ?
    `, [id(superAdminId)]))[0];
    if (!actor || actor.role !== "super admin" || Number(actor.is_banned) !== 0) {
      fail(403, "Only Super Admins can approve payout permission requests.");
    }

    const target = await transaction(async connection => {
      const list = await rows(connection, "SELECT * FROM admin_payout_permission_request WHERE request_id = ? FOR UPDATE", [reqId]);
      if (!list.length) fail(404, "Permission request not found.");
      const req = list[0];
      await rows(connection, `
        UPDATE admin_payout_permission_request
        SET status = 'Approved', reviewed_by_admin_id = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = NULL
        WHERE request_id = ?
      `, [superAdminId, reqId]);

      await rows(connection, `
        INSERT INTO account_notifications (role, account_id, notification_type, message)
        VALUES ('admin', ?, 'payout', 'Your request for permission to manage student payouts has been approved by a Super Admin.')
      `, [req.admin_id]);

      return req;
    });

    await audit({
      action: "ADMIN_PAYOUT_PERMISSION_APPROVED",
      actor: String(superAdminId),
      role: "Super Admin",
      status: "SUCCESS",
      information: `Payout permission approved for Admin ${target.admin_id}.`,
    }).catch(err => console.error("Payout permission approval audit failed:", err));

    return { success: true, status: "Approved" };
  };

  const rejectAdminPermissionRequest = async (superAdminId, requestId, body = {}) => {
    allowedBody(body, ["reason", "rejectionReason"]);
    const reason = (body.reason || body.rejectionReason || "").trim() || null;
    const reqId = id(requestId);
    const actor = (await rows(pool, `
      SELECT r.role, COALESCE(ac.is_banned,0) AS is_banned
      FROM admin_role r
      LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=r.admin_id
      WHERE r.admin_id = ?
    `, [id(superAdminId)]))[0];
    if (!actor || actor.role !== "super admin" || Number(actor.is_banned) !== 0) {
      fail(403, "Only Super Admins can reject payout permission requests.");
    }

    const target = await transaction(async connection => {
      const list = await rows(connection, "SELECT * FROM admin_payout_permission_request WHERE request_id = ? FOR UPDATE", [reqId]);
      if (!list.length) fail(404, "Permission request not found.");
      const req = list[0];
      await rows(connection, `
        UPDATE admin_payout_permission_request
        SET status = 'Rejected', rejection_reason = ?, reviewed_by_admin_id = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE request_id = ?
      `, [reason, superAdminId, reqId]);

      await rows(connection, `
        INSERT INTO account_notifications (role, account_id, notification_type, message)
        VALUES ('admin', ?, 'payout', CONCAT('Your request for permission to manage student payouts was rejected: ', ?))
      `, [req.admin_id, reason || "Request denied by Super Admin."]);

      return req;
    });

    await audit({
      action: "ADMIN_PAYOUT_PERMISSION_REJECTED",
      actor: String(superAdminId),
      role: "Super Admin",
      status: "SUCCESS",
      information: `Payout permission rejected for Admin ${target.admin_id}. Reason: ${reason || "None"}`,
    }).catch(err => console.error("Payout permission reject audit failed:", err));

    return { success: true, status: "Rejected" };
  };

  return {
    capability, getAccount, saveAccount, list, request, approve, reject,
    approvals, release: send, send, reconcile, verifyRefund, handleTransferEvent,
    listAccountRequests, approveAccountRequest, rejectAccountRequest,
    getAdminPermissionStatus, requestAdminPayoutPermission,
    listAdminPermissionRequests, approveAdminPermissionRequest, rejectAdminPermissionRequest,
  };
}

export const payoutService = createPayoutService();
