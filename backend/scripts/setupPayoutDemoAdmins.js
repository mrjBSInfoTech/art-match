// Explicit local-development setup only. Never changes existing accounts or
// passwords, never creates orders, and never contacts a payment provider.
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
if (String(process.env.NODE_ENV || "").trim().toLowerCase() === "production" || process.env.PAYOUT_PROVIDER !== "demo") {
  throw new Error("This setup requires explicit PAYOUT_PROVIDER=demo outside production.");
}
if (!["localhost", "127.0.0.1", "::1"].includes(process.env.DB_HOST)) {
  throw new Error("Demo admin setup is limited to a local development database.");
}
const createMissing = process.argv.includes("--create-missing-admins");
if (process.argv.slice(2).some(arg => arg !== "--create-missing-admins")) {
  throw new Error("Unknown setup argument. Use --create-missing-admins only when you want to add demonstration accounts.");
}
const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
const eligibleAdmins = async () => (await connection.query(`SELECT a.admin_id,a.username,r.role
  FROM admin a JOIN admin_role r ON r.admin_id=a.admin_id
  LEFT JOIN account_access aa ON aa.role='admin' AND aa.account_id=a.admin_id
  WHERE r.role IN ('admin','super admin') AND COALESCE(aa.is_banned,0)=0
  ORDER BY a.admin_id`))[0];
let locked = false;
try {
  if (createMissing) {
    const [[lock]] = await connection.query("SELECT GET_LOCK('artmatch:payout-demo-admin-setup',5) AS acquired");
    if (Number(lock.acquired) !== 1) throw new Error("Another demo setup is running; try again shortly.");
    locked = true;
    await connection.beginTransaction();
  }
  let admins = await eligibleAdmins();
  if (admins.length < 4 && createMissing) {
    const password = process.env.DEMO_ADMIN_PASSWORD || "";
    if (password.length < 12 || password.length > 72 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      throw new Error("Set DEMO_ADMIN_PASSWORD to a temporary demo password of 12–72 characters with uppercase, lowercase and numbers. It will not be printed or saved to a report.");
    }
    let suffix = 1;
    while (admins.length < 4) {
      const username = `PayoutDemoAdmin${suffix}`;
      const email = `payout-demo-admin${suffix}@example.invalid`;
      suffix += 1;
      const [existing] = await connection.query("SELECT admin_id FROM admin WHERE username=? OR email=?", [username, email]);
      if (existing.length) continue;
      const hash = await bcrypt.hash(password, 12);
      const [created] = await connection.query(`INSERT INTO admin
        (username,password,first_name,last_name,email,password_changed,image)
        VALUES (?,?,'Payout','Demo',?,1,NULL)`, [username,hash,email]);
      await connection.query(`INSERT INTO admin_role
        (admin_id,role,can_add,can_edit,can_delete,can_promote,can_demote)
        VALUES (?,'admin',0,0,0,0,0)`, [created.insertId]);
      admins = await eligibleAdmins();
    }
  }
  if (createMissing) await connection.commit();
  console.log(JSON.stringify({ financeAdmins: admins, ready: admins.length >= 4,
    message: admins.length >= 4 ? "At least four separate finance admin accounts are available."
      : "Four different admins are needed. Add one through Manage Users > Admins, or explicitly run this script with --create-missing-admins and DEMO_ADMIN_PASSWORD." }, null, 2));
} catch (error) {
  if (createMissing) await connection.rollback();
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (locked) await connection.query("SELECT RELEASE_LOCK('artmatch:payout-demo-admin-setup')");
  await connection.end();
}
