// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppRouter from "./routes/AppRouter";
import { SocketProvider } from "./contexts/SocketContext"; // Thêm Provider
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext"; // Context Auth

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider> {/* Bọc toàn bộ ứng dụng */}
    <BrowserRouter>
      <SocketProvider>
        <AppRouter />
      </SocketProvider>
    </BrowserRouter>
      </AuthProvider>
  </React.StrictMode>
);
