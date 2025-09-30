// src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect } from "react";
import socket from "../services/socket";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  useEffect(() => {
    // Kết nối socket
    socket.connect();

    function onConnect() {
      console.log(`✅ Connected to server with id: ${socket.id}`);
    }

    function onDisconnect() {
      console.log("❌ Disconnected from server");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Cleanup
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook tiện lợi
export const useSocket = () => useContext(SocketContext);
