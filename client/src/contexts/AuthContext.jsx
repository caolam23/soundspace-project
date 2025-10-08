// client/src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import socket from "../services/socket";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockModal, setBlockModal] = useState({ show: false, message: "" });
  // 🔥 State mới cho password reset modal
  const [passwordResetModal, setPasswordResetModal] = useState({ show: false, message: "" });

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
      logout();
    } finally {
        setLoading(false);
    }
  };

  // useEffect chính: Chạy 1 lần khi App khởi động
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      socket.auth = { token };
      socket.connect();
      console.log("✅ Socket connected on App initial load.");
      fetchUser();
    } else {
      setLoading(false);
    }

    // 🔥 Handler cho event user-blocked
    const onUserBlocked = (data) => {
      console.log("🚫 User blocked event received:", data);
      if (data.blocked) {
        setBlockModal({ show: true, message: data.message });
      }
    };

    // 🔥 Handler cho event password-reset
    const onPasswordReset = (data) => {
      console.log("🔐 Password reset event received:", data);
      setPasswordResetModal({ 
        show: true, 
        message: data.message || "Mật khẩu của bạn đã được thay đổi. Vui lòng đăng nhập lại." 
      });
    };

    // Đăng ký các socket listeners
    socket.on("user-blocked", onUserBlocked);
    socket.on("password-reset", onPasswordReset);

    // Cleanup
    return () => {
      socket.off("user-blocked", onUserBlocked);
      socket.off("password-reset", onPasswordReset);
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  // Hàm Logout
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);

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

      {/* Modal: User Blocked */}
      {blockModal.show && (
         <div style={{ 
           position: "fixed", 
           top: 0, 
           left: 0, 
           width: "100vw", 
           height: "100vh", 
           background: "rgba(0,0,0,0.6)", 
           backdropFilter: "blur(4px)",
           zIndex: 9999, 
           display: "flex", 
           alignItems: "center", 
           justifyContent: "center",
           animation: "fadeIn 0.2s ease-out"
         }}>
           <div style={{ 
             background: "white", 
             padding: 32, 
             borderRadius: 12, 
             boxShadow: "0 8px 32px rgba(0,0,0,0.2)", 
             maxWidth: 400, 
             textAlign: "center",
             animation: "slideUp 0.3s ease-out"
           }}>
             <div style={{ 
               width: 64, 
               height: 64, 
               margin: "0 auto 16px", 
               background: "linear-gradient(135deg, #dc2626, #991b1b)", 
               borderRadius: "50%", 
               display: "flex", 
               alignItems: "center", 
               justifyContent: "center",
               fontSize: 32
             }}>
               🚫
             </div>
             <h2 style={{ 
               color: "#dc2626", 
               marginBottom: 16,
               fontSize: 22,
               fontWeight: 600
             }}>
               Tài khoản đã bị chặn
             </h2>
             <p style={{ 
               marginBottom: 24,
               color: "#6b7280",
               lineHeight: 1.6
             }}>
               {blockModal.message || "Nếu có thắc mắc vui lòng liên hệ với quản trị viên."}
             </p>
             <button style={{ 
               padding: "12px 32px", 
               background: "linear-gradient(135deg, #dc2626, #991b1b)", 
               color: "white", 
               border: "none", 
               borderRadius: 8, 
               fontWeight: 600, 
               cursor: "pointer",
               fontSize: 14,
               transition: "transform 0.2s"
             }}
               onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
               onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
               onClick={() => {
                 setBlockModal({ show: false, message: "" });
                 logout();
               }}
             >
               Đã hiểu
             </button>
           </div>
         </div>
       )}

      {/* 🔥 Modal: Password Reset */}
      {passwordResetModal.show && (
         <div style={{ 
           position: "fixed", 
           top: 0, 
           left: 0, 
           width: "100vw", 
           height: "100vh", 
           background: "rgba(0,0,0,0.6)", 
           backdropFilter: "blur(4px)",
           zIndex: 9999, 
           display: "flex", 
           alignItems: "center", 
           justifyContent: "center",
           animation: "fadeIn 0.2s ease-out"
         }}>
           <div style={{ 
             background: "white", 
             padding: 32, 
             borderRadius: 12, 
             boxShadow: "0 8px 32px rgba(0,0,0,0.2)", 
             maxWidth: 400, 
             textAlign: "center",
             animation: "slideUp 0.3s ease-out"
           }}>
             <div style={{ 
               width: 64, 
               height: 64, 
               margin: "0 auto 16px", 
               background: "linear-gradient(135deg, #f59e0b, #dc2626)", 
               borderRadius: "50%", 
               display: "flex", 
               alignItems: "center", 
               justifyContent: "center",
               fontSize: 32
             }}>
               🔐
             </div>
             <h2 style={{ 
               color: "#dc2626", 
               marginBottom: 16,
               fontSize: 22,
               fontWeight: 600
             }}>
               Mật khẩu đã được thay đổi
             </h2>
             <p style={{ 
               marginBottom: 24,
               color: "#6b7280",
               lineHeight: 1.6
             }}>
               {passwordResetModal.message}
             </p>
             <button style={{ 
               padding: "12px 32px", 
               background: "linear-gradient(135deg, #f59e0b, #dc2626)", 
               color: "white", 
               border: "none", 
               borderRadius: 8, 
               fontWeight: 600, 
               cursor: "pointer",
               fontSize: 14,
               transition: "transform 0.2s"
             }}
               onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
               onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
               onClick={() => {
                 setPasswordResetModal({ show: false, message: "" });
                 logout();
               }}
             >
               Đăng nhập lại
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