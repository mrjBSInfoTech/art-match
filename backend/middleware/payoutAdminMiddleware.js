import db from "../database/db.js";

// Generic can_edit also belongs to moderators. Money movement is restricted
// to the current database role, never a role claimed by React or a stale JWT.
// Customizable and Moderation admins require Super Admin approval.
export const checkAdminPayoutAccess = (adminId, callback) => {
  db.query(`SELECT r.role,COALESCE(ac.is_banned,0) AS is_banned,
    p.status AS permission_status, p.requested_at, p.reviewed_at, p.rejection_reason
    FROM admin_role r
    LEFT JOIN account_access ac ON ac.role='admin' AND ac.account_id=r.admin_id
    LEFT JOIN admin_payout_permission_request p ON p.admin_id=r.admin_id
    WHERE r.admin_id = ?`, [adminId], (error, rows) => {
    if (error) return callback(error);
    const row = rows[0];
    const role = row?.role;
    const isBanned = Boolean(Number(row?.is_banned));
    const permissionStatus = row?.permission_status || "Not Requested";
    const isAuthorized = !isBanned && (
      ["admin", "super admin"].includes(role) ||
      (["moderator", "customize", "customizable"].includes(role) && permissionStatus === "Approved")
    );
    callback(null, {
      role,
      isBanned,
      isAuthorized,
      permissionStatus,
      requestedAt: row?.requested_at,
      reviewedAt: row?.reviewed_at,
      rejectionReason: row?.rejection_reason,
    });
  });
};

export const requirePayoutAdmin = (req, res, next) => {
  checkAdminPayoutAccess(req.user.admin_id, (error, access) => {
    if (error) return res.status(500).json({ message: "Unable to verify payout permissions." });
    if (!access || !access.isAuthorized) {
      return res.status(403).json({ message: "Only an administrator with finance access can manage payouts." });
    }
    req.payoutAccess = access;
    next();
  });
};

export const allowPayoutAdminOrApplicant = (req, res, next) => {
  checkAdminPayoutAccess(req.user.admin_id, (error, access) => {
    if (error) return res.status(500).json({ message: "Unable to verify payout permissions." });
    if (!access || access.isBanned) {
      return res.status(403).json({ message: "Account is restricted." });
    }
    req.payoutAccess = access;
    next();
  });
};
