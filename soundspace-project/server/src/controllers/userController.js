// server/src/controllers/userController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { sendWelcomeEmail } = require('../services/emailService'); // 🔥 Import email service
const { emitStatsUpdate } = require('./statsController');

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

    // 📊 Emit real-time stats update for user growth
    const io = req.app?.get('io');
    if (io) {
      emitStatsUpdate(io, 'user-growth').catch(err => 
        console.error('❌ Error emitting user growth stats:', err)
      );
      console.log('📊 User growth stats updated after new user creation');
    }

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

    // Xóa tất cả Visit của user
    const Visit = require('../models/Visit');
    await Visit.deleteMany({ userId: id });

    // Xóa tất cả các track do user upload trong các phòng
    const Room = require('../models/room');
    await Room.updateMany(
      { 'playlist.addedBy': id },
      { $pull: { playlist: { addedBy: id } } }
    );

    res.json({ message: 'Xóa user và toàn bộ dữ liệu liên quan thành công' });
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
    
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Không thể khóa tài khoản admin' });
    }

    // Toggle trạng thái chặn
    user.isBlocked = !user.isBlocked;
    await user.save();

    // ✅ Emit socket event (req.io và req.userSockets luôn có sẵn nhờ middleware)
    const userId = user._id.toString();
    const userSocketSet = req.userSockets.get(userId);
    
    console.log(`🔔 [TOGGLE_LOCK] User ${userId} blocked: ${user.isBlocked}`);
    console.log(`🔍 [TOGGLE_LOCK] User sockets:`, userSocketSet ? Array.from(userSocketSet) : 'none');
    
    if (userSocketSet && userSocketSet.size > 0) {
      // Emit đến TẤT CẢ socket của user này
      userSocketSet.forEach(socketId => {
        req.io.to(socketId).emit('user-blocked', {
          blocked: user.isBlocked,
          message: user.isBlocked
            ? 'Tài khoản của bạn đã bị chặn. Nếu có thắc mắc vui lòng liên hệ quản trị viên.'
            : 'Tài khoản của bạn đã được mở khóa.'
        });
        console.log(`✅ [TOGGLE_LOCK] Emitted to socket ${socketId}`);
      });

      // ✅ Force disconnect nếu bị chặn
      if (user.isBlocked) {
        setTimeout(() => {
          userSocketSet.forEach(socketId => {
            const socket = req.io.sockets.sockets.get(socketId);
            if (socket) {
              socket.disconnect(true);
              console.log(`🚪 [TOGGLE_LOCK] Disconnected socket ${socketId}`);
            }
          });
          req.userSockets.delete(userId);
        }, 2000); // Delay 2s để user kịp nhận modal
      }
    } else {
      console.warn(`⚠️ [TOGGLE_LOCK] No active sockets for user ${userId}`);
    }

    res.json({ 
      message: `User đã được ${user.isBlocked ? 'khóa' : 'mở khóa'} thành công`,
      isBlocked: user.isBlocked
    });

  } catch (err) {
    console.error('[TOGGLE_LOCK] Error:', err);
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

exports.updateUserInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email } = req.body;

    // Validation
    if (!username || !email) {
      return res.status(400).json({ message: 'Username và email là bắt buộc' });
    }

    // Kiểm tra email format
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ' });
    }

    // Tìm user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // Kiểm tra email/username đã tồn tại (trừ chính user này)
    const existingUser = await User.findOne({
      _id: { $ne: id },
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email 
          ? 'Email đã được sử dụng bởi user khác' 
          : 'Username đã được sử dụng bởi user khác'
      });
    }

    // Cập nhật thông tin cơ bản
    user.username = username;
    user.email = email;

    await user.save();

    res.json({ 
      message: 'Cập nhật thông tin thành công',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Error updating user info:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ==========================================
// 🔥 [PUT] /api/users/:id/update-role
// Cập nhật role và currentRole
// ==========================================
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, currentRole } = req.body;

    // Validation
    const validRoles = ['user', 'admin'];
    const validCurrentRoles = ['user', 'host', 'listener'];

    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Role không hợp lệ' });
    }

    if (currentRole && !validCurrentRoles.includes(currentRole)) {
      return res.status(400).json({ message: 'Current role không hợp lệ' });
    }

    // Tìm user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // Cập nhật role
    if (role) user.role = role;
    if (currentRole) user.currentRole = currentRole;

    await user.save();

    res.json({ 
      message: 'Cập nhật phân quyền thành công',
      user: {
        id: user._id,
        role: user.role,
        currentRole: user.currentRole
      }
    });

  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ==========================================
// 🔥 [PUT] /api/users/:id/reset-password
// Reset password và gửi email (nếu cần)
// ==========================================
exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, requirePasswordChange, sendResetEmail } = req.body;

    // Validation
    if (!newPassword) {
      return res.status(400).json({ message: 'Mật khẩu mới là bắt buộc' });
    }

    if (newPassword.length < 8 || newPassword.length > 20) {
      return res.status(400).json({ message: 'Mật khẩu phải có từ 8-20 ký tự' });
    }

    // Tìm user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // Hash password mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật password
    user.password = hashedPassword;
    user.requirePasswordChange = requirePasswordChange || false;
    user.passwordChangedAt = new Date();

    await user.save();

    // Gửi email nếu được yêu cầu
    if (sendResetEmail) {
      try {
        await sendWelcomeEmail(user.email, user.username, newPassword, user.role);
        console.log('✅ Password reset email sent to:', user.email);
      } catch (emailError) {
        console.error('❌ Failed to send reset email:', emailError);
        // Không throw error, vẫn coi như reset thành công
      }
    }

    // Emit socket event để force logout user (nếu đang online)
    if (req.io && req.io.userSockets) {
      const socketId = req.io.userSockets.get(user._id.toString());
      if (socketId) {
        req.io.to(socketId).emit('password-reset', {
          message: 'Mật khẩu của bạn đã được thay đổi. Vui lòng đăng nhập lại.'
        });
      }
    }

    res.json({ 
      message: sendResetEmail 
        ? 'Reset password thành công! Email đã được gửi đến user'
        : 'Reset password thành công!',
      requirePasswordChange: user.requirePasswordChange
    });

  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};