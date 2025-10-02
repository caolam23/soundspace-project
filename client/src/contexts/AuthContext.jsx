// client/src/contexts/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import socket from "../services/socket"; // dùng chung socket singleton

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockModal, setBlockModal] = useState({ show: false, message: "" });

  const loginSuccess = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", userData.role);
    setUser(userData);
    
    // loginSuccess chỉ cần connect, không cần emit ở đây nữa
    // vì useEffect bên dưới sẽ xử lý việc emit
    if (!socket.connected) {
      socket.connect();
    }
  };

  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const res = await axios.get("http://localhost:8800/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
        // Tương tự loginSuccess, chỉ cần connect
        if (!socket.connected) {
          socket.connect();
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

  useEffect(() => {
    fetchUser();
  }, []);
  
  // ===================================================================
  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ SỬA LỖI Ở ĐÂY ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
  // ===================================================================
  // useEffect này sẽ xử lý việc đăng ký userId mỗi khi kết nối thành công
  // và xử lý các sự kiện socket khác.
  useEffect(() => {
    // Hàm này sẽ được gọi mỗi khi socket kết nối/kết nối lại thành công
    const onConnect = () => {
      console.log('✅ Socket connected!');
      // Chỉ emit register-user nếu đã có thông tin user
      if (user?._id) {
        console.log(`✅ Emitting 'register-user' for ${user._id}`);
        socket.emit('register-user', user._id);
      }
    };
    
    const onUserBlocked = (data) => {
      if (data.blocked) {
        setBlockModal({ show: true, message: data.message });
      }
    };

    // Lắng nghe sự kiện 'connect'
    socket.on('connect', onConnect);
    socket.on("user-blocked", onUserBlocked);
    
    // Nếu khi component mount mà đã có user và socket đã kết nối rồi
    // (trường hợp chuyển trang nhanh), thì emit luôn
    if (user?._id && socket.connected) {
        console.log(`✅ Initial check: Emitting 'register-user' for ${user._id}`);
        socket.emit('register-user', user._id);
    }

    // Dọn dẹp khi component unmount hoặc user thay đổi
    return () => {
      socket.off('connect', onConnect);
      socket.off("user-blocked", onUserBlocked);
    };
  }, [user]); // Phụ thuộc vào `user`, khi user thay đổi (login/logout), useEffect sẽ chạy lại

  const logout = () => {
    const userId = user?._id || user?.id;
    if (userId && socket && socket.connected) {
      socket.emit("user-logout", userId);
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
      {/* Modal block user không thay đổi */}
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