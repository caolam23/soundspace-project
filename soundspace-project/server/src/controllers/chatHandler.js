// server/src/controllers/chatHandler.js

const chatService = require('../services/chatService');
const Room = require('../models/room'); // <<< THÊM DÒNG NÀY ĐỂ TRUY VẤN PHÒNG

const registerChatHandlers = (io, socket) => {
  
  const handleSendMessage = async (payload) => {
    try {
      const { roomId, text } = payload;
      const userId = socket.userId;

      // 1. Gọi Service để lưu tin nhắn vào DB
      const savedMsg = await chatService.createMessage(roomId, userId, text);

      if (savedMsg) {
        const roomIdStr = String(roomId);
        
        // =============================================================
        // ▼▼▼ THAY ĐỔI: KIỂM TRA CHỦ PHÒNG TẠI ĐÂY ▼▼▼
        // =============================================================
        
        // 2. Lấy thông tin phòng để biết ai là chủ phòng (chỉ lấy trường owner để tối ưu)
        const room = await Room.findById(roomIdStr).select('owner').lean();
        
        // 3. Kiểm tra xem userId của người gửi có trùng với owner của phòng không
        const isHost = room && room.owner.equals(savedMsg.userId);

        // 4. Bổ sung trường `isHost` vào object tin nhắn gửi cho client
        const clientMessage = {
          id: savedMsg._id,
          userId: savedMsg.userId,
          username: savedMsg.username,
          avatar: savedMsg.avatar,
          text: savedMsg.text,
          meta: savedMsg.meta,
          createdAt: savedMsg.createdAt,
          isHost: isHost, // <<< TRƯỜNG MỚI QUAN TRỌNG
        };
        
        console.log(`[CHAT] Broadcasting message ${clientMessage.id} to room ${roomIdStr} (isHost: ${isHost})`);

        // 5. Phát sự kiện đi với dữ liệu đã được bổ sung
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