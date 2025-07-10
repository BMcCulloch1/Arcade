import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // ✅ Use named import

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("authToken");

  if (!token) {
    console.warn("No token found, redirecting to login...");
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token); // ✅ Corrected function name
    if (decoded.exp * 1000 < Date.now()) {
      console.warn("Token expired, redirecting to login...");
      localStorage.removeItem("authToken");
      return <Navigate to="/login" replace />;
    }
  } catch (error) {
    console.error("Error decoding token:", error);
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
