// Isolated MySQL fixtures + simulated provider. Never contacts PayMongo or
// sends money. Removes only rows bearing this run's generated marker.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import dotenv from "dotenv";
import mysql from "mysql2";
dotenv.config({ quiet: true });
// Exercise the normal hold independently of the developer's local TEST setting.
process.env.PAYMONGO_TEST_PAYOUT_IMMEDIATE = "false";
// Provider API below is an injected, entirely local simulator. Keep the
// historical TEST/LIVE hold regression independent of the configured demo.
process.env.PAYOUT_PROVIDER = "paymongo";
process.env.PAYOUT_ACCOUNT_ENCRYPTION_KEY = randomBytes(32).toString("hex");
const { ensurePayoutTables } = await import("../database/payouts.js");
const { createPayoutService } = await import("../utils/payouts.js");
const { refreshSellerPayoutEligibility } = await import("../utils/payoutEligibility.js");
const { createReturnRequest } = await import("../utils/returns.js");
const { default: appDb } = await import("../database/db.js");
const marker = `ptest_${randomUUID().replaceAll("-", "").slice(0, 14)}`;
const rawPool = mysql.createPool({ host: process.env.DB_HOST,port: process.env.DB_PORT,user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,database: process.env.DB_NAME,connectionLimit: 5 });
const frozenTime = Math.floor(Date.now() / 1000);
rawPool.on("connection", connection => connection.query("SET timestamp = ?", [frozenTime]));
appDb.on("connection", connection => connection.query("SET timestamp = ?", [frozenTime]));
const pool = rawPool.promise();
const query = async (sql, values = []) => (await pool.query(sql, values))[0];
const state = { orders: [], artworks: [], splits: [], admins: [], checks: [], providerCalls: 0, refunds: [], transfers: new Map() };
let sellerId, buyerId, conversationId, deferredCreate, createFailure, inspectingRefunds = [];
class ProviderFailure extends Error { constructor(ambiguous) { super("Simulated provider rejection"); this.status = 502; this.ambiguous = ambiguous; } }
const transferFor = (input, status = "pending") => ({ id: `tr_${randomUUID().replaceAll("-", "")}`,status,
  amountCentavos: input.amountCentavos,currency: "PHP",livemode: false,reference: input.reference,
  providerReference: "fixture-provider-reference",provider: input.destination.provider,destination: input.destination });
const provider = {
  PayoutProviderError: ProviderFailure,
  getPayoutCapability: () => ({ enabled: true, mode: "test", message: "Simulated provider; no money moves." }),
  listPayoutInstitutions: async () => [{ code: "TESTBIC",name: "Fixture bank",provider: "instapay",destinationType: "bank" }],
  getPayoutWallet: async () => ({ availableBalanceCentavos: 100000000 }),
  inspectPaymentRefunds: async paymentId => ({ paymentId,status: "paid",refunds: inspectingRefunds }),
  retrievePayoutRefund: async refundId => state.refunds.find(value => value.id === refundId),
  createPayoutTransfer: async input => {
    state.providerCalls++;
    if (createFailure) throw createFailure;
    if (deferredCreate) return deferredCreate(input);
    const transfer = transferFor(input); state.transfers.set(transfer.id, transfer); return transfer;
  },
  retrievePayoutTransfer: async transferId => state.transfers.get(transferId),
  findPayoutTransferByReference: async reference => [...state.transfers.values()].find(value => value.reference === reference) || null,
};
const service = createPayoutService({ pool,provider,audit: async () => {} });
const pass = name => { state.checks.push(name); console.log(`PASS ${name}`); };
const approvePayout = async (fixture, activeService = service) => {
  await activeService.request(fixture.payoutId,state.admins[0]);
  for (const adminId of state.admins.slice(1)) await activeService.approve(fixture.payoutId,adminId);
};
async function order({ age = 604801,status = "Delivered",method = "paymongo",paymentStatus = "Paid" } = {}) {
  const result = await query(`INSERT INTO marketplace_order (order_number,customer_id,seller_id,buyer_name,
    payment_method,payment_status,payment_reference,paymongo_payment_id,paid_at,shipping_street,shipping_barangay,
    shipping_city,shipping_region,shipping_postal_code,subtotal,shipping_fee,total_amount,status,delivered_at)
    VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,'Fixture','Fixture','Fixture','Fixture','1000',300,0,300,?,TIMESTAMPADD(SECOND,?,CURRENT_TIMESTAMP))`,
  [`${marker}_${state.orders.length}`,buyerId,sellerId,marker,method,paymentStatus,`${marker}_ref`,`${marker}_payment`,status,-age]);
  const orderId = result.insertId; state.orders.push(orderId);
  const itemIds = [];
  for (const [index, price] of [100,200].entries()) {
    const item = await query("INSERT INTO marketplace_order_item (order_id,artwork_id,title,artist_name,image,unit_price,quantity) VALUES (?,?,?,?, '',?,1)",
      [orderId,state.artworks[index],marker,marker,price]); itemIds.push(item.insertId);
  }
  const split = await query(`INSERT INTO seller_payment_split
    (order_id,seller_id,payment_reference,currency,gross_amount,commission_rate,commission_amount,processing_fee_amount,net_amount,payout_status)
    VALUES (?, ?, ?, 'PHP',300,0,0,0,300,'Held')`, [orderId,sellerId,`${marker}_ref`]);
  state.splits.push(split.insertId);
  return { orderId,payoutId: split.insertId,itemIds };
}
const read = async fixture => (await query("SELECT * FROM seller_payment_split WHERE split_id=?", [fixture.payoutId]))[0];
async function addReturn(fixture,status = "Completed") {
  if (!conversationId) {
    const conversation = await query("INSERT INTO conversation (student_id,customer_id) VALUES (?,?)", [sellerId,buyerId]); conversationId = conversation.insertId;
  }
  const result = await query(`INSERT INTO marketplace_return_request
    (order_id,conversation_id,customer_id,seller_id,reason,details,status) VALUES (?,?,?,?,'Damaged artwork','Clearly labelled financial test fixture',?)`,
  [fixture.orderId,conversationId,buyerId,sellerId,status]);
  await query("INSERT INTO marketplace_return_item (return_request_id,order_item_id,quantity) VALUES (?,?,1)", [result.insertId,fixture.itemIds[0]]);
  return result.insertId;
}

try {
  await ensurePayoutTables(); await ensurePayoutTables();
  pass("Additive payout schema initialization is repeatable");
  for (let index=0;index<4;index++) {
    const created = await query("INSERT INTO admin (username,first_name,last_name,email,password) VALUES (?,'Payout','Fixture',?,'disabled-fixture')", [`${marker}_a${index}`,`${marker}_a${index}@artmatch.invalid`]);
    state.admins.push(created.insertId);
    await query("INSERT INTO admin_role (admin_id,role) VALUES (?,'admin')", [created.insertId]);
  }
  buyerId = (await query("INSERT INTO customer (username,first_name,last_name,email,phone_number,password) VALUES (?,'Payout','Fixture',?,'09000000000','disabled-fixture')", [marker,`${marker}@artmatch.invalid`])).insertId;
  sellerId = (await query("INSERT INTO student (student_number,first_name,last_name,email,password) VALUES (?,'Payout','Fixture',?,'disabled-fixture')", [marker,`${marker}_seller@artmatch.invalid`])).insertId;
  for (let index = 0; index < 2; index++) state.artworks.push((await query("INSERT INTO artwork (student_id,title,price,description,image,genre,art_size,art_type,product,status,is_sold) VALUES (?,?,100,'Payout fixture','','Abstract','10x10','Painting','Painting','Available',0)", [sellerId,`${marker}_${index}`])).insertId);

  const saved = await service.saveAccount(sellerId, { institutionCode: "TESTBIC",provider: "instapay",accountName: "Payout Fixture",accountNumber: "09000000001" });
  assert.equal(saved.account.maskedAccountNumber, "*******0001");
  assert.ok(!JSON.stringify(saved).includes("09000000001"));
  const encrypted = (await query("SELECT account_number_ciphertext FROM seller_payout_account WHERE student_id=?", [sellerId]))[0];
  assert.ok(!encrypted.account_number_ciphertext.includes("09000000001"));
  pass("Payout account is encrypted at rest and masked in responses");

  const early = await order({ age: 604799 }); const boundary = await order({ age: 604800 });
  const active = await order(); const completed = await order(); const rejected = await order();
  const pending = await order({ paymentStatus: "Pending" }); const cod = await order({ method: "cod" });
  await addReturn(active,"Requested"); const returnedId = await addReturn(completed); await addReturn(rejected,"Rejected");
  await service.list({ sellerId });
  assert.equal((await read(early)).payout_status,"Held"); assert.equal((await read(boundary)).payout_status,"Eligible");
  assert.equal((await read(active)).payout_status,"Held"); assert.equal((await read(completed)).payout_status,"Held");
  assert.equal((await read(rejected)).payout_status,"Eligible");
  assert.equal((await read(pending)).payout_status,"Held"); assert.equal((await read(cod)).payout_status,"Held");
  assert.equal(state.providerCalls,0);
  pass("Exact database seven-day deadline, active/completed/rejected returns, pending payments and COD are enforced without sending money");

  const justDelivered = await order({ age: 0 });
  const futureDelivery = await order({ age: -60 });
  const previousKey = process.env.PAYMONGO_SECRET_KEY;
  try {
    process.env.PAYMONGO_SECRET_KEY = "sk_test_fixture";
    process.env.PAYMONGO_TEST_PAYOUT_IMMEDIATE = "true";
    const immediate = await service.list({ sellerId });
    assert.equal(immediate.payoutPolicy.immediateTestPayouts, true);
    assert.equal((await read(justDelivered)).payout_status, "Eligible");
    assert.equal((await read(justDelivered)).eligible_at.getTime(), frozenTime * 1000);
    assert.equal((await read(futureDelivery)).payout_status, "Held");
    assert.equal((await read(active)).payout_status, "Held");
    assert.equal((await read(pending)).payout_status, "Held");
    assert.equal(state.providerCalls, 0);
    process.env.PAYMONGO_SECRET_KEY = "sk_live_fixture";
    await service.list({ sellerId });
    assert.equal((await read(justDelivered)).payout_status, "Held");
  } finally {
    if (previousKey === undefined) delete process.env.PAYMONGO_SECRET_KEY;
    else process.env.PAYMONGO_SECRET_KEY = previousKey;
    process.env.PAYMONGO_TEST_PAYOUT_IMMEDIATE = "false";
  }
  pass("Immediate TEST hold uses actual database delivery time, retains other holds and cannot bypass the LIVE seven-day period");

  state.refunds.push({ id: `${marker}_refund`,paymentId: `${marker}_payment`,amountCentavos: 10000,currency: "PHP",livemode: false,status: "pending" });
  await service.verifyRefund(completed.payoutId,state.admins[0],{ providerRefundId: state.refunds[0].id,returnRequestId: returnedId });
  assert.equal((await read(completed)).payout_status,"Held");
  state.refunds[0].status = "succeeded";
  await service.verifyRefund(completed.payoutId,state.admins[0],{ providerRefundId: state.refunds[0].id,returnRequestId: returnedId });
  assert.equal((await read(completed)).payout_status,"Eligible"); assert.equal(Number((await read(completed)).payout_amount),200);
  const full = await order(); state.refunds.push({ ...state.refunds[0],id: `${marker}_full`,amountCentavos: 30000 });
  await service.verifyRefund(full.payoutId,state.admins[0],{ providerRefundId: `${marker}_full` });
  assert.equal((await read(full)).payout_status,"Cancelled"); assert.equal(Number((await read(full)).payout_amount),0);
  pass("Provider-verified pending, partial and full refunds hold, reduce or cancel the appropriate seller order");

  await assert.rejects(service.send(boundary.payoutId,state.admins[0],{ amount: 1 }),error => error.status === 400);
  await assert.rejects(service.send(cod.payoutId,state.admins[0]),error => error.status === 409);
  pass("Client-selected amounts and COD cannot create an outbound transfer");

  await assert.rejects(service.send(boundary.payoutId,state.admins[0]), error => error.status === 409 && error.message === "Three independent admin approvals are required.");
  let requested = await service.request(boundary.payoutId,state.admins[0]);
  assert.equal(requested.payout.approval.approvalCount,0);
  assert.equal(requested.payout.approval.requestedByAdminId,state.admins[0]);
  await assert.rejects(service.approve(boundary.payoutId,state.admins[0]), error => error.status === 403 && error.message === "You cannot approve a payout request that you initiated.");
  await assert.rejects(service.approve(boundary.payoutId,state.admins[1], { approvalCount: 3 }),error=>error.status===400);
  const duplicate = await Promise.allSettled([service.approve(boundary.payoutId,state.admins[1]),service.approve(boundary.payoutId,state.admins[1])]);
  assert.equal(duplicate.filter(value=>value.status==="fulfilled").length,1);
  assert.equal(duplicate.filter(value=>value.status==="rejected" && value.reason.status===409).length,1);
  assert.equal((await service.approvals(boundary.payoutId,state.admins[0])).approval.approvalCount,1);
  const cycleId = requested.payout.approval.cycleId;
  await assert.rejects(query("INSERT INTO seller_payout_approval (cycle_id,admin_id,decision) VALUES (?,?,'Approved')",[cycleId,state.admins[1]]), error=>error.code==="ER_DUP_ENTRY");
  await service.approve(boundary.payoutId,state.admins[2]);
  assert.equal((await service.approvals(boundary.payoutId,state.admins[0])).approval.approvalCount,2);
  await assert.rejects(service.release(boundary.payoutId,state.admins[0]), error=>error.status===409 && error.message==="Three independent admin approvals are required.");
  requested = await service.approve(boundary.payoutId,state.admins[3]);
  assert.equal(requested.payout.approval.status,"Approved");
  assert.equal(requested.payout.approval.approvalCount,3);
  assert.equal(state.providerCalls,0);
  pass("Requester cannot vote; duplicate concurrent votes and direct SQL duplicates count once; forged count and two-approval release are blocked; third approval does not send");

  let input, finish;
  deferredCreate = value => { input=value; return new Promise(resolve => { finish=resolve; }); };
  const first = service.send(boundary.payoutId,state.admins[0]);
  for (let loop=0;loop<100 && !finish;loop++) await new Promise(resolve => setTimeout(resolve,10));
  assert.ok(finish,"First send must reach provider after reserving its attempt");
  await assert.rejects(service.send(boundary.payoutId,state.admins[1]),error => error.status === 409);
  await assert.rejects(service.saveAccount(sellerId,{ institutionCode: "TESTBIC",provider: "instapay",accountName: "Payout Fixture",accountNumber: "09000000002" }),error => error.status === 409);
  const transfer = transferFor(input); state.transfers.set(transfer.id,transfer); finish(transfer); await first; deferredCreate=null;
  assert.equal(state.providerCalls,1); assert.equal((await read(boundary)).payout_status,"Processing");
  await assert.rejects(createReturnRequest(buyerId,{ order_id: boundary.orderId,order_item_ids: [boundary.itemIds[0]],reason: "Damaged artwork",details: "Fixture at payout reservation boundary" }),error => error.status === 409);
  pass("Two admins produce exactly one provider attempt; processing blocks account changes and conflicting boundary returns");

  transfer.status="succeeded"; await service.reconcile(boundary.payoutId,state.admins[0]);
  assert.equal((await read(boundary)).payout_status,"Paid"); assert.ok((await read(boundary)).paid_at);
  await service.handleTransferEvent({ data: { id: transfer.id } });
  const fresh = createPayoutService({ pool,provider,audit: async()=>{} });
  assert.equal((await fresh.list({ sellerId })).orders.find(value=>value.payoutId===boundary.payoutId).payoutStatus,"Paid");
  await assert.rejects(fresh.send(boundary.payoutId,state.admins[0]),error=>error.status===409);
  pass("Provider success and webhook replay persist Paid across a fresh service instance without a second payment");

  const rejectable = await order(); await service.list({ sellerId });
  const originalCycle = (await service.request(rejectable.payoutId,state.admins[0])).payout.approval.cycleId;
  await service.approve(rejectable.payoutId,state.admins[1]);
  await assert.rejects(service.reject(rejectable.payoutId,state.admins[2]),error=>error.status===400);
  await service.reject(rejectable.payoutId,state.admins[2],{ comment: "Destination needs review." });
  await assert.rejects(service.release(rejectable.payoutId,state.admins[0]),error=>error.status===409);
  const replacement = (await service.request(rejectable.payoutId,state.admins[0])).payout.approval;
  assert.notEqual(replacement.cycleId,originalCycle); assert.equal(replacement.approvalCount,0);
  assert.equal((await query("SELECT COUNT(*) AS count FROM seller_payout_approval WHERE cycle_id=?",[originalCycle]))[0].count,2);
  pass("Rejection requires a comment, blocks release and creates a new cycle without reusing old votes");

  const parallelVotes = await order(); await service.list({ sellerId }); await service.request(parallelVotes.payoutId,state.admins[0]);
  await Promise.all([service.approve(parallelVotes.payoutId,state.admins[1]),service.approve(parallelVotes.payoutId,state.admins[2])]);
  assert.equal((await service.approvals(parallelVotes.payoutId,state.admins[0])).approval.approvalCount,2);
  await service.approve(parallelVotes.payoutId,state.admins[3]);
  await query("UPDATE admin_role SET role='moderator' WHERE admin_id=?",[state.admins[3]]);
  await assert.rejects(service.release(parallelVotes.payoutId,state.admins[0]),error=>error.status===409);
  assert.equal((await service.approvals(parallelVotes.payoutId,state.admins[0])).approval.approvalCount,2);
  assert.equal((await service.approvals(parallelVotes.payoutId,state.admins[0])).approval.status,"Invalidated");
  await query("UPDATE admin_role SET role='admin' WHERE admin_id=?",[state.admins[3]]);
  await query("INSERT INTO account_access (role,account_id,is_banned) VALUES ('admin',?,1)",[state.admins[3]]);
  await assert.rejects(service.release(parallelVotes.payoutId,state.admins[0]),error=>error.status===409);
  await query("DELETE FROM account_access WHERE role='admin' AND account_id=?",[state.admins[3]]);
  const renewedAfterRoleChange = await service.request(parallelVotes.payoutId,state.admins[0]);
  assert.equal(renewedAfterRoleChange.payout.approval.approvalCount,0);
  pass("Concurrent independent votes preserve the count; demoted and banned approvers cannot satisfy quorum");

  const newReturn = await order(); await service.list({ sellerId }); await approvePayout(newReturn);
  await addReturn(newReturn,"Requested");
  await assert.rejects(service.release(newReturn.payoutId,state.admins[0]),error=>error.status===409);
  assert.equal((await query("SELECT COUNT(*) AS count FROM seller_payout_attempt WHERE split_id=?",[newReturn.payoutId]))[0].count,0);
  assert.equal((await service.approvals(newReturn.payoutId,state.admins[0])).approval.status,"Invalidated");
  const newRefund = await order(); await service.list({ sellerId }); await approvePayout(newRefund);
  await query("INSERT INTO seller_order_refund (order_id,provider_refund_id,provider_payment_id,amount,status) VALUES (?,?,?,1,'Pending')",[newRefund.orderId,`${marker}_late_refund`,`${marker}_payment`]);
  await assert.rejects(service.release(newRefund.payoutId,state.admins[0]),error=>error.status===409);
  assert.notEqual((await read(newRefund)).payout_status,"Paid");
  pass("A return or pending refund created after quorum is rechecked at release and invalidates authorization without creating a transfer");

  const changedAmount = await order(); await service.list({ sellerId }); await approvePayout(changedAmount);
  await query("UPDATE marketplace_order_item SET unit_price=101 WHERE order_item_id=?",[changedAmount.itemIds[0]]);
  await query("UPDATE marketplace_order SET subtotal=301,total_amount=301 WHERE order_id=?",[changedAmount.orderId]);
  await query("UPDATE seller_payment_split SET gross_amount=301,net_amount=301 WHERE split_id=?",[changedAmount.payoutId]);
  await assert.rejects(service.release(changedAmount.payoutId,state.admins[0]),error=>error.status===409);
  assert.equal((await service.approvals(changedAmount.payoutId,state.admins[0])).approval.status,"Invalidated");
  const changedDestination = await order(); await service.list({ sellerId }); await approvePayout(changedDestination);
  await service.saveAccount(sellerId,{ institutionCode: "TESTBIC",provider: "instapay",accountName: "Corrected Test Seller",accountNumber: "09000000002" });
  assert.equal((await service.approvals(changedDestination.payoutId,state.admins[0])).approval.status,"Invalidated");
  await assert.rejects(service.release(changedDestination.payoutId,state.admins[0]),error=>error.status===409);
  const changedProvider = await order(); await service.list({ sellerId }); await approvePayout(changedProvider);
  provider.name="demo";
  try { await assert.rejects(service.release(changedProvider.payoutId,state.admins[0]),error=>error.status===409); }
  finally { delete provider.name; }
  assert.equal((await service.approvals(changedProvider.payoutId,state.admins[0])).approval.status,"Invalidated");
  pass("Changed payout amount, destination or configured provider invalidates the snapshot and requires three fresh approvals");

  const failed = await order(); await service.list({ sellerId });
  await approvePayout(failed);
  createFailure = new ProviderFailure(false);
  await assert.rejects(service.send(failed.payoutId,state.admins[0])); createFailure=null;
  assert.equal((await read(failed)).payout_status,"Failed");
  await service.list({ sellerId }); assert.equal((await read(failed)).payout_status,"Failed");
  await service.reconcile(failed.payoutId,state.admins[0]); assert.equal((await read(failed)).payout_status,"Eligible");
  await assert.rejects(service.release(failed.payoutId,state.admins[0]), error=>error.status===409);
  pass("Definitive failure stays Failed until an explicit safe admin reconciliation re-arms it");

  const laterFailed = await order(); await service.list({ sellerId });
  await approvePayout(laterFailed);
  await service.send(laterFailed.payoutId,state.admins[0]);
  const failingTransfer = state.transfers.get((await read(laterFailed)).provider_transfer_id);
  failingTransfer.status="failed";
  await service.reconcile(laterFailed.payoutId,state.admins[0]);
  assert.notEqual((await read(laterFailed)).payout_status,"Paid");
  assert.equal((await query("SELECT status FROM seller_payout_attempt WHERE split_id=?",[laterFailed.payoutId]))[0].status,"Failed");
  pass("A later provider transfer failure is never treated as a successful payout");

  const unknown = await order(); await service.list({ sellerId }); await approvePayout(unknown); createFailure = new ProviderFailure(true);
  await assert.rejects(service.send(unknown.payoutId,state.admins[0])); createFailure=null;
  assert.equal((await read(unknown)).payout_status,"Processing");
  const before = state.providerCalls;
  await assert.rejects(service.send(unknown.payoutId,state.admins[0]),error=>error.status===409);
  await assert.rejects(service.reconcile(unknown.payoutId,state.admins[0]),error=>error.status===409);
  assert.equal(state.providerCalls,before);
  pass("Ambiguous network result remains reserved and cannot be resent after refresh or service restart");

  const missing = await order(); await service.list({ sellerId });
  await query("DELETE FROM seller_payout_account WHERE student_id=?",[sellerId]);
  await assert.rejects(service.request(missing.payoutId,state.admins[0]),error=>error.status===422);
  // The unknown transfer belongs to this seller, so restore only this isolated
  // fixture's saved row directly; normal account editing correctly remains blocked.
  await query(`INSERT INTO seller_payout_account (student_id,destination_type,institution_code,institution_name,
    institution_provider,account_name,account_number_ciphertext) VALUES (?,'bank','TESTBIC','Fixture bank','instapay','Payout Fixture',?)`,
  [sellerId,encrypted.account_number_ciphertext]);
  await approvePayout(missing);
  inspectingRefunds=[{ id: "re_unallocated",status: "pending",amountCentavos: 10 }];
  await assert.rejects(service.send(missing.payoutId,state.admins[0]),error=>error.status===409);
  inspectingRefunds=[];
  pass("Missing destination and unallocated provider refunds block payout safely");

  const orderStates = await query("SELECT DISTINCT payment_status,status FROM marketplace_order WHERE order_id IN (?)",[state.orders]);
  assert.ok(orderStates.every(value=>["Paid","Pending"].includes(value.payment_status) && value.status==="Delivered"));
  const inventory = await query("SELECT is_sold FROM artwork WHERE artwork_id IN (?)",[state.artworks]);
  assert.ok(inventory.every(value=>Number(value.is_sold)===0));
  pass("Payout operations never change buyer payment, fulfillment or artwork inventory");
} finally {
  if (state.orders.length) {
    await query("DELETE FROM account_notifications WHERE order_id IN (?)",[state.orders]);
    await query("DELETE FROM seller_order_refund WHERE order_id IN (?)",[state.orders]);
    if (state.splits.length) await query("DELETE FROM seller_payout_attempt WHERE split_id IN (?)",[state.splits]);
    if (state.splits.length) {
      await query("DELETE v FROM seller_payout_approval v JOIN seller_payout_approval_cycle c ON c.cycle_id=v.cycle_id WHERE c.split_id IN (?)",[state.splits]);
      await query("DELETE FROM seller_payout_approval_cycle WHERE split_id IN (?)",[state.splits]);
    }
    await query("DELETE FROM seller_payment_split WHERE order_id IN (?)",[state.orders]);
    await query("DELETE ri FROM marketplace_return_item ri JOIN marketplace_return_request rr ON rr.return_request_id=ri.return_request_id WHERE rr.order_id IN (?)",[state.orders]);
    await query("DELETE FROM marketplace_return_request WHERE order_id IN (?)",[state.orders]);
    await query("DELETE FROM marketplace_order_item WHERE order_id IN (?)",[state.orders]);
    await query("DELETE FROM marketplace_order WHERE order_id IN (?)",[state.orders]);
  }
  if (conversationId) await query("DELETE FROM conversation WHERE conversation_id=?",[conversationId]);
  if (state.artworks.length) await query("DELETE FROM artwork WHERE artwork_id IN (?)",[state.artworks]);
  if (sellerId) { await query("DELETE FROM seller_payout_account WHERE student_id=?",[sellerId]); await query("DELETE FROM student WHERE student_id=? AND student_number=?",[sellerId,marker]); }
  if (buyerId) await query("DELETE FROM customer WHERE customer_id=? AND username=?",[buyerId,marker]);
  if (state.admins.length) {
    await query("DELETE FROM account_access WHERE role='admin' AND account_id IN (?)",[state.admins]);
    await query("DELETE FROM admin_role WHERE admin_id IN (?)",[state.admins]);
    await query("DELETE FROM admin WHERE admin_id IN (?) AND username LIKE ?",[state.admins,`${marker}%`]);
  }
  await mkdir(new URL("../.cache/",import.meta.url),{recursive:true});
  await writeFile(new URL("../.cache/payout-flow-results.json",import.meta.url),JSON.stringify({ checks: state.checks,simulatedProvider: true,realMoneyMoved: false,fixturesCleaned: true },null,2));
  await pool.end(); await appDb.promise().end();
}
