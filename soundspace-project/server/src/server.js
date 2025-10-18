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
const registerChatHandlers = require('./controllers/chatHandler');
const registerReportHandlers = require('./controllers/reportHandler');
const { restoreScheduledCleanups } = require('./services/cleanupService');
const Visit = require('./models/Visit');


// Connect to Database
connectDB();

// Initialize Express App
const app = createApp();

// Basic Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));
app.use(express.json());


// 4. Create HTTP server from Express
const server = http.createServer(app);

// 5. Configure Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
});

// Maps for tracking users and approvals
const userSockets = new Map();
const joinApprovals = new Map();
const APPROVAL_TTL = 2 * 60 * 1000;

// Helper to normalize IDs to strings
const toId = (v) => (v === undefined || v === null) ? null : String(v);

// Socket middleware to verify token from handshake
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

// Auto-cleanup for joinApprovals to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [k, ts] of joinApprovals.entries()) {
        if (now - ts > APPROVAL_TTL) joinApprovals.delete(k);
    }
}, APPROVAL_TTL);

// ============================================
// MAIN SOCKET.IO CONNECTION LOGIC (LOGIC CŨ ĐƯỢC GIỮ NGUYÊN)
// ============================================
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (userId: ${socket.userId || 'anonymous'})`);

    if (socket.userId) {
        const uid = socket.userId;
        if (!userSockets.has(uid)) userSockets.set(uid, new Set());
        const set = userSockets.get(uid);
        const wasOffline = set.size === 0;
        set.add(socket.id);
        socket.userId = uid;
        socket.join(uid);
        console.log(`[JOIN-PRIVATE] Socket ${socket.id} joined private room for user ${uid}`);

        if (wasOffline) {
            User.findByIdAndUpdate(uid, { status: 'online', lastActiveAt: Date.now() })
                .catch(err => console.error('Update online error:', err));
            io.emit('user-status-changed', { userId: uid, status: 'online', lastActiveAt: Date.now() });
        }
    }

    // --- Register user (client may still emit userId) ---
    // <<< PHẦN NÀY ĐÃ ĐƯỢC DỌN SẠCH, KHÔNG CÒN GHI NHẬN VISIT Ở ĐÂY NỮA >>>
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

    // --- Logout ---
    socket.on('user-logout', async (userIdIncoming) => {
        try {
            const uid = toId(userIdIncoming || socket.userId);
            if (!uid) return;

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

            try {
                const uid = socket.userId || null;
                if (uid && !room.members.some(m => String(m._id || m) === String(uid)) && room.status !== 'ended') {
                    await Room.findByIdAndUpdate(roomId, {
                        $push: { members: uid },
                        $inc: { 'statistics.totalJoins': 1 }
                    });
                    try {
                        const fresh = await Room.findById(roomId).select('statistics members').lean();
                        if (fresh) {
                            const peak = Math.max(fresh.statistics?.peakMembers || 0, (fresh.members || []).length);
                            await Room.findByIdAndUpdate(roomId, { 'statistics.peakMembers': peak });
                        }
                    } catch (e) {
                        console.warn('[JOIN-ROOM] Could not update peakMembers:', e.message);
                    }
                }
            } catch (e) {
                console.warn('[JOIN-ROOM] Auto-join stats update failed:', e.message);
            }

            const currentPlaybackState = {
                playlist: room.playlist,
                currentTrackIndex: room.currentTrackIndex,
                isPlaying: room.isPlaying,
                playbackStartTime: room.playbackStartTime,
            };
            socket.emit('playback-state-changed', currentPlaybackState);
            console.log(`[JOIN-ROOM] Sent initial playback state to socket ${socket.id}`);

            const ownerId = String(room.owner._id);
            const ownerMember = room.members.find(m => String(m._id) === ownerId);
            const otherMembers = room.members.filter(m => String(m._id) !== ownerId);
            const sortedMembers = ownerMember ? [ownerMember, ...otherMembers] : room.members;
            
            io.to(roomId).emit('update-members', sortedMembers);
                try {
                    const roomObj = await Room.findById(roomId).select('statistics members').lean();
                    if (roomObj) {
                        const payload = {
                            roomId: String(roomId),
                            membersCount: roomObj.members?.length || 0,
                            totalJoins: roomObj.statistics?.totalJoins || 0,
                            peakMembers: roomObj.statistics?.peakMembers || 0,
                        };
                        io.emit('room-members-changed', payload);
                        console.log('[LEAVE-ROOM] Emitted room-members-changed', payload);
                    }
                } catch (e) {
                    console.warn('[LEAVE-ROOM] Could not emit room-members-changed:', e.message);
                }
            console.log(`[JOIN-ROOM] Emitted update-members with ${sortedMembers.length} members`);
            try {
                const roomObj = await Room.findById(roomId).select('statistics members').lean();
                if (roomObj) {
                    const payload = {
                        roomId: String(roomId),
                        membersCount: roomObj.members?.length || 0,
                        totalJoins: roomObj.statistics?.totalJoins || 0,
                        peakMembers: roomObj.statistics?.peakMembers || 0,
                    };
                    io.emit('room-members-changed', payload);
                    console.log('[JOIN-ROOM] Emitted room-members-changed', payload);
                }
            } catch (e) {
                console.warn('[JOIN-ROOM] Could not emit room-members-changed:', e.message);
            }
            try {
                const roomObj = await Room.findById(roomId).select('statistics members').lean();
                if (roomObj) {
                    const payload = {
                        roomId: String(roomId),
                        membersCount: sortedMembers.length,
                        totalJoins: roomObj.statistics?.totalJoins || 0,
                        peakMembers: roomObj.statistics?.peakMembers || sortedMembers.length,
                    };
                    io.emit('room-members-changed', payload);
                    console.log('[JOIN-ROOM] Emitted room-members-changed', payload);
                }
            } catch (e) {
                console.warn('[JOIN-ROOM] Could not emit room-members-changed:', e.message);
            }
            
        } catch (err) {
            console.error('[JOIN-ROOM] Error:', err);
        }
    });

    registerChatHandlers(io, socket);
    registerReportHandlers(io, socket);

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

                const ownerId = String(populatedRoom.owner._id);
                const ownerMember = populatedRoom.members.find(m => String(m._id) === ownerId);
                const otherMembers = populatedRoom.members.filter(m => String(m._id) !== ownerId);
                const sortedMembers = ownerMember ? [ownerMember, ...otherMembers] : populatedRoom.members;

                io.to(roomId).emit('update-members', sortedMembers);

                try {
                    const roomDoc = await Room.findById(roomId);
                    if (roomDoc && roomDoc.status !== 'ended') {
                        roomDoc.statistics = roomDoc.statistics || {};
                        const reqIdStr = toId(requesterId);
                        if (reqIdStr && !roomDoc.uniqueJoiners.some(u => String(u) === reqIdStr)) {
                            roomDoc.uniqueJoiners.push(reqIdStr);
                            roomDoc.statistics.totalJoins = (roomDoc.statistics.totalJoins || 0) + 1;
                        }
                        roomDoc.statistics.peakMembers = Math.max(roomDoc.statistics.peakMembers || 0, sortedMembers.length);
                        await roomDoc.save();

                        const payload = {
                            roomId: String(roomId),
                            membersCount: sortedMembers.length,
                            totalJoins: roomDoc.statistics.totalJoins,
                            peakMembers: roomDoc.statistics.peakMembers,
                        };
                        io.emit('room-members-changed', payload);
                        console.log('[RESPOND] Emitted room-members-changed', payload);
                    }
                } catch (e) {
                    console.warn('[RESPOND] Could not update stats or emit room-members-changed:', e.message);
                }

                try {
                    const roomDoc = await Room.findById(roomId);
                    if (roomDoc && roomDoc.status !== 'ended') {
                        roomDoc.statistics = roomDoc.statistics || {};
                        const reqIdStr = toId(requester._id);
                        if (reqIdStr && !roomDoc.uniqueJoiners.some(u => String(u) === reqIdStr)) {
                            roomDoc.uniqueJoiners.push(reqIdStr);
                            roomDoc.statistics.totalJoins = (roomDoc.statistics.totalJoins || 0) + 1;
                        }
                        roomDoc.statistics.peakMembers = Math.max(roomDoc.statistics.peakMembers || 0, sortedMembers.length);
                        await roomDoc.save();

                        const payload = {
                            roomId: String(roomId),
                            membersCount: sortedMembers.length,
                            totalJoins: roomDoc.statistics.totalJoins,
                            peakMembers: roomDoc.statistics.peakMembers,
                        };
                        io.emit('room-members-changed', payload);
                        console.log('[REQUEST-JOIN] Emitted room-members-changed', payload);
                    }
                } catch (e) {
                    console.warn('[REQUEST-JOIN] Could not update stats or emit room-members-changed:', e.message);
                }

                try {
                    const joinedMember = sortedMembers.find(m => String(m._id) === toId(requester._id));
                    if (joinedMember) {
                        io.to(roomId).emit('user-joined-notification', { 
                            username: joinedMember.username, 
                            avatar: joinedMember.avatar 
                        });
                    }
                } catch (e) {
                    console.warn('[REQUEST-JOIN] Could not emit user-joined-notification:', e.message);
                }
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

    socket.on('respond-to-request', async ({ requesterId, roomId, accepted }) => {
        try {
            console.log(`[RESPOND] Host responding: roomId=${roomId}, requesterId=${requesterId}, accepted=${accepted}`);
            
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

                try {
                    const joinedMember = sortedMembers.find(m => String(m._id) === reqIdStr);
                    if (joinedMember) {
                        io.to(roomId).emit('user-joined-notification', { 
                            username: joinedMember.username, 
                            avatar: joinedMember.avatar 
                        });
                    }
                } catch (e) {
                    console.warn('[RESPOND] Could not emit user-joined-notification:', e.message);
                }
            } else {
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
        }
    });

    socket.on('leave-room', async ({ roomId, userId }) => {
        socket.leave(roomId);
        try {
            const leavingUser = await User.findById(userId).select('username avatar');

            await Room.findByIdAndUpdate(roomId, { $pull: { members: userId } });

            if (leavingUser) {
                io.to(roomId).emit('user-left-notification', {
                    userId: userId,
                    username: leavingUser.username,
                    avatar: leavingUser.avatar
                });
                console.log(`[LEAVE-ROOM] Emitted user-left-notification for ${leavingUser.username}`);
            }

            const populatedRoom = await Room.findById(roomId)
                .populate('owner', 'username avatar')
                .populate('members', 'username avatar');
            if (populatedRoom) {
                const ownerId = String(populatedRoom.owner._id);
                const ownerMember = populatedRoom.members.find(m => String(m._id) === ownerId);
                const otherMembers = populatedRoom.members.filter(m => String(m._id) !== ownerId);
                const sortedMembers = ownerMember ? [ownerMember, ...otherMembers] : populatedRoom.members;
                
                io.to(roomId).emit('update-members', sortedMembers);
                try {
                    const roomObj = await Room.findById(roomId).select('statistics members').lean();
                    if (roomObj) {
                        const payload = {
                            roomId: String(roomId),
                            membersCount: sortedMembers.length,
                            totalJoins: roomObj.statistics?.totalJoins || 0,
                            peakMembers: roomObj.statistics?.peakMembers || sortedMembers.length,
                        };
                        io.emit('room-members-changed', payload);
                        console.log('[LEAVE-ROOM] Emitted room-members-changed', payload);
                    }
                } catch (e) {
                    console.warn('[LEAVE-ROOM] Could not emit room-members-changed:', e.message);
                }
            }
        } catch (err) {
            console.error('[LEAVE-ROOM] Error:', err);
        }
    });

    socket.on('music-control', async ({ roomId, action }) => {
        try {
            const room = await Room.findById(roomId);
            if (!room) {
                console.warn(`[MUSIC_CONTROL] Room not found: ${roomId}`);
                return;
            }

            if (socket.userId !== room.owner.toString()) {
                console.warn(`[MUSIC_CONTROL] Unauthorized user tried to control music in room ${roomId}`);
                return;
            }

            const oldStatus = room.status; 
            let updatedState = {};

            switch (action.type) {
                case 'PLAY':
                case 'SKIP_NEXT':
                case 'SKIP_PREVIOUS': {
                    const isPlayAction = action.type === 'PLAY';
                    let trackIndexToPlay = room.currentTrackIndex;

                    if (isPlayAction) {
                        trackIndexToPlay = action.payload?.trackIndex ?? (room.currentTrackIndex === -1 ? 0 : room.currentTrackIndex);
                    } else if (action.type === 'SKIP_NEXT') {
                        if (!room.playlist.length) return;
                        trackIndexToPlay = (room.currentTrackIndex + 1) % room.playlist.length;
                    } else { // SKIP_PREVIOUS
                        if (!room.playlist.length) return;
                        trackIndexToPlay = (room.currentTrackIndex - 1 + room.playlist.length) % room.playlist.length;
                    }

                    if (trackIndexToPlay < 0 || trackIndexToPlay >= room.playlist.length) {
                        console.warn(`[MUSIC_CONTROL] Invalid track index: ${trackIndexToPlay}`);
                        return;
                    }

                    updatedState = {
                        isPlaying: true,
                        currentTrackIndex: trackIndexToPlay,
                        playbackStartTime: new Date()
                    };

                    if (oldStatus === "waiting") {
                        updatedState.status = "live";
                        updatedState.startedAt = new Date();
                        console.log(`🎵 [MUSIC_CONTROL] Room ${roomId} status changing: waiting → live`);
                    }
                    break;
                }

                case 'PAUSE': {
                    updatedState = { isPlaying: false };
                    break;
                }
                
                case 'SEEK_TO': {
                    if (typeof action.payload?.time === 'number') {
                        const seekTimeInSeconds = action.payload.time;
                        updatedState = {
                            playbackStartTime: new Date(Date.now() - seekTimeInSeconds * 1000)
                        };
                    } else {
                        return;
                    }
                    break;
                }

                default:
                    return;
            }

            Object.assign(room, updatedState);
            await room.save();
            
            const newStatus = room.status;
            if (oldStatus !== newStatus) {
                const payload = {
                    roomId: room._id.toString(),
                    status: newStatus,
                    startedAt: room.startedAt
                };
                io.emit('room-status-changed', payload);
                console.log(`📢 [MUSIC_CONTROL] ✅ Broadcasted room-status-changed globally:`, JSON.stringify(payload));
            }

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

    socket.on('sync-time', ({ roomId, currentTime }) => {
        socket.to(roomId).emit('time-updated', { currentTime });
    });

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

}); // END of io.on('connection')

// Attach io and userSockets to the app for use in other controllers
app.set('io', io);
app.set('userSockets', userSockets);
app.use('/api/stream', require('./routes/stream.routes'));

// Start the server
const PORT = process.env.PORT || 8800;
const startServer = async () => {
    try {
        await connectDB();
        
        await restoreScheduledCleanups(); 
        
        server.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to start the server:", error);
        process.exit(1);
    }
};

// Bắt đầu toàn bộ quá trình
startServer();

module.exports = { io, userSockets };