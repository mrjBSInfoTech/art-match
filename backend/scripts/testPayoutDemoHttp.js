// Opt-in local HTTP integration test. Creates clearly named isolated fixtures,
// logs in as four distinct admins, and removes only those fixtures afterward.
// Never invokes a PayMongo payout or changes an existing payout/account.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { encryptPayoutAccount } from "../utils/payoutAccount.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
assert.equal(process.argv.includes("--run"), true, "Explicit --run is required for local HTTP test fixtures.");
assert.equal(process.env.PAYOUT_PROVIDER, "demo", "Explicit Demo Payout Provider is required.");
assert.notEqual(String(process.env.NODE_ENV || "").toLowerCase(), "production");
assert.ok(["localhost", "127.0.0.1", "::1"].includes(process.env.DB_HOST), "Use only a local development database.");
const origin = `http://127.0.0.1:${Number(process.env.PORT || 5000)}`;
const marker = `demo_http_${randomBytes(8).toString("hex")}`;
const secret = randomBytes(20).toString("base64url") + "Aa9";
const report = { status: "RUNNING", marker, provider: "demo", checks: [], noExternalMoneyMovement: true };
const adminIds = [], usernames = [];
let sellerId, buyerId, orderId, itemId, payoutId;
const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
const sql = async (text, values = []) => (await connection.query(text, values))[0];
const check = (name) => { report.checks.push(name); console.log(`PASS ${name}`); };
async function http(path, { token, method = "GET", body } = {}) {
  // The only network client in this script is restricted to the local app.
  const url = new URL(path, origin);
  assert.equal(url.origin, origin);
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
  return { status: response.status, body: await response.json() };
}

try {
  for (let index = 0; index < 4; index++) {
    const username = `${marker}_${index}`;
    const admin = await sql(`INSERT INTO admin (username,password,first_name,last_name,email,password_changed,image)
      VALUES (?,?,'Demo HTTP',?,?,1,NULL)`, [username,await bcrypt.hash(secret,10),String(index),`${username}@example.invalid`]);
    adminIds.push(admin.insertId); usernames.push(username);
    await sql(`INSERT INTO admin_role (admin_id,role,can_add,can_edit,can_delete,can_promote,can_demote)
      VALUES (?,?,0,0,0,0,0)`, [admin.insertId,index === 0 ? "super admin" : "admin"]);
  }
  const tokens = [];
  for (const username of usernames) {
    const login = await http("/api/admin/authenticate/login", { method: "POST", body: { username,password: secret } });
    assert.equal(login.status,200,login.body.message);
    assert.equal(typeof login.body.token,"string");
    tokens.push(login.body.token);
  }
  check("Four separate database admin accounts authenticate through the real login endpoint");
  const list = await http("/api/admin/payouts", { token: tokens[0] });
  assert.equal(list.status,200,list.body.message);
  assert.equal(list.body.providerCapability.provider,"demo", "Running server must be restarted with Demo Payout Provider before this test.");
  const seller = await sql(`INSERT INTO student (student_number,first_name,last_name,birthdate,email,address,
    phone_number,year_level,course,password,expire_date) VALUES (?,'Demo HTTP','Seller','2002-01-01',?,'Fixture only',
    '00000000000','1','Fixture',?,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 1 YEAR))`, [marker,`${marker}_seller@example.invalid`,await bcrypt.hash(secret,10)]);
  sellerId = seller.insertId;
  buyerId = (await sql(`INSERT INTO customer (username,first_name,last_name,email,phone_number,password)
    VALUES (?,'Demo HTTP','Buyer',?,'00000000000',?)`, [marker,`${marker}_buyer@example.invalid`,await bcrypt.hash(secret,10)])).insertId;
  orderId = (await sql(`INSERT INTO marketplace_order
    (order_number,customer_id,seller_id,buyer_name,payment_method,payment_status,payment_reference,paymongo_payment_id,
     paid_at,shipping_street,shipping_barangay,shipping_city,shipping_region,shipping_postal_code,subtotal,shipping_fee,total_amount,status,delivered_at)
    VALUES (?,?,?,'DEMO HTTP FIXTURE','paymongo','Paid',?,?,CURRENT_TIMESTAMP,'Fixture','Fixture','Fixture','Fixture','1000',100,0,100,'Delivered',DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 8 DAY))`,
  [marker,buyerId,sellerId,`${marker}_reference`,`pay_${marker}`])).insertId;
  itemId = (await sql(`INSERT INTO marketplace_order_item
    (order_id,artwork_id,title,artist_name,image,unit_price,quantity) VALUES (?,NULL,'DEMO HTTP FIXTURE','Fixture','',100,1)`, [orderId])).insertId;
  payoutId = (await sql(`INSERT INTO seller_payment_split
    (order_id,seller_id,payment_reference,currency,gross_amount,commission_rate,commission_amount,processing_fee_amount,net_amount,payout_status)
    VALUES (?,?,?,'PHP',100,0,0,0,100,'Held')`, [orderId,sellerId,`${marker}_reference`])).insertId;
  await sql(`INSERT INTO seller_payout_account
    (student_id,destination_type,institution_code,institution_name,institution_provider,account_name,account_number_ciphertext)
    VALUES (?,'ewallet','GXCHPHM2XXX','GCash Demo','instapay','Demo HTTP Seller',?)`, [sellerId,encryptPayoutAccount("999999990001",sellerId)]);
  const endpoint = `/api/admin/payouts/${payoutId}`;
  const detail = await http(endpoint,{token:tokens[0]});
  assert.equal(detail.status,200,detail.body.message);
  assert.equal(detail.body.payout.payoutStatus,"Eligible");
  const noApproval = await http(`${endpoint}/send`,{token:tokens[0],method:"POST",body:{}});
  assert.equal(noApproval.status,409);
  check("Existing Send endpoint cannot bypass three-admin approval");
  const requested = await http(`${endpoint}/request`,{token:tokens[0],method:"POST",body:{}});
  assert.equal(requested.status,200,requested.body.message);
  assert.equal(requested.body.payout.approval.approvalCount,0);
  assert.equal(requested.body.payout.approval.requestedByAdminId,adminIds[0]);
  check("Request creates a Pending Approval cycle with requester identity and zero votes");
  const self = await http(`${endpoint}/approve`,{token:tokens[0],method:"POST",body:{}});
  assert.equal(self.status,403);
  assert.equal(self.body.message,"You cannot approve a payout request that you initiated.");
  check("Requester self-approval returns 403");
  for(let index=1;index<=3;index++) {
    const vote = await http(`${endpoint}/approve`,{token:tokens[index],method:"POST",body:{}});
    assert.equal(vote.status,200,vote.body.message);
    assert.equal(vote.body.payout.approval.approvalCount,index);
    assert.equal(vote.body.payout.payoutStatus,"Eligible");
    if(index===1) {
      const duplicate = await http(`${endpoint}/approve`,{token:tokens[index],method:"POST",body:{}});
      assert.equal(duplicate.status,409);
    }
    if(index===2) {
      const early = await http(`${endpoint}/release`,{token:tokens[0],method:"POST",body:{}});
      assert.equal(early.status,409);
      assert.match(early.body.message,/Three independent admin approvals/);
    }
    if(index===3) assert.equal(vote.body.payout.approval.status,"Approved");
  }
  check("Distinct admins progress 1/3, 2/3, 3/3; duplicate votes and release with two approvals are blocked");
  const released = await http(`${endpoint}/release`,{token:tokens[0],method:"POST",body:{}});
  assert.equal(released.status,200,released.body.message);
  assert.equal(released.body.payout.payoutStatus,"Paid");
  assert.equal(released.body.payout.payoutProvider,"demo");
  assert.equal(released.body.payout.isDemo,true);
  assert.match(released.body.payout.payoutReference,/^DEMO-PAYOUT-/);
  check("Explicit release persists Paid with demo provider and a DEMO-PAYOUT reference");
  const repeated = await http(`${endpoint}/release`,{token:tokens[0],method:"POST",body:{}});
  assert.equal(repeated.status,409);
  const [attempt] = await sql("SELECT COUNT(*) AS count FROM seller_payout_attempt WHERE split_id=?",[payoutId]);
  assert.equal(Number(attempt.count),1);
  check("Repeated release is blocked; exactly one attempt exists");
  const sellerToken = jwt.sign({student_id:sellerId},process.env.JWT_SECRET||"your_secret_key",{expiresIn:"2m"});
  const ledger = await http("/api/seller/orders/payouts",{token:sellerToken});
  assert.equal(ledger.status,200,ledger.body.message);
  const paid = ledger.body.orders.find(row=>row.payoutId===payoutId);
  assert.equal(paid.isDemo,true); assert.equal(paid.payoutStatus,"Paid");
  const notices = await sql("SELECT message FROM account_notifications WHERE role='seller' AND account_id=? AND order_id=?",[sellerId,orderId]);
  assert.ok(notices.some(row=>/Demo payout/i.test(row.message)));
  const audit = await sql("SELECT action FROM audit_logs WHERE actor IN (?) AND information LIKE ?",[adminIds.map(String),`%Payout ${payoutId},%`]);
  const actions = new Set(audit.map(row=>row.action));
  for(const name of ["PAYOUT_REQUESTED","PAYOUT_APPROVED","PAYOUT_RELEASED","PAYOUT_DEMO_SUCCEEDED"]) assert.ok(actions.has(name),`Missing audit ${name}`);
  check("Seller ledger, clearly labeled notification, and admin audit trail reflect simulated payment");
  report.status="PASSED";
} catch(error) {
  report.status="FAILED"; report.failure=error.message;
  console.error(error.name+": "+error.message); process.exitCode=1;
} finally {
  // Every deletion is scoped to IDs inserted by this run. No recursive cleanup,
  // no global status reset, no existing admin credential changes.
  if(orderId) await sql("DELETE FROM account_notifications WHERE order_id=?",[orderId]);
  if(payoutId) {
    await sql("DELETE v FROM seller_payout_approval v JOIN seller_payout_approval_cycle c ON c.cycle_id=v.cycle_id WHERE c.split_id=?",[payoutId]);
    await sql("UPDATE seller_payment_split SET approval_cycle_id=NULL WHERE split_id=?",[payoutId]);
    await sql("DELETE FROM seller_payout_approval_cycle WHERE split_id=?",[payoutId]);
    await sql("DELETE FROM seller_payout_attempt WHERE split_id=?",[payoutId]);
    await sql("DELETE FROM seller_payment_split WHERE split_id=?",[payoutId]);
  }
  if(itemId) await sql("DELETE FROM marketplace_order_item WHERE order_item_id=?",[itemId]);
  if(orderId) await sql("DELETE FROM marketplace_order WHERE order_id=?",[orderId]);
  if(sellerId) {await sql("DELETE FROM seller_payout_account WHERE student_id=?",[sellerId]);await sql("DELETE FROM student WHERE student_id=?",[sellerId]);}
  if(buyerId) await sql("DELETE FROM customer WHERE customer_id=?",[buyerId]);
  if(adminIds.length) {
    await sql("DELETE FROM account_notifications WHERE role='admin' AND account_id IN (?)",[adminIds]);
    await sql("DELETE FROM account_access WHERE role='admin' AND account_id IN (?)",[adminIds]);
    await sql("DELETE FROM audit_logs WHERE actor IN (?)",[[...adminIds.map(String),...usernames]]);
    await sql("DELETE FROM admin_role WHERE admin_id IN (?)",[adminIds]);
    await sql("DELETE FROM admin WHERE admin_id IN (?)",[adminIds]);
  }
  report.fixturesRemoved=true;
  await connection.end();
  await mkdir(new URL("../.cache/",import.meta.url),{recursive:true});
  await writeFile(new URL("../.cache/payout-demo-http-verification.json",import.meta.url),JSON.stringify(report,null,2)+"\n");
}
