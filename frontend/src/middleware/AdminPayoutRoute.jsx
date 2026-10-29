import { Navigate, Outlet } from "react-router-dom";
import { canAccessAdminPayouts } from "../utils/adminPayoutAccess";

// Nested under AdminRoute so a denied role never mounts the payout page or its API calls.
export default function AdminPayoutRoute() {
  if (!canAccessAdminPayouts(localStorage.getItem("admin_role"))) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}
