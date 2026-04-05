import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

// Pages
import App from "../App";
import LandingPage from "../pages/LandingPage";
import GuestRoom from "../pages/GuestRoom";
import AuthPage from "../pages/AuthPage";
import AuthSuccess from "../pages/AuthSuccess";
import UserHomePage from "../pages/UserHomePage";
import RoomPage from "../pages/RoomPage";


// Admin
import AdminLayout from "../pages/AdminLayout";
import Dashboard from "../pages/admin/Dashboard";
import Users from "../pages/admin/Users";
import Settings from "../pages/admin/Settings";
import QuanLyPhong from "../pages/admin/QuanLyPhong";
import Reports from "../pages/admin/Reports";
import Content from "../pages/admin/Content";
import QuanLyBinhLuan from "../pages/admin/QuanLyBinhLuan"; // <<< 1. IMPORT COMPONENT MỚI
// Import thêm trang thống kê
import StatisticsPage from "../pages/admin/StatisticsPage";

// Component bảo vệ route User
const UserRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  return user && user.role === "user" ? children : <Navigate to="/landing" />;
};

// Component bảo vệ route Admin
const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  return user && user.role === "admin" ? children : <Navigate to="/landing" />;
};

export default function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/guest-room" element={<GuestRoom />} />

      {/* Auth */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth-success" element={<AuthSuccess />} />

      {/* User routes */}
      <Route path="/user-home" element={<UserHomePage />} />
      <Route path="/home" element={<UserHomePage />} />

      {/* Room */}
      <Route path="/room/:roomId" element={<RoomPage />} />

      {/* Route bảo vệ cho User */}
      <Route
        path="/"
        element={
          <UserRoute>
            <UserHomePage />
          </UserRoute>
        }
      />

      <Route
        path="/app"
        element={
          <UserRoute>
            <App />
          </UserRoute>
        }
      />

      {/* Admin routes (có thể dùng Layout hoặc Panel) */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
        <Route path="quanlyphong" element={<QuanLyPhong />} />
        <Route path="content" element={<Content />} />
        <Route path="content/reports" element={<Reports />} />
        <Route path="comments" element={<QuanLyBinhLuan />} />
        <Route path="analytics" element={<StatisticsPage />} />
      </Route>

      {/* Redirect mặc định */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
