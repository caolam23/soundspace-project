// src/routes/AppRouter.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

// Pages
import App from "../App";
import LandingPage from "../pages/LandingPage";
import GuestRoom from "../pages/GuestRoom";
import AuthPage from "../pages/AuthPage";      // Login + Register
import AuthSuccess from "../pages/AuthSuccess";
import AdminPanel from "../pages/AdminPanel";

// Components
import AdminRoute from "../components/AdminRoute";

export default function AppRouter() {
  return (
    <Routes>
      {/* Trang mặc định mở đầu tiên */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/guest-room" element={<GuestRoom />} />

      {/* App chính */}
      <Route path="/app" element={<App />} />

      {/* Auth */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth-success" element={<AuthSuccess />} />

      {/* Admin (được bảo vệ bởi AdminRoute) */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
