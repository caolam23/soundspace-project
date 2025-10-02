// server/src/server.js 
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const connectDB = require('./config/db');
const createApp = require('./app');
const Room = require('./models/room.js');
const User = require('./models/User');

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

// 5. Cấu hình Socket.IO (thêm pingInterval, pingTimeout)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingInterval: 10000, // Gửi ping mỗi 10 giây
  pingTimeout: 5000,   // Nếu sau 5 giây không trả lời -> disconnect (PHẢI NHỎ HƠN pingInterval)
});

// 6. Map lưu userId -> Set(socketId)
const userSockets = new Map();

// 7. Socket.IO logic
io.on('connection', (socket) => {
  console.log(`🔌 User Connected: ${socket.id}`);

  // --- Register user ---
  socket.on('register-user', async (userId) => {
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    console.log("🔥 userSockets Map:", [...userSockets.entries()]);
    
    try {
      await User.findByIdAndUpdate(userId, { 
        status: 'online',
        lastActiveAt: Date.now()
      });

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

  // --- Logout ---
  socket.on('user-logout', async (userId) => {
    try {
      // Xóa toàn bộ socketId của user này
      userSockets.delete(userId);

      await User.findByIdAndUpdate(userId, { 
        status: 'offline',
        lastActiveAt: Date.now()
      });
      
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

  // --- Join room ---
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

  // --- Guest request to join ---
  socket.on('request-to-join', async ({ roomId, requester }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      const hostSockets = userSockets.get(room.owner.toString());
      if (hostSockets) {
        hostSockets.forEach(socketId => {
          io.to(socketId).emit('new-join-request', { requester, roomId });
        });
      }

      console.log(`📩 Yêu cầu tham gia từ ${requester.username} gửi tới host ${room.owner}`);
    } catch (err) {
      console.error("❌ Error on request-to-join:", err);
    }
  });

  // --- Host respond ---
  socket.on('respond-to-request', async ({ requesterId, roomId, accepted }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      const reqIdStr = String(requesterId);
      const requesterSockets = userSockets.get(reqIdStr);

      if (accepted) {
        if (!room.members.some(m => m.toString() === reqIdStr)) {
          room.members.push(reqIdStr);
          await room.save();
        }

        const populatedRoom = await Room.findById(roomId)
          .populate('owner', 'username avatar')
          .populate('members', 'username avatar');

        if (requesterSockets) {
          requesterSockets.forEach(socketId => {
            io.to(socketId).emit('join-request-accepted', { roomId, room: populatedRoom });
          });
        }

        const owner = populatedRoom.owner;
        const members = populatedRoom.members.filter(m => m._id.toString() !== owner._id.toString());
        io.to(roomId).emit('update-members', [owner, ...members]);

        const newMember = populatedRoom.members.find(m => m._id.toString() === reqIdStr);
        socket.to(roomId).emit('user-joined-notification', {
          username: newMember?.username || "Người dùng mới"
        });

      } else {
        if (requesterSockets) {
          requesterSockets.forEach(socketId => {
            io.to(socketId).emit('join-request-denied', { message: 'Yêu cầu tham gia đã bị từ chối.' });
          });
        }
      }
    } catch (err) {
      console.error("❌ Error on respond-to-request:", err);
    }
  });

  // --- Leave room ---
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

  // --- Disconnect ---
  socket.on('disconnect', async () => {
    for (let [userId, sockets] of userSockets.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        console.log(`❌ Socket ${socket.id} removed from user ${userId}`);

        if (sockets.size === 0) {
          userSockets.delete(userId);
          try {
            await User.findByIdAndUpdate(userId, { 
              status: 'offline',
              lastActiveAt: Date.now()
            });

            io.emit('user-status-changed', { 
              userId, 
              status: 'offline',
              lastActiveAt: Date.now()
            });

            console.log(`❌ User ${userId} disconnected - status set to OFFLINE`);
          } catch (error) {
            console.error('❌ Error updating disconnect status:', error);
          }
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
