import { io } from "socket.io-client";

// ✅ Vite dùng import.meta.env, không phải process.env
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8800";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

// Debug tất cả event để kiểm tra realtime (có thể tắt nếu không cần)
socket.onAny((event, ...args) => {
  console.log(`[Socket Event] -> ${event}`, args);
});

export default socket;
