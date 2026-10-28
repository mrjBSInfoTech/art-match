// Isolated MySQL fixtures + simulated provider. Never contacts PayMongo or
// sends money. Removes only rows bearing this run's generated marker.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import dotenv from "dotenv";
import mysql from "mysql2";
dotenv.config({ quiet: true });
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
const state = { orders: [], artworks: [], splits: [], checks: [], providerCalls: 0, refunds: [], transfers: new Map() };
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

  state.refunds.push({ id: `${marker}_refund`,paymentId: `${marker}_payment`,amountCentavos: 10000,currency: "PHP",livemode: false,status: "pending" });
  await service.verifyRefund(completed.payoutId,1,{ providerRefundId: state.refunds[0].id,returnRequestId: returnedId });
  assert.equal((await read(completed)).payout_status,"Held");
  state.refunds[0].status = "succeeded";
  await service.verifyRefund(completed.payoutId,1,{ providerRefundId: state.refunds[0].id,returnRequestId: returnedId });
  assert.equal((await read(completed)).payout_status,"Eligible"); assert.equal(Number((await read(completed)).payout_amount),200);
  const full = await order(); state.refunds.push({ ...state.refunds[0],id: `${marker}_full`,amountCentavos: 30000 });
  await service.verifyRefund(full.payoutId,1,{ providerRefundId: `${marker}_full` });
  assert.equal((await read(full)).payout_status,"Cancelled"); assert.equal(Number((await read(full)).payout_amount),0);
  pass("Provider-verified pending, partial and full refunds hold, reduce or cancel the appropriate seller order");

  await assert.rejects(service.send(boundary.payoutId,1,{ amount: 1 }),error => error.status === 400);
  await assert.rejects(service.send(cod.payoutId,1),error => error.status === 409);
  pass("Client-selected amounts and COD cannot create an outbound transfer");

  let input, finish;
  deferredCreate = value => { input=value; return new Promise(resolve => { finish=resolve; }); };
  const first = service.send(boundary.payoutId,1);
  for (let loop=0;loop<100 && !finish;loop++) await new Promise(resolve => setTimeout(resolve,10));
  assert.ok(finish,"First send must reach provider after reserving its attempt");
  await assert.rejects(service.send(boundary.payoutId,2),error => error.status === 409);
  await assert.rejects(service.saveAccount(sellerId,{ institutionCode: "TESTBIC",provider: "instapay",accountName: "Payout Fixture",accountNumber: "09000000002" }),error => error.status === 409);
  const transfer = transferFor(input); state.transfers.set(transfer.id,transfer); finish(transfer); await first; deferredCreate=null;
  assert.equal(state.providerCalls,1); assert.equal((await read(boundary)).payout_status,"Processing");
  await assert.rejects(createReturnRequest(buyerId,{ order_id: boundary.orderId,order_item_ids: [boundary.itemIds[0]],reason: "Damaged artwork",details: "Fixture at payout reservation boundary" }),error => error.status === 409);
  pass("Two admins produce exactly one provider attempt; processing blocks account changes and conflicting boundary returns");

  transfer.status="succeeded"; await service.reconcile(boundary.payoutId,1);
  assert.equal((await read(boundary)).payout_status,"Paid"); assert.ok((await read(boundary)).paid_at);
  await service.handleTransferEvent({ data: { id: transfer.id } });
  const fresh = createPayoutService({ pool,provider,audit: async()=>{} });
  assert.equal((await fresh.list({ sellerId })).orders.find(value=>value.payoutId===boundary.payoutId).payoutStatus,"Paid");
  await assert.rejects(fresh.send(boundary.payoutId,1),error=>error.status===409);
  pass("Provider success and webhook replay persist Paid across a fresh service instance without a second payment");

  const failed = await order(); await service.list({ sellerId });
  createFailure = new ProviderFailure(false);
  await assert.rejects(service.send(failed.payoutId,1)); createFailure=null;
  assert.equal((await read(failed)).payout_status,"Failed");
  await service.list({ sellerId }); assert.equal((await read(failed)).payout_status,"Failed");
  await service.reconcile(failed.payoutId,1); assert.equal((await read(failed)).payout_status,"Eligible");
  pass("Definitive failure stays Failed until an explicit safe admin reconciliation re-arms it");

  const laterFailed = await order(); await service.list({ sellerId });
  await service.send(laterFailed.payoutId,1);
  const failingTransfer = state.transfers.get((await read(laterFailed)).provider_transfer_id);
  failingTransfer.status="failed";
  await service.reconcile(laterFailed.payoutId,1);
  assert.notEqual((await read(laterFailed)).payout_status,"Paid");
  assert.equal((await query("SELECT status FROM seller_payout_attempt WHERE split_id=?",[laterFailed.payoutId]))[0].status,"Failed");
  pass("A later provider transfer failure is never treated as a successful payout");

  const unknown = await order(); await service.list({ sellerId }); createFailure = new ProviderFailure(true);
  await assert.rejects(service.send(unknown.payoutId,1)); createFailure=null;
  assert.equal((await read(unknown)).payout_status,"Processing");
  const before = state.providerCalls;
  await assert.rejects(service.send(unknown.payoutId,1),error=>error.status===409);
  await assert.rejects(service.reconcile(unknown.payoutId,1),error=>error.status===409);
  assert.equal(state.providerCalls,before);
  pass("Ambiguous network result remains reserved and cannot be resent after refresh or service restart");

  const missing = await order(); await service.list({ sellerId });
  await query("DELETE FROM seller_payout_account WHERE student_id=?",[sellerId]);
  await assert.rejects(service.send(missing.payoutId,1),error=>error.status===422);
  inspectingRefunds=[{ id: "re_unallocated",status: "pending",amountCentavos: 10 }];
  await assert.rejects(service.send(missing.payoutId,1),error=>error.status===409);
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
  await mkdir(new URL("../.cache/",import.meta.url),{recursive:true});
  await writeFile(new URL("../.cache/payout-flow-results.json",import.meta.url),JSON.stringify({ checks: state.checks,simulatedProvider: true,realMoneyMoved: false,fixturesCleaned: true },null,2));
  await pool.end(); await appDb.promise().end();
}
