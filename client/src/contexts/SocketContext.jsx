// src/contexts/SocketContext.jsx
import React, { createContext, useContext, useEffect } from "react";
import socket from "../services/socket";
import { useAuth } from "./AuthContext"; // cần lấy user từ context

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    socket.connect();

    socket.on("connect", () => {
      console.log(`✅ Connected to server with id: ${socket.id}`);
      // 🔥 Đăng ký user ngay sau khi connect
      socket.emit("register-user", user._id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
