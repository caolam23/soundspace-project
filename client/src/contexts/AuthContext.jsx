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
  const [blockModal, setBlockModal] = useState({ show: false, message: '' });

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

    // Listen for user-blocked event
    if (socket) {
      socket.on('user-blocked', (data) => {
        if (data.blocked) {
          setBlockModal({ show: true, message: data.message });
        }
      });
    }
    return () => {
      if (socket) socket.off('user-blocked');
    };
  }, []);

  // ==============================
  // Đăng xuất
  // ==============================
  const logout = () => {
    // 🔥 Emit logout event trước khi disconnect
    const userId = user?._id || user?.id;
    if (userId && socket && socket.connected) {
      socket.emit('user-logout', userId);
      console.log("👋 Emitted user-logout for userId:", userId);
    }

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
      {blockModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 12, boxShadow: '0 2px 16px #0002', maxWidth: 400, textAlign: 'center' }}>
            <h2 style={{ color: '#dc2626', marginBottom: 16 }}>Tài khoản của bạn đã bị chặn</h2>
            <p style={{ marginBottom: 24 }}>{blockModal.message || 'Nếu có thắc mắc vui lòng liên hệ với quản trị viên.'}</p>
            <button
              style={{ padding: '8px 24px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
              onClick={() => {
                setBlockModal({ show: false, message: '' });
                logout();
              }}
            >OK</button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};