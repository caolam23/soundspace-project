// src/routes/AppRouter.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

// Pages
import App from "../App";
import LandingPage from "../pages/LandingPage";
import GuestRoom from "../pages/GuestRoom";
import AuthPage from "../pages/AuthPage";
import AuthSuccess from "../pages/AuthSuccess";
import AdminLayout from "../pages/AdminLayout"; // Layout mới

// Pages con cho admin
import Dashboard from "../pages/admin/Dashboard"; // Ví dụ
import Users from "../pages/admin/Users";
import Settings from "../pages/admin/Settings";
import QuanLyPhong from "../pages/admin/QuanLyPhong"; // Import page quản lý phòng
// Components
import AdminRoute from "../components/AdminRoute";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/guest-room" element={<GuestRoom />} />
      <Route path="/app" element={<App />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth-success" element={<AuthSuccess />} />

      {/* Admin routes: Nested dưới layout */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<Dashboard />} /> {/* Default: /admin -> Dashboard */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
        <Route path="quanlyphong" element={<QuanLyPhong />} />
        {/* Thêm route con khác ở đây */}
      </Route>
    </Routes>
  );
}