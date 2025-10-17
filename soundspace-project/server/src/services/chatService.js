// server/src/services/chatService.js

const Room = require('../models/room');
const User = require('../models/User');

/**
 * ============================================================
 * 📩 createMessage()
 * ------------------------------------------------------------
 * Tạo và lưu một tin nhắn mới vào phòng chat.
 * Xử lý tất cả logic về dữ liệu, không liên quan đến Socket.
 * ============================================================
 * @param {string} roomId  - ID của phòng.
 * @param {string} userId  - ID của người gửi (có thể null nếu là khách).
 * @param {string} text    - Nội dung tin nhắn.
 * @param {object} meta    - (Tuỳ chọn) Dữ liệu phụ: emoji, reply, file,...
 * @returns {Promise<object|null>} Tin nhắn đã lưu (với _id, createdAt) hoặc null nếu lỗi.
 */
const createMessage = async (roomId, userId, text, meta = {}) => {
  if (!text || !text.trim()) {
    throw new Error('Nội dung tin nhắn không được để trống.');
  }

  // 🔍 Tìm phòng
  const room = await Room.findById(roomId);
  if (!room) {
    throw new Error('Không tìm thấy phòng.');
  }

  // 🧩 Chuẩn bị dữ liệu tin nhắn
  const messagePayload = {
    userId: userId || null,
    username: 'Anonymous',
    avatar: '/default-avatar.png', // Avatar mặc định
    text: text.trim(),
    meta: meta || {},
    status: 'visible', // ✅ Hỗ trợ xóa mềm (soft delete)
  };

  // 👤 Nếu có userId, lấy thông tin từ bảng User
  if (userId) {
    const user = await User.findById(userId).select('username avatar');
    if (user) {
      messagePayload.username = user.username;
      messagePayload.avatar = user.avatar || '/default-avatar.png';
    }
  }

  // 💾 Lưu tin nhắn vào mảng chat của phòng
  room.chat.push(messagePayload);

  // 📈 Cập nhật thống kê phòng
  room.statistics.totalMessages = (room.statistics.totalMessages || 0) + 1;

  // Ghi vào database
  await room.save();

  // 🆕 Trả về tin nhắn mới nhất (vừa thêm)
  const savedMessage = room.chat[room.chat.length - 1];
  return savedMessage;
};

/**
 * ============================================================
 * 🗑️ deleteMessage()
 * ------------------------------------------------------------
 * Xóa mềm (soft delete) tin nhắn trong phòng chat.
 * Chỉ thay đổi trạng thái `status` => 'deleted'
 * ============================================================
 * @param {string} roomId
 * @param {string} messageId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
const deleteMessage = async (roomId, messageId, userId) => {
  const room = await Room.findById(roomId);
  if (!room) throw new Error('Không tìm thấy phòng.');

  const message = room.chat.id(messageId);
  if (!message) throw new Error('Không tìm thấy tin nhắn.');

  // ✅ Kiểm tra quyền: chỉ người gửi hoặc chủ phòng được xóa
  if (String(message.userId) !== String(userId) && String(room.owner) !== String(userId)) {
    throw new Error('Bạn không có quyền xóa tin nhắn này.');
  }

  // Soft delete
  message.status = 'deleted';
  await room.save();

  return message;
};

/**
 * ============================================================
 * ✏️ editMessage()
 * ------------------------------------------------------------
 * Cho phép người gửi sửa nội dung tin nhắn (nếu cần).
 * ============================================================
 * @param {string} roomId
 * @param {string} messageId
 * @param {string} newText
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
const editMessage = async (roomId, messageId, newText, userId) => {
  if (!newText || !newText.trim()) {
    throw new Error('Nội dung sửa không được để trống.');
  }

  const room = await Room.findById(roomId);
  if (!room) throw new Error('Không tìm thấy phòng.');

  const message = room.chat.id(messageId);
  if (!message) throw new Error('Không tìm thấy tin nhắn.');

  if (String(message.userId) !== String(userId)) {
    throw new Error('Bạn chỉ có thể sửa tin nhắn của chính mình.');
  }

  message.text = newText.trim();
  await room.save();

  return message;
};

module.exports = {
  createMessage,
  deleteMessage,
  editMessage,
};
