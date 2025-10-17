// server/src/controllers/reportHandler.js
const Report = require('../models/Report');
const Room = require('../models/room');
const User = require('../models/User');

// Helper: Gửi sự kiện đến tất cả các socket của admin
const emitToAdmins = (io, event, payload) => {
  io.to('admin_room').emit(event, payload);
};

module.exports = function (io, socket) {
  /**
   * ==========================================================
   * Khi admin kết nối → Tham gia phòng admin_room
   * ==========================================================
   */
  socket.on('admin-join', async () => {
    try {
      const user = await User.findById(socket.userId);
      if (user && user.role === 'admin') {
        socket.join('admin_room');
        console.log(`✅ Admin ${user.username} (socket: ${socket.id}) joined admin_room`);
      }
    } catch (e) {
      console.error("❌ Error on admin-join:", e);
    }
  });

  /**
   * ==========================================================
   * Khi người dùng báo cáo một bình luận (comment)
   * ==========================================================
   */
  socket.on('report-comment', async (data) => {
    try {
      const { roomId, commentId, reason } = data;
      const reporterId = socket.userId;

      // 🧩 Kiểm tra dữ liệu đầu vào
      if (!reporterId || !roomId || !commentId || !reason) {
        console.warn("⚠️ Thiếu dữ liệu khi report-comment:", data);
        return;
      }

      // 🔍 Kiểm tra phòng tồn tại
      const room = await Room.findById(roomId);
      if (!room) {
        console.warn(`⚠️ Không tìm thấy phòng với ID: ${roomId}`);
        return;
      }

      // 🔍 Tìm tin nhắn trong mảng chat (subdocument)
      const comment = room.chat.id(commentId);
      if (!comment) {
        console.warn(`⚠️ Không tìm thấy comment với ID: ${commentId} trong room ${roomId}`);
        return;
      }

      // 🆕 Tạo bản ghi Report mới
      const newReport = new Report({
        reporter: reporterId,
        reportedUser: comment.userId,
        roomId,
        messageId: commentId, // ✅ Dùng _id thực của comment
        messageContent: comment.text,
        reason,
      });

      // 💾 Lưu vào database
      await newReport.save();

      // 🔄 Lấy lại report có populate thông tin user
      const populatedReport = await Report.findById(newReport._id)
        .populate('reporter', 'username')
        .populate('reportedUser', 'username');

      // 📢 Gửi báo cáo mới tới tất cả admin đang online
      emitToAdmins(io, 'new-comment-report', populatedReport);

      console.log(`📨 Report created by user ${reporterId} for comment ${commentId}`);
    } catch (error) {
      console.error('❌ Error handling report-comment:', error);
    }
  });

  /**
   * ==========================================================
   * Khi admin xóa bình luận (delete comment)
   * ==========================================================
   */
  socket.on('admin-delete-comment', async ({ roomId, commentId, reportId }) => {
  try {
    const room = await Room.findById(roomId);
    if (!room) {
      console.error(`[DELETE] Room not found with ID: ${roomId}`);
      return;
    }

    // Lấy thông tin user ID của người bình luận TRƯỚC KHI XÓA
    const comment = room.chat.id(commentId);
    if (!comment) {
      console.error(`[DELETE] Comment not found with ID: ${commentId} in room ${roomId}`);
      return;
    }
    const reportedUserId = comment.userId; // Lưu lại ID người bị xóa

    // ⛔ THAY ĐỔI CHÍNH: Xóa hẳn bình luận khỏi mảng chat
    // Sử dụng .pull() để loại bỏ object con ra khỏi mảng
    room.chat.pull({ _id: commentId });

    // Lưu lại thay đổi vào database
    await room.save();

    // 📢 Gửi sự kiện tới TẤT CẢ mọi người trong phòng để họ xóa comment khỏi UI
    io.to(String(roomId)).emit('comment-deleted', { commentId });

    // 🤫 Gửi thông báo RIÊNG tới người bị xóa bình luận (nếu có userId)
    // Để làm được điều này, bạn cần đảm bảo khi user kết nối, họ đã join vào 1 room theo userId của họ
    // Ví dụ, ở file xử lý kết nối socket: socket.join(String(socket.userId));
    if (reportedUserId) {
      io.to(String(reportedUserId)).emit('action-notification', {
        type: 'warning',
        message: 'Một bình luận của bạn đã bị quản trị viên xóa.',
      });
    }

    // Cập nhật trạng thái report
    await Report.findByIdAndUpdate(reportId, { status: 'resolved-deleted' });

    console.log(`🗑️ Admin hard-deleted comment ${commentId} in room ${roomId}`);
  } catch (error) {
    console.error('❌ Error admin-delete-comment:', error);
  }
});
  /**
   * ==========================================================
   * Khi admin mute user (tạm khóa chat)
   * ==========================================================
   */
  socket.on('admin-mute-user', async ({ reportedUserId, durationMinutes, reportId }) => {
    try {
      let muteUntil;
      let userNotificationMessage;

      // 1. Xử lý logic thời gian giới hạn
      if (durationMinutes === -1) {
        // -1 có nghĩa là cấm vĩnh viễn
        muteUntil = new Date('9999-12-31T23:59:59.999Z');
        userNotificationMessage = `⛔ Bạn đã bị giới hạn chat vĩnh viễn do vi phạm quy định.`;
        console.log(`🔇 User ${reportedUserId} has been permanently muted.`);
      } else {
        // Các trường hợp khác (5 phút, 15 phút, 1 giờ, v.v.)
        const validDuration = durationMinutes || 15; // Mặc định là 15 phút nếu không có giá trị
        const durationMs = validDuration * 60 * 1000;
        muteUntil = new Date(Date.now() + durationMs);
        userNotificationMessage = `⛔ Bạn đã bị giới hạn chat trong ${validDuration} phút.`;
        console.log(`🔇 User ${reportedUserId} muted for ${validDuration} minutes.`);
      }

      // 2. Cập nhật trạng thái trong database
      await User.findByIdAndUpdate(reportedUserId, { muteExpiresAt: muteUntil });
      await Report.findByIdAndUpdate(reportId, { status: 'resolved-muted' });

      // 3. Gửi thông báo đến người dùng bị giới hạn
      if (reportedUserId) {
        // Gửi sự kiện đến phòng riêng của user đó
        io.to(String(reportedUserId)).emit('user-muted', {
          message: userNotificationMessage,
          muteExpiresAt: muteUntil.toISOString(), // Gửi thời gian hết hạn để client tự đếm ngược
        });
      }

      // 4. Gửi thông báo tới TẤT CẢ ADMIN để cập nhật danh sách real-time
      const updatedUser = await User.findById(reportedUserId).select('username muteExpiresAt avatar').lean();
      const report = await Report.findById(reportId).select('reason').lean();
      
      const detailedUserForAdmin = { 
        ...updatedUser, 
        reason: report ? report.reason : 'Không rõ lý do' 
      };

      io.to('admin_room').emit('user-mute-updated', detailedUserForAdmin);

    } catch (error) {
      console.error('❌ Error during admin-mute-user:', error);
    }
  });
};
