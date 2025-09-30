// src/routes/AppRouter.jsx
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
import AdminPanel from "../pages/AdminPanel";
import RoomPage from "../pages/RoomPage";

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
      {/* Route cho khách */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/guest-room" element={<GuestRoom />} />

      {/* Auth */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth-success" element={<AuthSuccess />} />

      {/* Route cho user */}
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

      {/* App chính */}
      <Route
        path="/app"
        element={
          <UserRoute>
            <App />
          </UserRoute>
        }
      />

      {/* Route bảo vệ cho Admin */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />

      {/* Redirect mặc định */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
