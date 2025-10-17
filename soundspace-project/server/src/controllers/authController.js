// server/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const { emitStatsUpdate } = require('./statsController');

// =======================
// Đăng ký
// =======================
exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Email và password bắt buộc' });
    if (password !== confirmPassword) return res.status(400).json({ msg: 'Mật khẩu không khớp' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: 'Email đã tồn tại' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });

    // 📊 Emit real-time stats update for user growth
    const io = req.app?.get('io');
    console.log('🔍 DEBUG: io object exists?', !!io);
    console.log('🔍 DEBUG: io.sockets.sockets.size:', io?.sockets?.sockets?.size);
    
    if (io) {
      console.log('📊 About to emit user growth stats...');
      emitStatsUpdate(io, 'user-growth').catch(err => 
        console.error('❌ Error emitting user growth stats:', err)
      );
      console.log('📊 User growth stats updated after new registration');
    } else {
      console.error('❌ IO object not found! Cannot emit stats update');
    }

    return res.json({
      msg: 'Đăng ký thành công',
      user: { _id: user._id, email: user.email, username: user.username, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// =======================
// Đăng nhập
// =======================
const Stats = require('../models/Stats');
const Visit = require('../models/Visit');
const { getTotalVisitsStats } = require('../services/statsService');
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ msg: 'Thiếu thông tin' });

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user || !user.password) return res.status(400).json({ msg: 'Người dùng không tồn tại hoặc chưa đăng ký bằng mật khẩu' });
    if (user.isBlocked) return res.status(403).json({ msg: 'Tài khoản đã bị chặn và không thể đăng nhập.' });
    
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ msg: 'Sai mật khẩu' });

    // Lưu Visit mới và emit socket event cho từng range
    const io = req.app?.get('io');
    try {
      await Visit.create({ userId: user._id });
      const ranges = ['1d', '7d', '1m', 'all'];
      for (const range of ranges) {
        const count = await getTotalVisitsStats(range);
        if (io) {
          io.emit('stats:total-visits-update', { totalVisits: count, range });
          console.log(`📈 [SOCKET] stats:total-visits-update emitted: range=${range}, count=${count}`);
        }
      }
    } catch (err) {
      console.error('❌ Error updating totalVisits:', err);
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // 🔥 Kiểm tra nếu user cần đổi password
    res.json({
      msg: 'Đăng nhập thành công',
      token,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatar: user.avatar || '/default-avatar.png',
        requirePasswordChange: user.requirePasswordChange || false // 🔥 Trả về trạng thái
      }
    });
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// =======================
// Google OAuth start
// =======================

exports.googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

// Callback từ Google
exports.googleCallback = [
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login` }),
  async (req, res) => {
    // Check if user is blocked
    const user = await User.findById(req.user._id);
    if (user && user.isBlocked) {
      return res.redirect(`${process.env.CLIENT_URL}/login?blocked=1`);
    }

    // 📊 Emit real-time stats update for user growth (for OAuth login/register)
    const io = req.app?.get('io');
    if (io) {
      console.log('📊 Emitting user growth stats after OAuth login/register...');
      emitStatsUpdate(io, 'user-growth').catch(err => 
        console.error('❌ Error emitting user growth stats:', err)
      );
    }

    // Lưu Visit mới và emit socket event cho từng range
    try {
      await Visit.create({ userId: user._id });
      const ranges = ['1d', '7d', '1m', 'all'];
      for (const range of ranges) {
        const count = await getTotalVisitsStats(range);
        if (io) {
          io.emit('stats:total-visits-update', { totalVisits: count, range });
          console.log(`📈 [SOCKET] stats:total-visits-update emitted (OAuth): range=${range}, count=${count}`);
        }
      }
    } catch (err) {
      console.error('❌ Error updating totalVisits (OAuth):', err);
    }

    const token = jwt.sign(
      { id: req.user._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // redirect về frontend kèm token + avatar
    res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${encodeURIComponent(token)}&avatar=${encodeURIComponent(req.user.avatar || '/default-avatar.png')}`);
  }
];

// =======================
// Get current user (req.user từ middleware verifyToken)
// =======================
exports.getMe = (req, res) => {
  res.json({ user: req.user });
};

// =======================
// Lấy user profile từ DB
// =======================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Lỗi Server');
  }
};