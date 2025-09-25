const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');

require('../config/passport');

const router = express.Router();

// Register (local)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Email và password bắt buộc' });
    if (password !== confirmPassword) return res.status(400).json({ msg: 'Mật khẩu không khớp' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ msg: 'Email đã tồn tại' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });
    return res.json({ msg: 'Đăng ký thành công', user: { id: user._id, email: user.email } });
  } catch (err) {
    return res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
});

// Login (local)
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = username hoặc email
    if (!identifier || !password) return res.status(400).json({ msg: 'Thiếu thông tin' });

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user || !user.password) return res.status(400).json({ msg: 'Người dùng không tồn tại hoặc chưa đăng ký bằng mật khẩu' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ msg: 'Sai mật khẩu' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ msg: 'Đăng nhập thành công', token, user: { id: user._id, email: user.email, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server', error: err.message });
  }
});

// Google OAuth start
router.get('/google', passport.authenticate('google', { scope: ['profile','email'] }));

// Google callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login` }),
  (req, res) => {
    // user in req.user
    const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    // Redirect về frontend với token (dev only). Production nên dùng cookie httpOnly.
    res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
  }
);

// get current user
const { auth } = require('../middleware/auth');
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
