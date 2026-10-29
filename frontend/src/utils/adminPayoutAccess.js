// UI visibility only. The payout API independently checks the current database role.
export function canAccessAdminPayouts(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return normalizedRole === "admin" || normalizedRole === "super admin";
}
