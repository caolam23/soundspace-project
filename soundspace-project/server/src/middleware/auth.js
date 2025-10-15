// server/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware xác thực token (đơn giản)
 * -> chỉ decode token, gắn payload vào req.user
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.cookies?.token;
  if (!authHeader) {
    return res.status(401).json({ msg: 'Không tìm thấy token, truy cập bị từ chối' });
  }

  let token = authHeader;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // payload từ token
    next();
  } catch (err) {
    return res.status(403).json({ msg: 'Token không hợp lệ', error: err.message });
  }
}

/**
 * Middleware xác thực đầy đủ
 * -> decode token, query user từ DB, gắn user object vào req.user
 */
async function auth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.cookies?.token;
  if (!authHeader) return res.status(401).json({ msg: 'Chưa đăng nhập' });

  let token = authHeader;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ msg: 'Người dùng không tồn tại' });

    req.user = user; // object user từ DB
    next();
  } catch (err) {
    return res.status(403).json({ msg: 'Token không hợp lệ', error: err.message });
  }
}

/**
 * Middleware kiểm tra quyền admin
 */
function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ msg: 'Chưa đăng nhập' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Không có quyền admin' });
  }
  next();
}

// ============================================
// 🆕 MIDDLEWARE ATTACH SOCKET.IO
// ============================================
/**
 * Middleware để attach io và userSockets vào req object
 * Cho phép controllers có thể emit socket events
 * 
 * @param {Object} io - Socket.IO server instance
 * @param {Map} userSockets - Map chứa userId -> Set<socketId>
 * @returns {Function} Express middleware
 */
function attachSocketIO(io, userSockets) {
  return (req, res, next) => {
    req.io = io;
    req.userSockets = userSockets;
    next();
  };
}

module.exports = { 
  verifyToken, 
  auth, 
  isAdmin,
  attachSocketIO // 🆕 Export middleware mới
};