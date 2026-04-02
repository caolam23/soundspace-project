// server/src/controllers/stageController.js
// =============================================
// Stage Management – Invite / Accept / Kick
// =============================================
const Room = require('../models/room');
const User = require('../models/User');

const toId = (v) => (v == null ? null : String(v));

// ==============================
// POST /api/rooms/:roomId/stage/invite
// Host mời member lên sân khấu
// ==============================
exports.inviteToStage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { targetUserId } = req.body;
    const hostId = toId(req.user?.id || req.user?._id);

    if (!targetUserId) return res.status(400).json({ msg: 'Thiếu targetUserId.' });

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Không tìm thấy phòng.' });
    if (toId(room.owner) !== hostId) return res.status(403).json({ msg: 'Chỉ host mới có thể mời lên sân khấu.' });

    // Check if target is already on stage
    if (room.coHosts.some(c => toId(c.userId) === toId(targetUserId))) {
      return res.status(400).json({ msg: 'Người dùng đã ở trên sân khấu.' });
    }

    // Check if target is a room member
    if (!room.members.some(m => toId(m) === toId(targetUserId))) {
      return res.status(400).json({ msg: 'Người dùng không ở trong phòng.' });
    }

    const targetUser = await User.findById(targetUserId).select('username avatar');
    if (!targetUser) return res.status(404).json({ msg: 'Người dùng không tồn tại.' });

    // Emit socket invite to target user
    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    if (io && userSockets) {
      const targetSockets = userSockets.get(toId(targetUserId));
      if (targetSockets && targetSockets.size > 0) {
        targetSockets.forEach(sid => {
          io.to(sid).emit('stage:invite', {
            roomId,
            invitedBy: { _id: hostId, username: req.user?.username, avatar: req.user?.avatar },
          });
        });
      }
    }

    return res.status(200).json({ msg: 'Đã gửi lời mời lên sân khấu.' });
  } catch (err) {
    console.error('[stageController] inviteToStage error:', err);
    return res.status(500).json({ msg: 'Lỗi server.', error: err.message });
  }
};

// ==============================
// PUT /api/rooms/:roomId/stage/accept
// Member chấp nhận lên sân khấu
// ==============================
exports.acceptStageInvite = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = toId(req.user?.id || req.user?._id);

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Không tìm thấy phòng.' });

    // Avoid duplicates
    if (room.coHosts.some(c => toId(c.userId) === userId)) {
      return res.status(200).json({ msg: 'Đã ở trên sân khấu.', coHosts: room.coHosts });
    }

    const user = await User.findById(userId).select('username avatar');
    room.coHosts.push({ userId, username: user?.username, avatar: user?.avatar, micEnabled: true, camEnabled: true });
    room.isLive = true;
    await room.save();

    // Broadcast to room
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('stage:user-joined', {
        userId,
        username: user?.username,
        avatar: user?.avatar,
        micEnabled: true,
        camEnabled: true,
      });
      io.to(roomId).emit('stage:state-update', { coHosts: room.coHosts, isLive: room.isLive });
    }

    return res.status(200).json({ msg: 'Lên sân khấu thành công!', coHosts: room.coHosts });
  } catch (err) {
    console.error('[stageController] acceptStageInvite error:', err);
    return res.status(500).json({ msg: 'Lỗi server.', error: err.message });
  }
};

// ==============================
// DELETE /api/rooms/:roomId/stage/kick/:targetUserId
// Host hoặc chính user tự rời sân khấu
// ==============================
exports.kickFromStage = async (req, res) => {
  try {
    const { roomId, targetUserId } = req.params;
    const requesterId = toId(req.user?.id || req.user?._id);

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Không tìm thấy phòng.' });

    const isHost = toId(room.owner) === requesterId;
    const isSelf = requesterId === toId(targetUserId);
    if (!isHost && !isSelf) {
      return res.status(403).json({ msg: 'Không có quyền thực hiện hành động này.' });
    }

    room.coHosts = room.coHosts.filter(c => toId(c.userId) !== toId(targetUserId));
    if (room.coHosts.length === 0) room.isLive = false;
    await room.save();

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('stage:user-left', { userId: toId(targetUserId) });
      io.to(roomId).emit('stage:state-update', { coHosts: room.coHosts, isLive: room.isLive });
    }

    return res.status(200).json({ msg: 'Đã rời sân khấu.', coHosts: room.coHosts });
  } catch (err) {
    console.error('[stageController] kickFromStage error:', err);
    return res.status(500).json({ msg: 'Lỗi server.', error: err.message });
  }
};

// ==============================
// GET /api/rooms/:roomId/stage
// Lấy trạng thái sân khấu hiện tại
// ==============================
exports.getStageState = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId).select('coHosts isLive owner');
    if (!room) return res.status(404).json({ msg: 'Không tìm thấy phòng.' });
    return res.status(200).json({ coHosts: room.coHosts, isLive: room.isLive, ownerId: room.owner });
  } catch (err) {
    console.error('[stageController] getStageState error:', err);
    return res.status(500).json({ msg: 'Lỗi server.', error: err.message });
  }
};
