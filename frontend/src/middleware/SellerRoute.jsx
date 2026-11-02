import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated } from "../../utils/auth";

export default function SellerRoute() {
  const location = useLocation();

  if (!isAuthenticated("seller")) {
    return <Navigate to="/seller/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}