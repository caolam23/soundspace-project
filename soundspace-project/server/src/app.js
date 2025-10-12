// server/src/app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');

// === Route imports ===
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const userRoutes = require('./routes/userRoutes');
const playlistRoutes = require('./routes/playlist.routes'); // ✅ Route playlist
const streamRoutes = require('./routes/stream.routes');     // ✅ Stream nhạc YouTube

function createApp() {
  const app = express();

  // ======================================================
  // 🔧 MIDDLEWARE CƠ BẢN
  // ======================================================
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // fallback tránh lỗi CORS khi chưa set ENV
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static('public'));

  // ======================================================
  // 🔐 PASSPORT CONFIG
  // ======================================================
  app.use(passport.initialize());
  require('./config/passport'); // Chỉ cần require để chạy setup passport

  // ======================================================
  // 📡 ĐÍNH SOCKET.IO INSTANCE VÀO REQ
  // ======================================================
  app.use((req, res, next) => {
    req.io = app.get('io'); // socket.io instance
    req.io.userSockets = app.get('userSockets'); // Map lưu socket theo userId
    next();
  });

  // ======================================================
  // 🚏 CÁC ROUTE CHÍNH
  // ======================================================
  app.use('/api/admin', adminRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);          // route phòng
  app.use('/api/rooms', playlistRoutes);      // ✅ route playlist (share prefix /api/rooms)
  app.use('/api/stream', streamRoutes);       // ✅ stream nhạc YouTube
  app.use('/api/users', userRoutes);

  // ======================================================
  // 🧪 TEST ROUTE
  // ======================================================
  app.get('/', (req, res) => {
    res.send('🎵 SoundSpace Server is running!');
  });

  // ======================================================
  // 🚒 LỚP 2: ĐỘI CỨU HỎA TOÀN CỤC (Global Error Handling)
  // ======================================================

  // 🧭 Middleware xử lý lỗi 404 – khi route không tồn tại
  app.use((req, res, next) => {
    res.status(404).json({ msg: 'Không tìm thấy API endpoint.' });
  });

  // 🔥 Middleware bắt lỗi toàn cục – chặn mọi crash server
  // ⚠️ Phải có 4 tham số: (err, req, res, next)
  app.use((err, req, res, next) => {
    console.error('============== LỖI TOÀN CỤC KHÔNG XỬ LÝ ==============');
    console.error(err.stack);
    console.error('======================================================');

    // Trả về thông báo an toàn cho client (không leak nội dung stack)
    res.status(500).json({
      msg: 'Đã có lỗi nghiêm trọng xảy ra ở phía server. Vui lòng thử lại sau!',
    });
  });

  return app;
}

module.exports = createApp;
