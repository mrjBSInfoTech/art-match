import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../../utils/auth";

export default function BuyerRoute() {
  if (!isAuthenticated("buyer")) {
    return <Navigate to="/buyer/login" replace />;
  }

  return <Outlet />;
}