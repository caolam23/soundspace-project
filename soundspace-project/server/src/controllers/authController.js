const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');

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

    return res.json({
      msg: 'Đăng ký thành công',
      user: { id: user._id, email: user.email, username: user.username, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
};

// =======================
// Đăng nhập
// =======================
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ msg: 'Thiếu thông tin' });

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user || !user.password) return res.status(400).json({ msg: 'Người dùng không tồn tại hoặc chưa đăng ký bằng mật khẩu' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ msg: 'Sai mật khẩu' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      msg: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatar: user.avatar || '/default-avatar.png'
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
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // redirect về frontend kèm token + avatar
    res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}&avatar=${encodeURIComponent(req.user.avatar || '/default-avatar.png')}`);
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
