/*
 * QA helper: create two temporary artworks for two different sellers and put
 * them in buyer 1's cart, so the multi-storefront checkout UI can be checked.
 *
 *   node backend/scripts/qaSeedSplitCart.mjs
 *   node backend/scripts/qaSeedSplitCart.mjs --clean
 */
import "dotenv/config";
import fs from "node:fs";
import db from "../database/db.js";

const MARKER = "__QA_SPLIT__";
const clean = process.argv.includes("--clean");
const query = (sql, values = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, values, (error, rows) => (error ? reject(error) : resolve(rows))),
  );

if (clean) {
  const rows = await query("SELECT artwork_id FROM artwork WHERE title LIKE ?", [`${MARKER}%`]);
  const ids = rows.map((r) => r.artwork_id);
  if (ids.length) {
    await query("DELETE FROM cart_item WHERE artwork_id IN (?)", [ids]);
    await query("DELETE FROM artupload WHERE artwork_id IN (?)", [ids]);
    await query("DELETE FROM artwork WHERE artwork_id IN (?)", [ids]);
  }
  const leftovers = await query("SELECT COUNT(*) AS n FROM artwork WHERE title LIKE ?", [`${MARKER}%`]);
  console.log(`Removed ${ids.length} temporary artwork(s). Remaining markers: ${leftovers[0].n}`);
  await db.promise().end();
} else {
  const { b: buyerToken } = JSON.parse(
    fs.readFileSync(new URL("../../qa-tokens.json", import.meta.url), "utf8"),
  );

  const sellers = await query("SELECT student_id FROM student ORDER BY student_id LIMIT 2");
  const prices = [1150, 2150];
  const ids = [];

  for (let i = 0; i < sellers.length; i += 1) {
    const [result] = await db.promise().query(
      `INSERT INTO artwork (student_id, title, art_size, art_type, status, is_sold,
         genre, price, description, image, date_created)
       VALUES (?, ?, '24x36', 'Digital', 'Available', 0, 'Abstract', ?, 'QA fixture', 'StarryNight.webp', NOW())`,
      [sellers[i].student_id, `${MARKER} piece ${i + 1}`, prices[i]],
    );
    ids.push(result.insertId);
    await query("INSERT INTO artupload (artwork_id, request_status) VALUES (?, 'Verified')", [result.insertId]);

    const res = await fetch("http://127.0.0.1:5000/api/buyer/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify({ artwork_id: result.insertId }),
    });
    console.log(`  cart add artwork ${result.insertId} (seller ${sellers[i].student_id}) -> HTTP ${res.status}`);
  }

  console.log(`Seeded artworks: ${ids.join(", ")}`);
  await db.promise().end();
}
