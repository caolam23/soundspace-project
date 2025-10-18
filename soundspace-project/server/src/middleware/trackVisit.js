// server/src/middleware/trackVisit.js
const jwt = require('jsonwebtoken');
const Visit = require('../models/Visit');
const { emitMultipleStatsUpdates } = require('../controllers/statsController');

// 🧠 Bộ nhớ tạm lưu thời gian truy cập gần nhất của từng user (tránh spam login)
const lastUserVisits = new Map(); // key: userId, value: timestamp (ms)
const TEN_MINUTES = 10 * 60 * 1000;

const trackVisit = async (req, res, next) => {
  try {
    // ==============================
    // 1️⃣ Lấy thông tin user từ JWT nếu có
    // ==============================
    if (!req.user) {
      try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.user = decoded;
        }
      } catch (err) {
        // Token không hợp lệ → bỏ qua
      }
    }

    const io = req.app.get('io');
    const userId = req.user ? (req.user.id || req.user._id) : null;
    const now = Date.now();

    // ==============================
    // 2️⃣ Kiểm tra session để ngăn F5/tải lại trang
    // ==============================
    const lastSessionVisit = req.session.lastVisitTime || 0;
    const timeSinceSession = now - lastSessionVisit;

    // Nếu F5 trong vòng 10 phút → bỏ qua
    if (timeSinceSession < TEN_MINUTES) {
      return next();
    }

    // ==============================
    // 3️⃣ Kiểm tra người dùng có đăng nhập không
    // ==============================
    if (userId) {
      const lastVisit = lastUserVisits.get(userId) || 0;
      const timeSinceUser = now - lastVisit;

      // Nếu user này vừa truy cập trong vòng 10 phút → không tính thêm
      if (timeSinceUser < TEN_MINUTES) {
        return next();
      }

      // ✅ Cập nhật lại mốc thời gian mới
      lastUserVisits.set(userId, now);
    }

    // ==============================
    // 4️⃣ Ghi nhận lượt truy cập mới
    // ==============================
    await Visit.create({ userId: userId || null });
    req.session.lastVisitTime = now; // Lưu lại thời gian vào session
    console.log(`🟢 Ghi nhận truy cập mới - User: ${userId || 'Khách'}`);

    // ==============================
    // 5️⃣ Emit cập nhật realtime cho admin
    // ==============================
    if (io) {
      await emitMultipleStatsUpdates(io, ['total-visits']);
    }

  } catch (error) {
    console.error('❌ Lỗi khi ghi nhận lượt truy cập:', error);
  }

  // Tiếp tục middleware khác
  next();
};

module.exports = trackVisit;
