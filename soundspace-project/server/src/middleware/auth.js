const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function auth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.cookies?.token;
    if (!authHeader) return res.status(401).json({ msg: 'Chưa đăng nhập' });

    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ msg: 'Người dùng không tồn tại' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ msg: 'Token không hợp lệ', error: err.message });
  }
}

function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ msg: 'Chưa đăng nhập' });
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Không có quyền admin' });
  next();
}

module.exports = { auth, isAdmin };
