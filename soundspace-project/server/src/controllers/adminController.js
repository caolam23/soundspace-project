// controllers/adminController.js
exports.getDashboard = (req, res) => {
  // req.user được auth middleware gắn
  res.json({
    msg: `Chào mừng Admin ${req.user.username || req.user.email}`,
    userId: req.user._id,
    role: req.user.role
  });
};

// ==========================
// Reports management for Admin
// ==========================
const Report = require('../models/Report');
const Room = require('../models/room');
const User = require('../models/User');
const { scheduleRoomCleanup } = require('../services/cleanupService');

exports.listReports = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(50, parseInt(req.query.limit || '20'));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    const [items, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('room', 'name owner').populate('reporter', 'username'),
      Report.countDocuments(filter)
    ]);

    res.json({ success: true, data: items, pagination: { page, limit, totalPages: Math.ceil(total / limit), total } });
  } catch (err) {
    console.error('❌ listReports error:', err);
    res.status(500).json({ success: false, msg: 'Lỗi server', error: err.message });
  }
};

exports.ignoreReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, msg: 'Không tìm thấy báo cáo.' });
    report.status = 'dismissed';
    await report.save();
    return res.json({ success: true, msg: 'Báo cáo đã được bỏ qua.' });
  } catch (err) {
    console.error('❌ ignoreReport error:', err);
    res.status(500).json({ success: false, msg: 'Lỗi server', error: err.message });
  }
};

exports.warnOwner = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('room', 'owner');
    if (!report) return res.status(404).json({ success: false, msg: 'Không tìm thấy báo cáo.' });
    const ownerId = report.room?.owner;
    if (!ownerId) return res.status(400).json({ success: false, msg: 'Không có chủ phòng.' });

    // increase owner's reportCount and optionally set status
    const updatedUser = await User.findByIdAndUpdate(ownerId, { $inc: { reportCount: 1 }, $set: { status: 'reported' } }, { new: true });
    // mark report reviewed
    report.status = 'reviewed';
    await report.save();

    // Try to notify owner via socket if online
    try {
      const userSockets = req.app.get('userSockets');
      if (userSockets && userSockets.has(String(ownerId))) {
        const sockets = userSockets.get(String(ownerId));
        const io = req.app.get('io');
        sockets.forEach((sockId) => {
    try { io.to(sockId).emit('user-warned', { msg: 'Tài khoản của bạn đã bị cảnh báo. Vui lòng không tái phạm quá nhiều lần.', reportId: report._id }); } catch (e) {}
        });
      }
    } catch (e) {
      console.warn('[warnOwner] Could not emit socket to owner:', e.message);
    }

    return res.json({ success: true, msg: 'Đã cảnh báo chủ phòng.', user: updatedUser });
  } catch (err) {
    console.error('❌ warnOwner error:', err);
    res.status(500).json({ success: false, msg: 'Lỗi server', error: err.message });
  }
};

exports.banRoom = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('room');
    if (!report) return res.status(404).json({ success: false, msg: 'Không tìm thấy báo cáo.' });
    const room = await Room.findById(report.room._id);
    if (!room) return res.status(404).json({ success: false, msg: 'Không tìm thấy phòng.' });
    room.isBanned = true;
    room.banReason = req.body.reason || 'Bị cấm bởi admin vì báo cáo';

    // If room is live, end session gracefully
    const io = req.app.get('io');
    if (room.status === 'live') {
      room.status = 'ended';
      room.endedAt = new Date();
      // notify current room members that room has been banned
      try {
        const roomSockets = await io.in(String(room._id)).fetchSockets();
        roomSockets.forEach((s) => {
          try { s.emit('room-ended', { message: 'Phòng đã bị cấm bởi quản trị viên.', reason: 'admin-banned' }); } catch (e) {}
        });
        // disconnect sockets in the room to force them out
        roomSockets.forEach((s) => {
          try { s.leave(String(room._id)); s.disconnect(true); } catch (e) {}
        });
      } catch (e) {
        console.warn('[banRoom] Error notifying/disconnecting room sockets:', e.message);
      }
    }

    await room.save();

    report.status = 'reviewed';
    await report.save();

    // If admin requests immediate report deletion when banning, remove them now
    if (req.body && req.body.removeReports === true) {
      try {
        await Report.deleteMany({ room: room._id });
        console.log(`[ADMIN] Deleted reports for room ${room._id} by admin action`);
      } catch (e) {
        console.warn(`[ADMIN] Failed to delete reports for room ${room._id}:`, e.message);
      }
    }

    // schedule cleanup of room resources
    try { scheduleRoomCleanup(String(room._id)); } catch (e) { console.warn('[banRoom] scheduleRoomCleanup failed:', e.message); }

    // emit global notification about banned room
    try { if (io) io.emit('room-banned', { roomId: room._id.toString(), reason: room.banReason }); } catch (e) {}

    return res.json({ success: true, msg: 'Phòng đã bị cấm.' });
  } catch (err) {
    console.error('❌ banRoom error:', err);
    res.status(500).json({ success: false, msg: 'Lỗi server', error: err.message });
  }
};
