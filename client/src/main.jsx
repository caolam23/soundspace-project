// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppRouter from "./routes/AppRouter";
import { SocketProvider } from "./context/SocketContext"; // Thêm Provider
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <SocketProvider>
        <AppRouter />
      </SocketProvider>
    </BrowserRouter>
  </React.StrictMode>
);
