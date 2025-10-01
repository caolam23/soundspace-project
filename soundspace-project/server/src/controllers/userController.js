const User = require('../models/User');
// [PUT] /api/users/:id/toggle-lock
exports.toggleLockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User không tồn tại' });

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Không thể khóa tài khoản admin' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    // Emit socket event if user is online
    if (req.io && req.io.userSockets) {
      const socketId = req.io.userSockets.get(user._id.toString());
      if (socketId) {
        req.io.to(socketId).emit('user-blocked', {
          blocked: user.isBlocked,
          message: user.isBlocked
            ? 'Tài khoản của bạn đã bị chặn. Nếu có thắc mắc vui lòng liên hệ với quản trị viên.'
            : 'Tài khoản của bạn đã được mở khóa.'
        });
      }
    }

    res.json({ message: `User đã được ${user.isBlocked ? 'khóa' : 'mở khóa'} thành công` });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
// [GET] /api/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// [DELETE] /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User không tồn tại' });

    res.json({ message: 'Xóa user thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
