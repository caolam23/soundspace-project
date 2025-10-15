// server/src/services/chatService.js

const Room = require('../models/room');
const User = require('../models/User');

/**
 * Tạo và lưu một tin nhắn mới vào phòng chat.
 * Hàm này chỉ tập trung vào việc xử lý dữ liệu, không quan tâm đến socket.
 * @param {string} roomId - ID của phòng.
 * @param {string} userId - ID của người gửi (có thể null nếu là khách).
 * @param {string} text - Nội dung tin nhắn.
 * @returns {Promise<object|null>} Tin nhắn đã được lưu (với _id, createdAt), hoặc null nếu lỗi.
 */
const createMessage = async (roomId, userId, text) => {
  if (!text || !text.trim()) {
    throw new Error('Message text cannot be empty.');
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new Error('Room not found.');
  }

  // 1. Build message object cơ bản
  const messagePayload = {
    userId: userId || null,
    username: 'Anonymous',
    avatar: '/default-avatar.png', // Avatar mặc định
    text: text.trim(),
    meta: {}, // Có thể mở rộng để xử lý reply...
  };

  // 2. Nếu có userId, lấy thông tin user từ DB
  if (userId) {
    const user = await User.findById(userId).select('username avatar');
    if (user) {
      messagePayload.username = user.username;
      messagePayload.avatar = user.avatar || '/default-avatar.png';
    }
  }

  // 3. Push tin nhắn vào mảng chat của room và cập nhật thống kê
  room.chat.push(messagePayload);
  room.statistics.totalMessages = (room.statistics.totalMessages || 0) + 1;
  await room.save();

  // 4. Trả về tin nhắn vừa được tạo (luôn nằm ở cuối mảng)
  const savedMessage = room.chat[room.chat.length - 1];
  return savedMessage;
};

// Trong tương lai, bạn có thể thêm các hàm khác vào đây
// const deleteMessage = async (roomId, messageId, userId) => { ... };
// const editMessage = async (roomId, messageId, newText, userId) => { ... };

module.exports = {
  createMessage,
};