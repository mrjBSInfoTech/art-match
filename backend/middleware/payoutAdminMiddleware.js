import db from "../database/db.js";

// Generic can_edit also belongs to moderators. Money movement is restricted
// to the current database role, never a role claimed by React or a stale JWT.
export const requirePayoutAdmin = (req, res, next) => {
  db.query("SELECT role FROM admin_role WHERE admin_id = ?", [req.user.admin_id], (error, rows) => {
    if (error) return res.status(500).json({ message: "Unable to verify payout permissions." });
    if (!["admin", "super admin"].includes(rows[0]?.role)) {
      return res.status(403).json({ message: "Only an administrator with finance access can manage payouts." });
    }
    next();
  });
};
