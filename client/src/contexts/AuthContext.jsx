// client/src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import socket from "../services/socket";
import { toast } from 'react-toastify';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketReady, setSocketReady] = useState(false); // 🆕 Track socket ready state
  const [blockModal, setBlockModal] = useState({ show: false, message: "" });
  const [passwordResetModal, setPasswordResetModal] = useState({ show: false, message: "" });
  const [ownerWarnings, setOwnerWarnings] = useState([]); // list of warnings sent to this user by admin

  // Hàm xử lý login thành công
  const loginSuccess = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", userData.role);
    setUser(userData);

    // Ngắt kết nối cũ (nếu có) để đảm bảo phiên mới sạch sẽ
    if (socket.connected) {
      socket.disconnect();
    }

    // Gắn token mới và kết nối lại
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

  // 🆕 useEffect chính: Chạy 1 lần khi App khởi động
 // Thêm vào AuthContext.jsx để debug socket connection

useEffect(() => {
  const token = localStorage.getItem("token");
  
  const onConnect = () => {
    console.log("✅ [AuthContext] Socket connected:", socket.id);
    console.log("   - Connected to:", socket.io.uri);
    setSocketReady(true);
  };

  const onDisconnect = () => {
    console.log("❌ [AuthContext] Socket disconnected");
    setSocketReady(false);
  };

  const onConnectError = (error) => {
    console.error("🔥 [AuthContext] Socket connection error:", error);
  };

  const onUserBlocked = (data) => {
    console.log("🚫 [AuthContext] User blocked event received:", data);
    if (data.blocked) {
      setBlockModal({ show: true, message: data.message });
    }
  };

  const onUserWarned = (data) => {
    try {
      console.log('⚠️ [AuthContext] user-warned event:', data);
      const warning = {
        id: data.reportId || Date.now().toString(),
        message: data.msg || 'Tài khoản của bạn đã bị cảnh báo. Vui lòng không tái phạm quá nhiều lần.' ,
        createdAt: new Date()
      };
      setOwnerWarnings((s) => {
        // avoid duplicates by id
        if (s.some(x => x.id === warning.id)) return s;
        return [warning, ...s];
      });
    } catch (e) {
      console.warn('[AuthContext] onUserWarned handler error:', e.message);
    }
  };

  const onPasswordReset = (data) => {
    console.log("🔐 [AuthContext] Password reset event received:", data);
    setPasswordResetModal({ 
      show: true, 
      message: data.message || "Mật khẩu của bạn đã được thay đổi. Vui lòng đăng nhập lại." 
    });
  };

  // ✅ Test listener for room-status-changed
  const onRoomStatusChanged = (data) => {
    console.log("🎵 [AuthContext] room-status-changed event received:", data);
  };

  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  socket.on("connect_error", onConnectError);
  socket.on("user-blocked", onUserBlocked);
  socket.on('user-warned', onUserWarned);
  socket.on("password-reset", onPasswordReset);
  socket.on("room-status-changed", onRoomStatusChanged); // 🆕 Test listener

  if (token) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
      console.log("🔌 [AuthContext] Initiating socket connection...");
    }
    fetchUser();
  } else {
    setLoading(false);
  }

  return () => {
    socket.off("connect", onConnect);
    socket.off("disconnect", onDisconnect);
    socket.off("connect_error", onConnectError);
    socket.off("user-blocked", onUserBlocked);
  socket.off('user-warned', onUserWarned);
    socket.off("password-reset", onPasswordReset);
    socket.off("room-status-changed", onRoomStatusChanged); // 🆕 Cleanup
    
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
    setSocketReady(false);

    if (socket.connected) {
      socket.disconnect();
      console.log("👋 Socket disconnected on logout.");
    }
    socket.auth = {};

    window.location.href = "/landing";
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        loading, 
        loginSuccess, 
        logout, 
        fetchUser, 
        socket,
        socketReady // 🆕 Export socketReady để components biết khi nào socket sẵn sàng
      }}
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

      {/* Modal: Password Reset */}
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

      {/* Bảng cảnh cáo cho chủ phòng / owner warnings (nếu có) */}
      {ownerWarnings.length > 0 && (
        <div style={{
          position: 'fixed',
          right: 20,
          top: 80,
          zIndex: 2000,
          width: 320,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          {ownerWarnings.map((w) => (
            <div key={w.id} style={{
              background: 'linear-gradient(90deg, #fff7ed, #fff1f2)',
              borderLeft: '4px solid #f59e0b',
              padding: '12px 14px',
              marginBottom: 10,
              borderRadius: 8,
              color: '#92400e',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Cảnh cáo từ quản trị</div>
                <div style={{ fontSize: 12, color: '#92400e' }}>{new Date(w.createdAt).toLocaleString('vi-VN')}</div>
              </div>
              <div style={{ color: '#92400e', marginBottom: 8 }}>{w.message}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => {
                    // dismiss this one warning
                    setOwnerWarnings((s) => s.filter(x => x.id !== w.id));
                  }}
                  style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#f97316', color: 'white', cursor: 'pointer', fontWeight: 700 }}
                >Đã hiểu</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}