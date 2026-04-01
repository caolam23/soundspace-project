/**
 * User Socket Event Handlers
 * 
 * Handles all user-related events:
 * - register-user: Register a user when they connect
 * - user-logout: Mark user as offline and disconnect socket
 * - disconnect: Cleanup when socket disconnects
 * 
 * Updates user status (online/offline) in database and broadcasts status changes
 */

const User = require('../../models/User');
const { userSockets, toId } = require('../store');

const registerUserHandlers = (io, socket) => {
  /**
   * Handle user registration (can be called after socket connection)
   * Adds socket to user's socket set and marks user as online
   */
  socket.on('register-user', async (userIdIncoming) => {
    try {
      const uid = toId(userIdIncoming || socket.userId);
      if (!uid) return;

      if (!userSockets.has(uid)) {
        userSockets.set(uid, new Set());
      }
      const sockets = userSockets.get(uid);
      const wasOffline = sockets.size === 0;
      sockets.add(socket.id);
      socket.userId = uid;

      if (wasOffline) {
        await User.findByIdAndUpdate(uid, {
          status: 'online',
          lastActiveAt: Date.now(),
        });
        io.emit('user-status-changed', {
          userId: uid,
          status: 'online',
          lastActiveAt: Date.now(),
        });
      }
    } catch (err) {
      console.error('Error in register-user:', err);
    }
  });

  /**
   * Handle user logout
   * Removes socket from user's socket set and marks user as offline
   */
  socket.on('user-logout', async (userIdIncoming) => {
    try {
      const uid = toId(userIdIncoming || socket.userId);
      if (!uid) return;

      const sockets = userSockets.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(uid);
          await User.findByIdAndUpdate(uid, {
            status: 'offline',
            lastActiveAt: Date.now(),
          });
          io.emit('user-status-changed', {
            userId: uid,
            status: 'offline',
            lastActiveAt: Date.now(),
          });
        } else {
          userSockets.set(uid, sockets);
        }
      }
      try {
        socket.disconnect(true);
      } catch (e) {
        // Ignore disconnect errors
      }
    } catch (err) {
      console.error('Error in user-logout:', err);
    }
  });

  /**
   * Handle socket disconnect
   * Cleanup: remove socket from user's socket set and mark offline if no other sockets
   */
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
        await User.findByIdAndUpdate(uid, {
          status: 'offline',
          lastActiveAt: Date.now(),
        });
        io.emit('user-status-changed', {
          userId: uid,
          status: 'offline',
          lastActiveAt: Date.now(),
        });
      } catch (error) {
        console.error('Error updating disconnect status:', error);
      }
    } else {
      userSockets.set(uid, sockets);
    }
  });
};

module.exports = registerUserHandlers;
