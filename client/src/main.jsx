// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";   // 👈 import toast provider

import AppRouter from "./routes/AppRouter";
import { SocketProvider } from "./contexts/SocketContext";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <SocketProvider>
          <AppRouter />
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: "#000",
                color: "#fff",
                borderRadius: "8px",
                padding: "12px 16px",
              },
            }}
          />
        </SocketProvider>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
