import db from "../database/db.js";

// Generic can_edit also belongs to moderators. Money movement is restricted
// to the current database role, never a role claimed by React or a stale JWT.
export const requirePayoutAdmin = (req, res, next) => {
  db.query(`SELECT r.role,COALESCE(ac.is_banned,0) AS is_banned FROM admin_role r
    LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=r.admin_id WHERE r.admin_id = ?`, [req.user.admin_id], (error, rows) => {
    if (error) return res.status(500).json({ message: "Unable to verify payout permissions." });
    if (!["admin", "super admin"].includes(rows[0]?.role) || Number(rows[0]?.is_banned)) {
      return res.status(403).json({ message: "Only an administrator with finance access can manage payouts." });
    }
    next();
  });
};
