/**
 * ✅ FEATURE: Audience Interaction Socket Handlers
 * Real-time broadcasting of like and gift animations
 * Implementation Date: April 2026
 */

const AudienceInteraction = require('../../models/AudienceInteraction');

module.exports = (io, socket) => {
  console.log(`✅ AudienceInteractionHandler initialized for socket: ${socket.id}`);
  
  // ==============================================
  // SEND LIKE (Real-time broadcast)
  // ==============================================
  socket.on('audience:send-like', async (data) => {
    try {
      const { roomId, userId, username, avatar } = data;

      if (!roomId || !userId) {
        return socket.emit('error', { message: 'Missing required fields' });
      }

      console.log(`📤 [LIKE] Received from ${username}, broadcasting to room: podcast:${roomId}`);

      // Save to database
      const like = new AudienceInteraction({
        room: roomId,
        user: userId,
        type: 'like'
      });
      await like.save();

      // Broadcast to all users in the podcast room (use correct room name)
      const roomName = `podcast:${roomId}`;
      const roomSockets = io.sockets.adapter.rooms.get(roomName);
      console.log(`📡 Broadcasting like to room: ${roomName} (${roomSockets?.size || 0} users connected)`);
      
      io.to(roomName).emit('audience:like-received', {
        animationId: like.animationId,
        user: {
          _id: userId,
          username,
          avatar
        },
        timestamp: new Date(),
        type: 'like'
      });

      console.log(`💭 [LIKE] User ${username} sent like in room ${roomId}`);
    } catch (err) {
      console.error('❌ Error sending like:', err);
      socket.emit('error', { message: 'Failed to send like' });
    }
  });

  // ==============================================
  // SEND GIFT (Real-time broadcast)
  // ==============================================
  socket.on('audience:send-gift', async (data) => {
    try {
      const { roomId, userId, username, avatar, giftType } = data;

      if (!roomId || !userId || !giftType) {
        return socket.emit('error', { message: 'Missing required fields' });
      }

      const giftValues = {
        flower: 10,
        rose: 25,
        diamond: 100,
        crown: 500
      };

      if (!giftValues[giftType]) {
        return socket.emit('error', { message: 'Invalid gift type' });
      }

      // Save to database
      const gift = new AudienceInteraction({
        room: roomId,
        user: userId,
        type: 'gift',
        giftType,
        giftValue: giftValues[giftType]
      });
      await gift.save();

      // Broadcast to all users in the podcast room (use correct room name)
      const roomName = `podcast:${roomId}`;
      io.to(roomName).emit('audience:gift-received', {
        animationId: gift.animationId,
        user: {
          _id: userId,
          username,
          avatar
        },
        giftType,
        giftValue: giftValues[giftType],
        timestamp: new Date(),
        type: 'gift'
      });

      console.log(`🎁 [GIFT] User ${username} sent ${giftType} in room ${roomId}`);
    } catch (err) {
      console.error('❌ Error sending gift:', err);
      socket.emit('error', { message: 'Failed to send gift' });
    }
  });
};
