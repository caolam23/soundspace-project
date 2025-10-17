// server/src/controllers/chatHandler.js
const chatService = require('../services/chatService');
const Room = require('../models/room');

const registerChatHandlers = (io, socket) => {
  
  const handleSendMessage = async (payload) => {
    try {
      const { roomId, text, isGhostMode } = payload;
      const userId = socket.userId;

      let savedMsg;
      
      if (isGhostMode) {
        // ✅ Ghost mode: Tạo tin nhắn tạm thời, KHÔNG lưu vào DB
        savedMsg = {
          _id: `ghost-${Date.now()}-${Math.random()}`,
          userId: userId,
          username: '👻 Admin',
          avatar: '/admin-ghost-avatar.png',
          text: text,
          meta: {},
          createdAt: new Date(),
          isGhost: true
        };
        console.log(`👻 [CHAT-GHOST] Admin sent ghost message to room ${roomId}`);
      } else {
        // ✅ Normal mode: Lưu tin nhắn vào DB
        savedMsg = await chatService.createMessage(roomId, userId, text);
      }

      if (savedMsg) {
        const roomIdStr = String(roomId);
        
        const room = await Room.findById(roomIdStr).select('owner').lean();
        const isHost = room && room.owner.equals(savedMsg.userId);

        const clientMessage = {
          id: savedMsg._id,
          userId: savedMsg.userId,
          username: savedMsg.username,
          avatar: savedMsg.avatar,
          text: savedMsg.text,
          meta: savedMsg.meta,
          createdAt: savedMsg.createdAt,
          isHost: isHost,
          isGhost: savedMsg.isGhost || false
        };
        
        console.log(`[CHAT] Broadcasting message ${clientMessage.id} to room ${roomIdStr} (isHost: ${isHost}, isGhost: ${clientMessage.isGhost})`);

        io.to(roomIdStr).emit('new-chat-message', clientMessage);
      }
    } catch (err) {
      console.error('[CHAT] send-chat-message error:', err.message);
      socket.emit('chat-error', { message: 'Không thể gửi tin nhắn.', error: err.message });
    }
  };

  socket.on('send-chat-message', handleSendMessage);
};

module.exports = registerChatHandlers;