// server/src/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const connectDB = require('./config/db');
const createApp = require('./app');
const Room = require('./models/room.js'); // để update thành viên khi chủ phòng duyệt

// 1. Kết nối Database
connectDB();

// 2. Khởi tạo Express App
const app = createApp();

// 3. Middleware cơ bản
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

// 4. Tạo HTTP server từ Express
const server = http.createServer(app);

// 5. Cấu hình Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 6. Lưu trữ map giữa userId và socketId
const userSockets = new Map();

// 7. Lắng nghe kết nối Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 User Connected: ${socket.id}`);

  // Khi user login xong sẽ gửi userId để đăng ký
  socket.on('register-user', (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`✅ User ${userId} registered with socket ${socket.id}`);
  });

  // 1. Khi user vào trang phòng
  socket.on('join-room', async (roomId) => {
    socket.join(roomId);
    console.log(`👤 Socket ${socket.id} joined room ${roomId}`);
    
    try {
      const room = await Room.findById(roomId).populate('members', 'username avatar');
      if (room) {
        io.to(roomId).emit('update-members', room.members);
      }
    } catch (error) {
      console.error('❌ Error on join-room:', error);
    }
  });

  // 2. Khi guest gửi yêu cầu vào phòng (manual)
  socket.on('request-to-join', async ({ roomId, requester }) => {
    try {
      const room = await Room.findById(roomId);
      if (room) {
        // Lấy socket host nếu có
        const hostSocketId = userSockets.get(room.owner.toString());

        if (hostSocketId) {
          // Gửi trực tiếp cho host (case đoạn 1)
          io.to(hostSocketId).emit('new-join-request', { requester, roomId });
        }

        // Đồng thời broadcast vào room cho tất cả host đang có mặt (case đoạn 2)
        io.to(roomId).emit("new-join-request", { requester, roomId });

        console.log(`📩 Yêu cầu tham gia từ ${requester.username} gửi tới host ${room.owner}`);
      }
    } catch (err) {
      console.error("❌ Error on request-to-join:", err);
    }
  });

  // 3. Khi host phản hồi yêu cầu
  socket.on('respond-to-request', async ({ requesterId, roomId, accepted }) => {
    try {
      const room = await Room.findById(roomId);
      const requesterSocketId = userSockets.get(requesterId);

      if (!room || !requesterSocketId) return;

      if (accepted) {
        // Cập nhật DB
        if (!room.members.includes(requesterId)) {
          room.members.push(requesterId);
          await room.save();
        }

        // Báo cho requester biết họ được chấp nhận
        io.to(requesterSocketId).emit('join-request-accepted', { roomId });

        // Cập nhật danh sách thành viên cho cả phòng
        const updatedMembers = await Room.findById(roomId)
          .populate('members', 'username avatar')
          .then(r => r.members);

        io.to(roomId).emit('update-members', updatedMembers);

        // Gửi thông báo cho những người khác trong phòng
        socket.to(roomId).emit('user-joined-notification', { username: 'Một người dùng mới' });

      } else {
        // Báo cho requester biết họ bị từ chối
        io.to(requesterSocketId).emit('join-request-denied', { message: 'Yêu cầu tham gia đã bị từ chối.' });
      }
    } catch (err) {
      console.error("❌ Error on respond-to-request:", err);
    }
  });

  // 4. Khi user rời phòng
  socket.on('leave-room', async ({ roomId, userId }) => {
    socket.leave(roomId);
    try {
      await Room.findByIdAndUpdate(roomId, { $pull: { members: userId } });
      const room = await Room.findById(roomId).populate('members', 'username avatar');
      if (room) {
        io.to(roomId).emit('update-members', room.members);
      }
    } catch (err) {
      console.error("❌ Error on leave-room:", err);
    }
  });

  // Ngắt kết nối
  socket.on('disconnect', () => {
    for (let [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`❌ User ${userId} disconnected and removed from map`);
        break;
      }
    }
  });
});

// 8. Gắn io và userSockets vào app để controller có thể sử dụng
app.set('io', io);
app.set('userSockets', userSockets);

// 9. Khởi động server
const PORT = process.env.PORT || 8800;
server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});

module.exports = { io, userSockets };
