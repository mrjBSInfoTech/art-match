import { Navigate } from "react-router-dom";

export const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    // No token, redirect to login with replace
    return <Navigate to="/" replace />;
  }

  return children;
};