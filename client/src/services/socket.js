// src/services/socket.js
import { io } from 'socket.io-client';

// Địa chỉ server backend của bạn
const SERVER_URL = "http://localhost:8800";

const socket = io(SERVER_URL, {
  autoConnect: false // Chỉ kết nối khi cần
});

export default socket;