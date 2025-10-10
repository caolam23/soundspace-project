// server/src/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const createApp = require('./app');
const Room = require('./models/room');
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

// 5. Cấu hình Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// ============================
// Map lưu userId (string) -> Set(socketId)
// ============================
const userSockets = new Map();

// ============================
// Map lưu join approvals với TTL
// key: `${roomId}-${userId}` -> timestamp
// ============================
const joinApprovals = new Map();
const APPROVAL_TTL = 2 * 60 * 1000; // 2 phút

// ============================
// Helper: normalize id -> string
// ============================
const toId = (v) => (v === undefined || v === null) ? null : String(v);

// ============================
// Optional: Socket middleware để verify token từ handshake
// Client should connect with: io(url, { auth: { token } })
// ============================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      return next();
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const uid = payload.id || payload._id || payload.userId;
    if (uid) {
      socket.userId = toId(uid);
    }
    return next();
  } catch (err) {
    console.warn('Socket auth verify failed:', err.message);
    return next();
  }
});

// ============================
// Auto-cleanup joinApprovals (prevent memory leak)
// ============================
setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of joinApprovals.entries()) {
    if (now - ts > APPROVAL_TTL) joinApprovals.delete(k);
  }
}, APPROVAL_TTL);

// ============================
// Socket logic
// ============================
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (userId: ${socket.userId || 'anonymous'})`);

  // If middleware provided socket.userId, auto-register this socket
  if (socket.userId) {
    const uid = socket.userId;
    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    const set = userSockets.get(uid);
    const wasOffline = set.size === 0;
    set.add(socket.id);
    socket.userId = uid;

    if (wasOffline) {
      User.findByIdAndUpdate(uid, { status: 'online', lastActiveAt: Date.now() })
        .catch(err => console.error('Update online error:', err));
      io.emit('user-status-changed', { userId: uid, status: 'online', lastActiveAt: Date.now() });
    }
  }

  // --- Register user (client may still emit userId) ---
  socket.on('register-user', async (userIdIncoming) => {
    try {
      const uid = toId(userIdIncoming || socket.userId);
      if (!uid) return;

      if (!userSockets.has(uid)) userSockets.set(uid, new Set());
      const sockets = userSockets.get(uid);
      const wasOffline = sockets.size === 0;
      sockets.add(socket.id);
      socket.userId = uid;

      if (wasOffline) {
        await User.findByIdAndUpdate(uid, { status: 'online', lastActiveAt: Date.now() });
        io.emit('user-status-changed', { userId: uid, status: 'online', lastActiveAt: Date.now() });
      }

    } catch (err) {
      console.error('Error in register-user:', err);
    }
  });

<<<<<<< Updated upstream
  // --- Logout (only remove THIS socket; if no more sockets -> offline) ---
  socket.on('user-logout', async (userIdIncoming) => {
    try {
      const uid = toId(userIdIncoming || socket.userId);
      if (!uid) return;
=======
            const sockets = userSockets.get(uid);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    userSockets.delete(uid);
                    await User.findByIdAndUpdate(uid, { status: 'offline', lastActiveAt: Date.now() });
                    io.emit('user-status-changed', { userId: uid, status: 'offline', lastActiveAt: Date.now() });
                } else {
                    userSockets.set(uid, sockets);
                }
            }
            try { socket.disconnect(true); } catch (e) {}
        } catch (err) {
            console.error('Error in user-logout:', err);
        }
    });

    // --- Join room ---
    socket.on('join-room', async (roomId) => {
        try {
            socket.join(roomId);
            console.log(`[JOIN-ROOM] Socket ${socket.id} joined room ${roomId}`);

            const room = await Room.findById(roomId)
                .populate('owner', 'username avatar')
                .populate('members', 'username avatar');

            if (!room) {
                console.log(`[JOIN-ROOM] Room not found: ${roomId}`);
                return;
            }

            // --- LOGIC ĐỒNG BỘ 1: GỬI TRẠNG THÁI BAN ĐẦU ---
            const currentPlaybackState = {
                playlist: room.playlist,
                currentTrackIndex: room.currentTrackIndex,
                isPlaying: room.isPlaying,
                playbackStartTime: room.playbackStartTime,
            };
            // Gửi trạng thái này CHỈ tới socket vừa kết nối
            socket.emit('playback-state-changed', currentPlaybackState);
            console.log(`[JOIN-ROOM] Sent initial playback state to socket ${socket.id}`);
            // --- KẾT THÚC LOGIC 1 ---

            // Cập nhật danh sách thành viên cho cả phòng
            const ownerId = String(room.owner._id);
            const ownerMember = room.members.find(m => String(m._id) === ownerId);
            const otherMembers = room.members.filter(m => String(m._id) !== ownerId);
            const sortedMembers = ownerMember ? [ownerMember, ...otherMembers] : room.members;
            
            io.to(roomId).emit('update-members', sortedMembers);
            console.log(`[JOIN-ROOM] Emitted update-members with ${sortedMembers.length} members`);
            
        } catch (err) {
            console.error('[JOIN-ROOM] Error:', err);
        }
    });

    // --- Request to join ---
    socket.on('request-to-join', async ({ roomId, requester }) => {
        try {
            console.log(`[REQUEST-JOIN] User ${requester._id} requesting to join room ${roomId}`);
            const room = await Room.findById(roomId);
            if (!room) {
                console.log(`[REQUEST-JOIN] Room not found: ${roomId}`);
                return;
            }

            const key = `${roomId}-${toId(requester._id)}`;
            const now = Date.now();

            if (joinApprovals.has(key) && (now - joinApprovals.get(key) < APPROVAL_TTL)) {
                console.log(`[REQUEST-JOIN] Auto-approve for user ${requester._id}`);
                if (!room.members.some(m => m.toString() === requester._id)) {
                    room.members.push(requester._id);
                    await room.save();
                }

                const populatedRoom = await Room.findById(roomId)
                    .populate('owner', 'username avatar')
                    .populate('members', 'username avatar');

                const requesterSockets = userSockets.get(toId(requester._id));
                if (requesterSockets) {
                    requesterSockets.forEach(sid => io.to(sid).emit('join-request-accepted', { roomId, room: populatedRoom }));
                }

                io.to(roomId).emit('update-members', populatedRoom.members);
                return;
            }

            const hostSockets = userSockets.get(toId(room.owner));
            if (hostSockets && hostSockets.size > 0) {
                const firstSocketId = hostSockets.values().next().value;
                io.to(firstSocketId).emit('new-join-request', { requester, roomId });
            } else {
                console.log(`[REQUEST-JOIN] Host sockets not found for user ${room.owner}`);
            }
        } catch (err) {
            console.error('[REQUEST-JOIN] Error:', err);
        }
    });

    // --- Host respond to request ---
    socket.on('respond-to-request', async ({ requesterId, roomId, accepted }) => {
        try {
            let room = await Room.findById(roomId);
            if (!room) return;

            const reqIdStr = toId(requesterId);
            const requesterSockets = userSockets.get(reqIdStr);

            if (accepted) {
                if (!room.members.some(m => String(m) === reqIdStr)) {
                    room.members.push(reqIdStr);
                    await room.save();
                }
                joinApprovals.set(`${roomId}-${reqIdStr}`, Date.now());

                const populatedRoom = await Room.findById(roomId)
                    .populate('owner', 'username avatar')
                    .populate('members', 'username avatar');
                
                const ownerId = String(populatedRoom.owner._id);
                const ownerMember = populatedRoom.members.find(m => String(m._id) === ownerId);
                const otherMembers = populatedRoom.members.filter(m => String(m._id) !== ownerId);
                const sortedMembers = ownerMember ? [ownerMember, ...otherMembers] : populatedRoom.members;

                if (requesterSockets) {
                    requesterSockets.forEach(sid => {
                        io.to(sid).emit('join-request-accepted', { roomId, room: populatedRoom });
                    });
                }
                io.to(roomId).emit('update-members', sortedMembers);
            } else {
                if (requesterSockets) {
                    requesterSockets.forEach(sid => {
                        io.to(sid).emit('join-request-denied', { message: 'Yêu cầu tham gia đã bị từ chối.' });
                    });
                }
            }
        } catch (err) {
            console.error('[RESPOND] Error:', err);
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
                io.to(roomId).emit('update-members', populatedRoom.members);
            }
        } catch (err) {
            console.error('[LEAVE-ROOM] Error:', err);
        }
    });

    // --- Music Control Events ---
    // ====================== MUSIC CONTROL SOCKET ======================
    socket.on('music-control', async ({ roomId, action }) => {
    try {
        // 1️⃣ Kiểm tra và lấy thông tin phòng
        const room = await Room.findById(roomId);
        if (!room) {
            console.warn(`[MUSIC_CONTROL] Room not found: ${roomId}`);
            return;
        }

        // Chỉ cho phép chủ phòng điều khiển nhạc
        if (socket.userId !== room.owner.toString()) {
            console.warn(`[MUSIC_CONTROL] Unauthorized user tried to control music in room ${roomId}`);
            return;
        }

        let updatedState = {};

        // 2️⃣ Xử lý từng loại hành động điều khiển
        switch (action.type) {

            // ▶️ PHÁT NHẠC
            case 'PLAY': {
                const trackIndexToPlay =
                    action.payload?.trackIndex ??
                    (room.currentTrackIndex === -1 ? 0 : room.currentTrackIndex);

                if (trackIndexToPlay < 0 || trackIndexToPlay >= room.playlist.length) {
                    console.warn(`[MUSIC_CONTROL] Invalid track index: ${trackIndexToPlay}`);
                    return;
                }

                updatedState = {
                    isPlaying: true,
                    currentTrackIndex: trackIndexToPlay,
                    playbackStartTime: new Date()
                };
                break;
            }

            // ⏸️ TẠM DỪNG NHẠC
            case 'PAUSE': {
                updatedState = { isPlaying: false };
                break;
            }

            // ⏭️ CHUYỂN BÀI TIẾP
            case 'SKIP_NEXT': {
                if (!room.playlist.length) return;
                const nextIndex = (room.currentTrackIndex + 1) % room.playlist.length;
                updatedState = {
                    currentTrackIndex: nextIndex,
                    isPlaying: true,
                    playbackStartTime: new Date()
                };
                break;
            }

            // ⏮️ LÙI VỀ BÀI TRƯỚC
            case 'SKIP_PREVIOUS': {
                if (!room.playlist.length) return;
                // Nếu đang ở bài đầu, lùi về bài cuối
                const prevIndex = (room.currentTrackIndex - 1 + room.playlist.length) % room.playlist.length;
                updatedState = {
                    currentTrackIndex: prevIndex,
                    isPlaying: true,
                    playbackStartTime: new Date()
                };
                break;
            }

            // ⏩ TUA NHẠC (SEEK_TO)
            case 'SEEK_TO': {
                if (typeof action.payload?.time === 'number') {
                    const seekTimeInSeconds = action.payload.time;
                    const newPlaybackStartTime = new Date(Date.now() - seekTimeInSeconds * 1000);

                    updatedState = {
                        playbackStartTime: newPlaybackStartTime
                    };

                    console.log(`[MUSIC_CONTROL] Seek to ${seekTimeInSeconds}s in room ${roomId}`);
                } else {
                    console.warn(`[MUSIC_CONTROL] Invalid SEEK_TO payload`);
                    return;
                }
                break;
            }

            default:
                console.warn(`[MUSIC_CONTROL] Unknown action type: ${action.type}`);
                return;
        }

        // 3️⃣ Cập nhật trạng thái phòng
        Object.assign(room, updatedState);
        await room.save();

        // 4️⃣ Gửi trạng thái mới cho toàn bộ client trong phòng
        const playbackState = {
            playlist: room.playlist,
            currentTrackIndex: room.currentTrackIndex,
            isPlaying: room.isPlaying,
            playbackStartTime: room.playbackStartTime,
        };

        io.to(roomId).emit('playback-state-changed', playbackState);

    } catch (error) {
        console.error(`[MUSIC_CONTROL] Error:`, error);
    }
});



    // --- LOGIC ĐỒNG BỘ 2: TRUNG CHUYỂN THÔNG TIN TỪ HOST ---
    socket.on('sync-time', ({ roomId, currentTime }) => {
        // Gửi tới tất cả client trong phòng TRỪ người gửi (là host)
        socket.to(roomId).emit('time-updated', { currentTime });
    });
    // --- KẾT THÚC LOGIC 2 ---

    // --- Disconnect ---
    socket.on('disconnect', async () => {
        console.log(`Socket disconnected: ${socket.id}`);
        const uid = socket.userId || null;
        if (!uid) return;

        const sockets = userSockets.get(uid);
        if (!sockets) return;
>>>>>>> Stashed changes

      const sockets = userSockets.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(uid);
          await User.findByIdAndUpdate(uid, { status: 'offline', lastActiveAt: Date.now() });
          io.emit('user-status-changed', { userId: uid, status: 'offline', lastActiveAt: Date.now() });
        } else {
          userSockets.set(uid, sockets);
        }
      }

      try { socket.disconnect(true); } catch(e) {}

    } catch (err) {
      console.error('Error in user-logout:', err);
    }
  });

  // --- Join room ---
// server.js - socket.on('join-room')
// server.js - Thay thế socket.on('join-room') handler

socket.on('join-room', async (roomId) => {
  try {
    socket.join(roomId);
    console.log(`[JOIN-ROOM] Socket ${socket.id} joined room ${roomId}`);

    const room = await Room.findById(roomId)
      .populate('owner', 'username avatar')
      .populate('members', 'username avatar');

    if (!room) {
      console.log(`[JOIN-ROOM] Room not found: ${roomId}`);
      return;
    }

    // ✅ CHỈ emit danh sách hiện tại, KHÔNG tự động thêm user
    // User phải join qua API trước (public/private) hoặc được approve (manual)
    
    if (socket.userId) {
      const isMember = room.members.some(m => String(m._id) === socket.userId);
      const isOwner = String(room.owner._id) === socket.userId;
      
      console.log(`[JOIN-ROOM] User ${socket.userId} - isMember: ${isMember}, isOwner: ${isOwner}`);
      
      // ❌ BỎ logic tự động thêm user vào members
      // Owner phải được thêm vào members khi tạo phòng (đã có trong createRoom)
      // User khác phải join qua API hoặc được approve
      
      if (!isMember && !isOwner) {
        console.log(`[JOIN-ROOM] User ${socket.userId} not authorized yet`);
        // Không làm gì, đợi API hoặc approval
      }
    }

    // ✅ Luôn đảm bảo owner đứng đầu
    const ownerId = String(room.owner._id);
    const ownerMember = room.members.find(m => String(m._id) === ownerId);
    const otherMembers = room.members.filter(m => String(m._id) !== ownerId);
    const sortedMembers = ownerMember ? [ownerMember, ...otherMembers] : room.members;
    
    // ✅ Emit danh sách members hiện tại (từ DB)
    io.to(roomId).emit('update-members', sortedMembers);
    console.log(`[JOIN-ROOM] Emitted update-members with ${sortedMembers.length} members`);
    
  } catch (err) {
    console.error('[JOIN-ROOM] Error:', err);
  }
});

  // --- Request to join (with auto-approve window) ---
  socket.on('request-to-join', async ({ roomId, requester }) => {
    try {
      console.log(`[REQUEST-JOIN] User ${requester._id} requesting to join room ${roomId}`);
      
      const room = await Room.findById(roomId);
      if (!room) {
        console.log(`[REQUEST-JOIN] Room not found: ${roomId}`);
        return;
      }

      const key = `${roomId}-${toId(requester._id)}`;
      const now = Date.now();

      // auto-approve window
      if (joinApprovals.has(key) && (now - joinApprovals.get(key) < APPROVAL_TTL)) {
        console.log(`[REQUEST-JOIN] Auto-approve for user ${requester._id}`);
        
        if (!room.members.some(m => m.toString() === requester._id)) {
          room.members.push(requester._id);
          await room.save();
          console.log(`[REQUEST-JOIN] Added user to members, total: ${room.members.length}`);
        }

        const populatedRoom = await Room.findById(roomId)
          .populate('owner', 'username avatar')
          .populate('members', 'username avatar');

        console.log(`[REQUEST-JOIN] Members after populate:`, populatedRoom.members.map(m => m.username));

        const requesterSockets = userSockets.get(toId(requester._id));
        if (requesterSockets) {
          requesterSockets.forEach(sid => io.to(sid).emit('join-request-accepted', { roomId, room: populatedRoom }));
        }

        // Emit members array trực tiếp
        io.to(roomId).emit('update-members', populatedRoom.members);
        console.log(`[REQUEST-JOIN] Emitted update-members with ${populatedRoom.members.length} members`);
        return;
      }

      // send request to host sockets
      const hostSockets = userSockets.get(toId(room.owner));
      if (hostSockets && hostSockets.size > 0) {
        // If the host has multiple connected sockets (multiple tabs/devices),
        // only notify one of them to avoid duplicate prompts.
        const firstSocketId = hostSockets.values().next().value;
        io.to(firstSocketId).emit('new-join-request', { requester, roomId });
      } else {
        console.log(`[REQUEST-JOIN] Host sockets not found for user ${room.owner}`);
      }
    } catch (err) {
      console.error('[REQUEST-JOIN] Error:', err);
    }
  });

  // --- Host respond ---
  socket.on('respond-to-request', async ({ requesterId, roomId, accepted }) => {
  try {
    console.log(`[RESPOND] Host responding: roomId=${roomId}, requesterId=${requesterId}, accepted=${accepted}`);
    
    let room = await Room.findById(roomId);
    if (!room) {
      console.error('[RESPOND] Room not found');
      return;
    }

    const reqIdStr = toId(requesterId);
    const requesterSockets = userSockets.get(reqIdStr);
    console.log(`[RESPOND] Requester has ${requesterSockets ? requesterSockets.size : 0} active sockets`);

    if (accepted) {
      const isMember = room.members.some(m => String(m) === reqIdStr);
      console.log(`[RESPOND] Is already member: ${isMember}`);
      
      if (!isMember) {
        console.log(`[RESPOND] Adding user ${reqIdStr} to room members`);
        room.members.push(reqIdStr);
        room = await room.save();
        console.log(`[RESPOND] Saved! Total members in DB:`, room.members.length);
      }

      const key = `${roomId}-${reqIdStr}`;
      joinApprovals.set(key, Date.now());
      console.log(`[RESPOND] Stored approval for key: ${key}`);

      const populatedRoom = await Room.findById(roomId)
        .populate('owner', 'username avatar')
        .populate('members', 'username avatar');

      console.log(`[RESPOND] ===== POPULATED ROOM DATA =====`);
      console.log(`[RESPOND] Members count:`, populatedRoom.members.length);
      
      // 🔥 Đảm bảo owner đứng đầu
      const ownerId = String(populatedRoom.owner._id);
      const ownerMember = populatedRoom.members.find(m => String(m._id) === ownerId);
      const otherMembers = populatedRoom.members.filter(m => String(m._id) !== ownerId);
      const sortedMembers = ownerMember ? [ownerMember, ...otherMembers] : populatedRoom.members;
      
      console.log(`[RESPOND] Sorted members:`, sortedMembers.map(m => `${m.username} (${String(m._id) === ownerId ? 'HOST' : 'member'})`));
      console.log(`[RESPOND] ==================================`);

      // Gửi về requester
      if (requesterSockets) {
        requesterSockets.forEach(sid => {
          io.to(sid).emit('join-request-accepted', { 
            roomId, 
            room: populatedRoom 
          });
          console.log(`[RESPOND] Sent join-request-accepted to socket ${sid}`);
        });
      }

      // 🔥 Emit danh sách đã sort (owner đầu tiên)
      console.log(`[RESPOND] About to emit update-members to room ${roomId}`);
      io.to(roomId).emit('update-members', sortedMembers);
      console.log(`[RESPOND] Emitted update-members with ${sortedMembers.length} members (owner first)`);
      
    } else {
      console.log(`[RESPOND] Request denied for user ${reqIdStr}`);
      if (requesterSockets) {
        requesterSockets.forEach(sid => {
          io.to(sid).emit('join-request-denied', { 
            message: 'Yêu cầu tham gia đã bị từ chối.' 
          });
        });
      }
    }
  } catch (err) {
    console.error('[RESPOND] Error:', err);
    console.error('[RESPOND] Stack:', err.stack);
  }
});

  // --- Leave room ---
  socket.on('leave-room', async ({ roomId, userId }) => {
    socket.leave(roomId);
    console.log(`[LEAVE-ROOM] User ${userId} leaving room ${roomId}`);
    
    try {
      await Room.findByIdAndUpdate(roomId, { $pull: { members: userId } });
      console.log(`[LEAVE-ROOM] Removed user from members`);
      
      const populatedRoom = await Room.findById(roomId)
        .populate('owner', 'username avatar')
        .populate('members', 'username avatar');

      if (populatedRoom) {
        console.log(`[LEAVE-ROOM] Remaining members:`, populatedRoom.members.map(m => m.username));
        console.log(`[LEAVE-ROOM] Members count:`, populatedRoom.members.length);
        
        // Emit members array trực tiếp
        io.to(roomId).emit('update-members', populatedRoom.members);
        console.log(`[LEAVE-ROOM] Emitted update-members with ${populatedRoom.members.length} members`);
      }
    } catch (err) {
      console.error('[LEAVE-ROOM] Error:', err);
    }
  });

  // --- Disconnect ---
  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const uid = socket.userId || null;
    if (!uid) return;

    const sockets = userSockets.get(uid);
    if (!sockets) return;

    sockets.delete(socket.id);
    if (sockets.size === 0) {
      userSockets.delete(uid);
      try {
        await User.findByIdAndUpdate(uid, { status: 'offline', lastActiveAt: Date.now() });
        io.emit('user-status-changed', { userId: uid, status: 'offline', lastActiveAt: Date.now() });
      } catch (error) {
        console.error('Error updating disconnect status:', error);
      }
    } else {
      userSockets.set(uid, sockets);
    }
  });

});

// Gắn io và userSockets vào app để dùng ở controller khác (nếu cần)
app.set('io', io);
app.set('userSockets', userSockets);

// Khởi động server
const PORT = process.env.PORT || 8800;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

module.exports = { io, userSockets };