import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import App from "./App";
import LandingPage from "./pages/LandingPage";
import GuestRoom from "./pages/GuestRoom";
import AuthPage from "./pages/AuthPage";      // Login + Register
import AuthSuccess from "./pages/AuthSuccess";
import AdminPanel from "./pages/AdminPanel";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Trang mặc định mở đầu tiên */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/guest-room" element={<GuestRoom />} />

        {/* App chính */}
        <Route path="/app" element={<App />} />

        {/* Auth */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth-success" element={<AuthSuccess />} />
        
        {/* Admin */}
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
