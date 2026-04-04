/**
 * Socket.io Manager (Socket Factory)
 * 
 * Centralized Socket.io initialization and configuration
 * 
 * Responsibilities:
 * 1. Create HTTP server to Socket.io Server instance
 * 2. Configure Socket.io with CORS and connection settings
 * 3. Implement JWT authentication middleware
 * 4. Handle initial connection logic (register user to private room)
 * 5. Register all event handlers (user, room, music, chat, report)
 * 6. Start auto-cleanup interval for memory leak prevention
 * 
 * Returns: io instance (Socket.io Server)
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const registerUserHandlers = require('./handlers/user.handler');
const registerRoomHandlers = require('./handlers/room.handler');
const registerMusicHandlers = require('./handlers/music.handler');
const registerChatHandlers = require('../controllers/chatHandler');
const registerReportHandlers = require('../controllers/reportHandler');
const registerPodcastHandlers = require('./handlers/podcast.handler');

const { userSockets, startCleanupInterval, toId } = require('./store');
const User = require('../models/User');

/**
 * Initialize Socket.io with config, middleware, and handlers
 * 
 * @param {http.Server} server - Express HTTP server instance
 * @returns {Server} - Socket.io Server instance
 */
const initializeSocket = (server) => {
  // Create Socket.io instance with CORS config
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // ============================================
  // JWT Authentication Middleware
  // ============================================
  // Verify JWT token from client handshake
  // If valid, extract userId and attach to socket
  // If invalid, continue (allow anonymous sockets)
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

  // ============================================
  // Connection Handler
  // ============================================
  io.on('connection', (socket) => {
    console.log(
      `Socket connected: ${socket.id} (userId: ${socket.userId || 'anonymous'})`
    );

    // Register user to private room if authenticated
    if (socket.userId) {
      const uid = socket.userId;

      if (!userSockets.has(uid)) {
        userSockets.set(uid, new Set());
      }

      const set = userSockets.get(uid);
      const wasOffline = set.size === 0;
      set.add(socket.id);
      socket.join(uid);

      console.log(
        `[JOIN-PRIVATE] Socket ${socket.id} joined private room for user ${uid}`
      );

      if (wasOffline) {
        User.findByIdAndUpdate(uid, { status: 'online', lastActiveAt: Date.now() })
          .catch(err => console.error('Update online error:', err));

        io.emit('user-status-changed', {
          userId: uid,
          status: 'online',
          lastActiveAt: Date.now(),
        });
      }
    }

    // ============================================
    // Register All Event Handlers
    // ============================================
    registerUserHandlers(io, socket);
    registerRoomHandlers(io, socket);
    registerMusicHandlers(io, socket);
    // Podcast real-time / signalling handlers (WebRTC / chunk fallback)
    registerPodcastHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerReportHandlers(io, socket);
  });

  return io;
};

module.exports = {
  initializeSocket,
  startCleanupInterval,
};
