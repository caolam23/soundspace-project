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
const streamRoutes = require('./routes/stream.routes');     // ✅ Thêm nếu stream nhạc YouTube

function createApp() {
  const app = express();

  // =============================
  // 🔧 Middleware cấu hình cơ bản
  // =============================
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // ✅ fallback tránh lỗi CORS
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static('public'));

  // =============================
  // 🔐 Passport Config
  // =============================
  app.use(passport.initialize());
  require('./config/passport'); // chỉ require để chạy cấu hình passport

  // =============================
  // 📡 Middleware: đính io & userSockets vào req
  // =============================
  app.use((req, res, next) => {
    req.io = app.get('io'); // Socket.IO instance
    req.io.userSockets = app.get('userSockets'); // Map lưu socket theo userId
    next();
  });

  // =============================
  // 🚏 Các routes chính
  // =============================
  app.use('/api/admin', adminRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);          // route phòng
  app.use('/api/rooms', playlistRoutes);      // ✅ route thêm bài hát (dùng cùng prefix)
  app.use('/api/stream', streamRoutes);       // ✅ stream nhạc YouTube
  app.use('/api/users', userRoutes);

  // =============================
  // 🧪 Route test server
  // =============================
  app.get('/', (req, res) => {
    res.send('🎵 SoundSpace Server is running!');
  });

  return app;
}

module.exports = createApp;
