// server/src/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const connectDB = require('./config/db');
const createApp = require('./app');
const Room = require('./models/room.js');
const User = require('./models/User'); // 👈 User model để quản lý online/offline

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
  socket.on('register-user', async (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`✅ User ${userId} registered with socket ${socket.id}`);
    
    // Cập nhật trạng thái online trong DB
    try {
      await User.findByIdAndUpdate(userId, { 
        status: 'online',
        lastActiveAt: Date.now()
      });

      // Broadcast cho admin
      io.emit('user-status-changed', { 
        userId, 
        status: 'online',
        lastActiveAt: Date.now()
      });
      console.log(`📢 Broadcasted: User ${userId} is now ONLINE`);
    } catch (error) {
      console.error('❌ Error updating user status:', error);
    }
  });

  // Khi user logout (manual logout)
  socket.on('user-logout', async (userId) => {
    try {
      await User.findByIdAndUpdate(userId, { 
        status: 'offline',
        lastActiveAt: Date.now()
      });
      
      userSockets.delete(userId);
      
      io.emit('user-status-changed', { 
        userId, 
        status: 'offline',
        lastActiveAt: Date.now()
      });
      
      console.log(`👋 User ${userId} logged out - status set to OFFLINE`);
    } catch (error) {
      console.error('❌ Error updating logout status:', error);
    }
  });

  // Khi user vào phòng
  socket.on('join-room', async (roomId) => {
    try {
      socket.join(roomId);
      console.log(`👤 Socket ${socket.id} joined room ${roomId}`);

      const room = await Room.findById(roomId)
        .populate('owner', 'username avatar')
        .populate('members', 'username avatar');

      if (room) {
        const owner = room.owner;
        const members = room.members.filter(m => m._id.toString() !== owner._id.toString());
        const membersToEmit = [owner, ...members];

        io.to(roomId).emit('update-members', membersToEmit);
        console.log(`📡 update-members sent for room ${roomId} (count: ${membersToEmit.length})`);
      }
    } catch (err) {
      console.error('❌ Error on join-room:', err);
    }
  });

  // Khi guest gửi yêu cầu tham gia (manual)
  socket.on('request-to-join', async ({ roomId, requester }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      const hostSocketId = userSockets.get(room.owner.toString());
      if (hostSocketId) {
        io.to(hostSocketId).emit('new-join-request', { requester, roomId });
      }
      io.to(roomId).emit("new-join-request", { requester, roomId });

      console.log(`📩 Yêu cầu tham gia từ ${requester.username} gửi tới host ${room.owner}`);
    } catch (err) {
      console.error("❌ Error on request-to-join:", err);
    }
  });

  // Host phản hồi yêu cầu
  socket.on('respond-to-request', async ({ requesterId, roomId, accepted }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      const reqIdStr = String(requesterId);
      const requesterSocketId = userSockets.get(reqIdStr);

      if (accepted) {
        if (!room.members.some(m => m.toString() === reqIdStr)) {
          room.members.push(reqIdStr);
          await room.save();
        }

        const populatedRoom = await Room.findById(roomId)
          .populate('owner', 'username avatar')
          .populate('members', 'username avatar');

        if (requesterSocketId) {
          io.to(requesterSocketId).emit('join-request-accepted', { roomId, room: populatedRoom });
        }

        const owner = populatedRoom.owner;
        const members = populatedRoom.members.filter(m => m._id.toString() !== owner._id.toString());
        io.to(roomId).emit('update-members', [owner, ...members]);

        const newMember = populatedRoom.members.find(m => m._id.toString() === reqIdStr);
        socket.to(roomId).emit('user-joined-notification', {
          username: newMember?.username || "Người dùng mới"
        });

      } else {
        if (requesterSocketId) {
          io.to(requesterSocketId).emit('join-request-denied', { message: 'Yêu cầu tham gia đã bị từ chối.' });
        }
      }
    } catch (err) {
      console.error("❌ Error on respond-to-request:", err);
    }
  });

  // Khi user rời phòng
  socket.on('leave-room', async ({ roomId, userId }) => {
    socket.leave(roomId);
    try {
      await Room.findByIdAndUpdate(roomId, { $pull: { members: userId } });
      const populatedRoom = await Room.findById(roomId)
        .populate('owner', 'username avatar')
        .populate('members', 'username avatar');

      if (populatedRoom) {
        const owner = populatedRoom.owner;
        const members = populatedRoom.members.filter(m => m._id.toString() !== owner._id.toString());
        io.to(roomId).emit('update-members', [owner, ...members]);
      }
    } catch (err) {
      console.error("❌ Error on leave-room:", err);
    }
  });

  // Ngắt kết nối (đóng tab, mất mạng, v.v.)
  socket.on('disconnect', async () => {
    for (let [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        try {
          await User.findByIdAndUpdate(userId, { 
            status: 'offline',
            lastActiveAt: Date.now()
          });

          userSockets.delete(userId);
          
          io.emit('user-status-changed', { 
            userId, 
            status: 'offline',
            lastActiveAt: Date.now()
          });

          console.log(`❌ User ${userId} disconnected - status set to OFFLINE`);
        } catch (error) {
          console.error('❌ Error updating disconnect status:', error);
        }
        break;
      }
    }
  });
});

// 8. Gắn io và userSockets vào app
app.set('io', io);
app.set('userSockets', userSockets);

// 9. Khởi động server
const PORT = process.env.PORT || 8800;
server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});

module.exports = { io, userSockets };
