import { io } from "socket.io-client";

// ✅ Vite dùng import.meta.env, không phải process.env
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8800";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

// Debug tất cả event để kiểm tra realtime (có thể bật bằng VITE_SOCKET_DEBUG=true)
const SOCKET_DEBUG = import.meta.env.VITE_SOCKET_DEBUG === 'true';
if (SOCKET_DEBUG) {
  socket.onAny((event, ...args) => {
    console.log(`[Socket Event] -> ${event}`, args);
  });
}

export default socket;
