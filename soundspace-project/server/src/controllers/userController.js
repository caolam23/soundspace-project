// server/src/controllers/userController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');

// [POST] /api/users/create - Tạo user mới bởi admin
exports.createUser = async (req, res) => {
  try {
    // Đảm bảo req.body tồn tại
    if (!req.body) {
      return res.status(400).json({ message: 'Request body trống' });
    }

    const { username, email, password, role } = req.body;

    // Validation cơ bản
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email và password là bắt buộc' });
    }

    // Kiểm tra user đã tồn tại
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email
          ? 'Email đã được sử dụng'
          : 'Username đã được sử dụng'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'user',
      status: 'offline',
      currentRole: role || 'user',
      isBlocked: false
    });

    await newUser.save();

    res.status(201).json({
      message: 'Tạo user thành công',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// [GET] /api/users - Lấy tất cả user
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// [DELETE] /api/users/:id - Xóa user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User không tồn tại' });

    res.json({ message: 'Xóa user thành công' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// [PUT] /api/users/:id/toggle-lock - Khóa/mở khóa user
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

    // Emit socket event nếu req.io tồn tại
    if (req.io && req.io.userSockets) {
      const socketId = req.io.userSockets.get(user._id.toString());
      if (socketId) {
        req.io.to(socketId).emit('user-blocked', {
          blocked: user.isBlocked,
          message: user.isBlocked
            ? 'Tài khoản của bạn đã bị chặn. Nếu có thắc mắc vui lòng liên hệ quản trị viên.'
            : 'Tài khoản của bạn đã được mở khóa.'
        });
      }
    }

    res.json({ message: `User đã được ${user.isBlocked ? 'khóa' : 'mở khóa'} thành công` });

  } catch (err) {
    console.error('Error toggling lock:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
