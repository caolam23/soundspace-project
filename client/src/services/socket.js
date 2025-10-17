import { io } from "socket.io-client";

// ✅ Lấy từ .env, fallback về backend thật sự
const SOCKET_URL =
  import.meta.env.VITE_SERVER_URL?.replace(/\/$/, "") || "http://localhost:8800";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
});

socket.onAny((event, ...args) => {
  console.log(`[Socket Event] -> ${event}`, args);
});

// 🔧 DEBUG: Expose socket to window for debugging
if (typeof window !== 'undefined') {
  window._debugSocket = socket;
  console.log('🔌 Socket exposed to window._debugSocket for debugging');
}

export default socket;
