// server/src/controllers/chatHandler.js
const chatService = require('../services/chatService');
const Room = require('../models/room');
const User = require('../models/User'); // ✅ Kiểm tra mute người dùng

const registerChatHandlers = (io, socket) => {
  /**
   * ======================================================
   * 📨 Xử lý sự kiện gửi tin nhắn từ client
   * ======================================================
   */
  const handleSendMessage = async (payload) => {
    try {
      const { roomId, text, meta, isGhostMode } = payload;
      const userId = socket.userId;

      if (!userId) {
        socket.emit('chat-error', { message: 'Bạn cần đăng nhập để gửi tin nhắn.' });
        return;
      }

      // =====================================================
      // 🔒 KIỂM TRA NGƯỜI DÙNG CÓ BỊ MUTE (CẤM CHAT) HAY KHÔNG
      // =====================================================
      const user = await User.findById(userId).select('muteExpiresAt').lean();
      if (user && user.muteExpiresAt && user.muteExpiresAt > new Date()) {
        const timeLeft = Math.ceil((user.muteExpiresAt.getTime() - Date.now()) / 60000);
        socket.emit('user-muted', {
          message: `⛔ Bạn đang bị giới hạn chat. Vui lòng thử lại sau ${timeLeft} phút.`,
          timeLeft,
        });
        return; // Dừng lại, không gửi tin nhắn
      }

      let savedMsg;

      // =====================================================
      // 👻 GHOST MODE: ADMIN GỬI TIN NHẮN KHÔNG LƯU VÀO DB
      // =====================================================
      if (isGhostMode) {
        savedMsg = {
          _id: `ghost-${Date.now()}-${Math.random()}`,
          userId: userId,
          username: '👻 Admin',
          avatar: '/admin-ghost-avatar.png',
          text,
          meta: meta || {},
          createdAt: new Date(),
          isGhost: true,
        };
        console.log(`👻 [CHAT-GHOST] Admin sent ghost message to room ${roomId}`);
      } else {
        // =====================================================
        // 💬 NORMAL MODE: LƯU TIN NHẮN VÀO DATABASE
        // =====================================================
        savedMsg = await chatService.createMessage(roomId, userId, text, meta);
        if (!savedMsg) {
          socket.emit('chat-error', { message: 'Không thể lưu tin nhắn.' });
          return;
        }
      }

      const roomIdStr = String(roomId);

      // =====================================================
      // 🧩 KIỂM TRA NGƯỜI GỬI CÓ PHẢI CHỦ PHÒNG (HOST) KHÔNG
      // =====================================================
      const room = await Room.findById(roomIdStr).select('owner').lean();
      const isHost = room && room.owner && room.owner.equals(savedMsg.userId);

      // =====================================================
      // 📦 CHUẨN BỊ DỮ LIỆU TIN NHẮN GỬI RA CLIENT
      // =====================================================
      const clientMessage = {
        id: savedMsg._id,
        userId: savedMsg.userId,
        username: savedMsg.username,
        avatar: savedMsg.avatar,
        text: savedMsg.text,
        meta: savedMsg.meta,
        createdAt: savedMsg.createdAt,
        isHost,
        isGhost: savedMsg.isGhost || false,
      };

      console.log(
        `[CHAT] Message sent by ${clientMessage.username} (Host: ${isHost}, Ghost: ${clientMessage.isGhost}) in room ${roomIdStr}`
      );

      // =====================================================
      // 🚀 PHÁT SỰ KIỆN TIN NHẮN MỚI CHO CẢ PHÒNG
      // =====================================================
      io.to(roomIdStr).emit('new-chat-message', clientMessage);
    } catch (err) {
      console.error('[CHAT] send-chat-message error:', err.message);
      socket.emit('chat-error', { message: 'Không thể gửi tin nhắn.', error: err.message });
    }
  };

  // ======================================================
  // Đăng ký sự kiện socket
  // ======================================================
  socket.on('send-chat-message', handleSendMessage);
};

module.exports = registerChatHandlers;
