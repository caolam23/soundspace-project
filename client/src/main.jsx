// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// Giữ lại import của react-hot-toast cho các thông báo cũ
import { Toaster } from "react-hot-toast"; 
// ✅ BƯỚC 1: Thêm import của react-toastify
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
          
          {/* Giữ lại Toaster của react-hot-toast */}
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

          {/* ✅ BƯỚC 2: Thêm ToastContainer của react-toastify vào đây */}
          <ToastContainer
            newestOnTop
            pauseOnFocusLoss={false}
            closeOnClick
            draggable={false}
            limit={3}
          />
        </SocketProvider>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);