/*
 * Verifies multi-seller payment splitting against the real API and database.
 *
 * Creates TWO temporary artworks belonging to two different EXISTING sellers,
 * puts them in a real buyer's cart, checks out, then inspects the recorded
 * splits. Everything it creates carries a QA marker and is removed at the end.
 *
 *   node backend/scripts/verifyMultiSellerSplit.mjs
 */
import "dotenv/config";
import jwt from "jsonwebtoken";
import db from "../database/db.js";
import { buildPaymentSplit, validateSplits } from "../utils/paymentSplit.js";
import { ensurePaymentSplitTable } from "../database/paymentSplits.js";

const BASE = process.env.VERIFY_BASE || "http://127.0.0.1:5000";
const MARKER = "__QA_SPLIT__";
const query = (sql, values = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, values, (error, rows) => (error ? reject(error) : resolve(rows))),
  );

const log = (...args) => console.log(...args);
const created = { artworks: [], orders: [] };

await ensurePaymentSplitTable();

const buyerId = 1;
const token = jwt.sign({ id: buyerId, customer_id: buyerId }, process.env.JWT_SECRET, {
  expiresIn: "10m",
});

const buyer = (await query("SELECT first_name, last_name, email FROM customer WHERE customer_id = ?", [buyerId]))[0];
const address = (await query("SELECT * FROM address WHERE customer_id = ? LIMIT 1", [buyerId]))[0];
if (!address) throw new Error("Buyer has no saved address; cannot check out.");

const sellers = await query("SELECT student_id, first_name, last_name FROM student ORDER BY student_id LIMIT 2");
if (sellers.length < 2) throw new Error("Need two sellers to test a split.");
const prices = [1150, 2150];

try {
  // --- temporary fixtures -------------------------------------------------
  for (let i = 0; i < 2; i += 1) {
    const existing = await query(
      "SELECT artwork_id, image FROM artwork WHERE student_id = ? LIMIT 1",
      [sellers[i].student_id],
    );
    const image = existing[0]?.image || "StarryNight.webp";
    const [result] = await db.promise().query(
      `INSERT INTO artwork (student_id, title, art_size, art_type, status, is_sold,
         genre, price, description, image, date_created)
       VALUES (?, ?, '24x36', 'Digital', 'Available', 0, 'Abstract', ?, 'QA fixture', ?, NOW())`,
      [sellers[i].student_id, `${MARKER} ${sellers[i].first_name} piece`, prices[i], image],
    );
    created.artworks.push(result.insertId);
    await db.promise().query(
      `INSERT INTO artupload (artwork_id, request_status, request_date, approved_date)
       VALUES (?, 'Verified', NOW(), NOW())`,
      [result.insertId],
    );
  }

  log(`Buyer: ${buyer.first_name} ${buyer.last_name}`);
  log(`Sellers: ${sellers.map((s) => `${s.first_name} (id ${s.student_id})`).join(", ")}`);

  for (const artworkId of created.artworks) {
    const res = await fetch(`${BASE}/api/buyer/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ artwork_id: artworkId }),
    });
    if (!res.ok) log(`  cart add ${artworkId} -> HTTP ${res.status} ${await res.text()}`);
  }

  // --- real checkout ------------------------------------------------------
  const checkout = await fetch(`${BASE}/api/buyer/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ payment_method: "cod", address_id: address.address_id }),
  });
  const body = await checkout.json().catch(() => ({}));
  log(`\nCheckout -> HTTP ${checkout.status}`);
  if (!checkout.ok) {
    log("Response:", JSON.stringify(body).slice(0, 500));
    throw new Error("Checkout failed");
  }

  const orderIds = (body.orders || []).map((o) => o.orderId).filter(Boolean);
  created.orders = orderIds;
  log(`Created ${orderIds.length} seller order(s): ${orderIds.join(", ")}`);

  // --- inspect ------------------------------------------------------------
  const splits = await query(
    `SELECT order_id, seller_id, gross_amount, commission_amount,
            processing_fee_amount, net_amount, payout_status
       FROM seller_payment_split WHERE order_id IN (?) ORDER BY seller_id`,
    [orderIds],
  );

  log("\nRecorded splits:");
  let grossTotal = 0;
  let netTotal = 0;
  for (const s of splits) {
    grossTotal += Number(s.gross_amount);
    netTotal += Number(s.net_amount);
    log(
      `  seller ${s.seller_id} | order ${s.order_id} | gross ₱${Number(s.gross_amount).toFixed(2)}` +
        ` | commission ₱${Number(s.commission_amount).toFixed(2)}` +
        ` | fee ₱${Number(s.processing_fee_amount).toFixed(2)}` +
        ` | net ₱${Number(s.net_amount).toFixed(2)} | ${s.payout_status}`,
    );
  }

  const orders = await query(
    "SELECT order_id, seller_id, total_amount FROM marketplace_order WHERE order_id IN (?)",
    [orderIds],
  );
  const charged = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  log(`\nBuyer charged total : ₱${charged.toFixed(2)}`);
  log(`Sum of seller gross : ₱${grossTotal.toFixed(2)} -> ${Math.abs(charged - grossTotal) < 0.005 ? "MATCH" : "MISMATCH"}`);
  log(`Sum of seller net   : ₱${netTotal.toFixed(2)}`);
  log(`Sellers paid        : ${new Set(splits.map((s) => s.seller_id)).size} (distinct)`);

  const problems = validateSplits(
    splits.map((s) => ({
      orderId: s.order_id,
      grossAmount: Number(s.gross_amount),
      commissionAmount: Number(s.commission_amount),
      processingFeeAmount: Number(s.processing_fee_amount),
      netAmount: Number(s.net_amount),
    })),
    { grossAmount: grossTotal },
    charged,
  );
  log(`Invariants          : ${problems.length ? problems.join("; ") : "all satisfied"}`);

  // --- seller isolation ---------------------------------------------------
  const seller1Token = jwt.sign(
    { id: sellers[0].student_id, student_id: sellers[0].student_id },
    process.env.JWT_SECRET,
    { expiresIn: "10m" },
  );
  const payouts = await (
    await fetch(`${BASE}/api/seller/orders/payouts`, {
      headers: { Authorization: `Bearer ${seller1Token}` },
    })
  ).json();
  log(`\nSeller ${sellers[0].student_id} payout API -> ${payouts.orders?.length ?? "?"} row(s) visible`);
  log(`  totals: ${JSON.stringify(payouts.totals)}`);

  const rebuilt = buildPaymentSplit(
    orders.map((o) => ({ orderId: o.order_id, sellerId: o.seller_id, totalAmount: Number(o.total_amount) })),
    { commissionRate: 0 },
  );
  log(`Deterministic rebuild: ${rebuilt.totals.netAmount === netTotal ? "stable" : "CHANGED"}`);
} finally {
  // --- cleanup: only what this run created --------------------------------
  if (created.orders.length) {
    await query("DELETE FROM seller_payment_split WHERE order_id IN (?)", [created.orders]);
    await query("DELETE FROM marketplace_order_item WHERE order_id IN (?)", [created.orders]);
    await query("DELETE FROM marketplace_order WHERE order_id IN (?)", [created.orders]);
  }
  if (created.artworks.length) {
    await query("DELETE FROM cart_item WHERE artwork_id IN (?)", [created.artworks]);
    await query("DELETE FROM artupload WHERE artwork_id IN (?)", [created.artworks]);
    await query("DELETE FROM artwork WHERE artwork_id IN (?) AND title LIKE ?", [
      created.artworks,
      `${MARKER}%`,
    ]);
  }
  log("\nTemporary fixtures removed.");
  await db.promise().end();
}
