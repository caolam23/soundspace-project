// client/src/services/socket.js
import { io } from "socket.io-client";

// Dùng thẳng URL backend
const SOCKET_URL = "http://localhost:8800";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

export default socket;