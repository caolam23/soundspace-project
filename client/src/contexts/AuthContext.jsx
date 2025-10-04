// client/src/contexts/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import socket from "../services/socket"; // Vẫn import socket với autoConnect: false

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockModal, setBlockModal] = useState({ show: false, message: "" });

  // Hàm xử lý login thành công
  const loginSuccess = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", userData.role);
    setUser(userData);

    // Ngắt kết nối cũ (nếu có) để đảm bảo phiên mới sạch sẽ
    if (socket.connected) {
      socket.disconnect();
    }

    // Gắn token mới và kết nối lại. Server sẽ tự động đăng ký user qua middleware.
    socket.auth = { token };
    socket.connect();
    console.log("✅ Socket re-connected with new token after login.");
  };

  // Hàm fetch user profile
  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        setLoading(false);
        return;
    }
    
    try {
      const res = await axios.get("http://localhost:8800/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (error) {
      console.error("❌ Phiên đăng nhập hết hạn hoặc không hợp lệ:", error);
      // Gọi logout để dọn dẹp token cũ
      logout();
    } finally {
        setLoading(false);
    }
  };

  // useEffect chính: Chạy 1 lần khi App khởi động
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Nếu có token, gắn vào socket và kết nối ngay lập tức
      socket.auth = { token };
      socket.connect();
      console.log("✅ Socket connected on App initial load.");
      // Sau đó mới fetch user
      fetchUser();
    } else {
      // Nếu không có token, không cần làm gì, chỉ dừng loading
      setLoading(false);
    }

    const onUserBlocked = (data) => {
      if (data.blocked) {
        setBlockModal({ show: true, message: data.message });
      }
    };
    socket.on("user-blocked", onUserBlocked);

    return () => {
      socket.off("user-blocked", onUserBlocked);
      // Dọn dẹp kết nối khi App hoàn toàn unmount (hiếm khi xảy ra)
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []); // Chỉ chạy 1 lần

  // Hàm Logout
  const logout = () => {
    // Không cần emit 'user-logout' vì server xử lý qua 'disconnect'
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);

    // Ngắt kết nối và xóa token khỏi auth
    if (socket.connected) {
      socket.disconnect();
      console.log("👋 Socket disconnected on logout.");
    }
    socket.auth = {};

    window.location.href = "/landing";
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, loginSuccess, logout, fetchUser, socket }}
    >
      {children}
      {/* Modal block user không đổi */}
      {blockModal.show && (
         <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", }}>
           <div style={{ background: "white", padding: 32, borderRadius: 12, boxShadow: "0 2px 16px #0002", maxWidth: 400, textAlign: "center", }} >
             <h2 style={{ color: "#dc2626", marginBottom: 16 }}>
               Tài khoản của bạn đã bị chặn
             </h2>
             <p style={{ marginBottom: 24 }}>
               {blockModal.message || "Nếu có thắc mắc vui lòng liên hệ với quản trị viên."}
             </p>
             <button style={{ padding: "8px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer", }}
               onClick={() => {
                 setBlockModal({ show: false, message: "" });
                 logout();
               }}
             >
               OK
             </button>
           </div>
         </div>
       )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};