import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../../utils/auth";

export default function SellerRoute() {
  if (!isAuthenticated("seller")) {
    return <Navigate to="/seller/login" replace />;
  }

  return <Outlet />;
}