import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../../utils/auth";

export default function AdminRoute() {
  if (!isAuthenticated("admin")) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}