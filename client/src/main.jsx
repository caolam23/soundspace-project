// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppRouter from "./routes/AppRouter";   // Router chính
import { AuthProvider } from "./contexts/AuthContext"; // Context Auth
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider> {/* Bọc toàn bộ ứng dụng */}
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
