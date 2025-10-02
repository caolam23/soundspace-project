// server/src/controllers/userController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { sendWelcomeEmail } = require('../services/emailService'); // 🔥 Import email service

// [POST] /api/users/create - Tạo user mới (chỉ admin hoặc user)
exports.createUser = async (req, res) => {
  try {
    if (!req.body) return res.status(400).json({ message: 'Request body trống' });

    const { username, email, password, role, sendWelcomeEmail: shouldSendEmail, requirePasswordChange } = req.body;

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
        message: existingUser.email === email ? 'Email đã được sử dụng' : 'Username đã được sử dụng'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Chỉ cho phép tạo 'admin' hoặc 'user' trong role
    const finalRole = role === 'admin' ? 'admin' : 'user';

    // Tạo user mới
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: finalRole, // Lưu vào role
      currentRole: 'user', // currentRole mặc định là 'user'
      status: 'offline',
      isBlocked: false,
      requirePasswordChange: requirePasswordChange || false
    });

    await newUser.save();

    // Gửi email chào mừng nếu được yêu cầu
    if (shouldSendEmail) {
      try {
        await sendWelcomeEmail(email, username, password); // Gửi password gốc (chưa hash)
        console.log('✅ Welcome email sent to:', email);
      } catch (emailError) {
        console.error('❌ Failed to send welcome email:', emailError);
      }
    }

    res.status(201).json({
      message: `Tạo ${finalRole} thành công`,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        requirePasswordChange: newUser.requirePasswordChange
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

// 🔥 [PUT] /api/users/change-password - Đổi password (cho user bắt buộc đổi)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // Từ middleware verifyToken

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Cần cung cấp mật khẩu hiện tại và mật khẩu mới' });
    }

    if (newPassword.length < 8 || newPassword.length > 20) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có từ 8-20 ký tự' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Cập nhật password và bỏ cờ requirePasswordChange
    user.password = hashedPassword;
    user.requirePasswordChange = false;
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });

  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};