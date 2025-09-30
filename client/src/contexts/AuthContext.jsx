// client/src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import socket from "../services/socket"; // dùng chung socket singleton

// ==============================
// Tạo Context
// ==============================
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ==============================
  // Hàm dùng ngay sau login/register
  // ==============================
  const loginSuccess = (token, userData) => {
    // Lưu token + role
    localStorage.setItem("token", token);
    localStorage.setItem("role", userData.role);

    // Cập nhật context
    setUser(userData);

    // Kết nối socket và đăng ký userId
    const userId = userData._id || userData.id;
    if (userId) {
      socket.connect();
      socket.emit("register-user", userId);
      console.log("✅ Socket registered userId:", userId);
    }
  };

  // ==============================
  // Hàm fetch user từ backend (profile)
  // ==============================
  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const res = await axios.get("http://localhost:8800/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);

        // Nếu user tồn tại thì kết nối socket
        const userId = res.data?._id || res.data?.id;
        if (userId) {
          socket.connect();
          socket.emit("register-user", userId);
          console.log("🔄 Re-registered userId:", userId);
        }
      } catch (error) {
        console.error("❌ Phiên đăng nhập hết hạn hoặc không hợp lệ:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  // Chạy fetchUser khi load app
  useEffect(() => {
    fetchUser();

    // Không disconnect socket ở đây (singleton dùng chung).
    // Logout sẽ lo việc disconnect.
    return () => {};
  }, []);

  // ==============================
  // Đăng xuất
  // ==============================
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);

    if (socket && socket.connected) {
      socket.disconnect();
      console.log("👋 Socket disconnected on logout");
    }

    window.location.href = "/landing";
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, loginSuccess, logout, fetchUser, socket }}
    >
      {children}
    </AuthContext.Provider>
  );
};