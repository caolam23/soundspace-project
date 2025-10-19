// ======================================================
// 🏁 SOUNDSPACE SERVER APP
// ======================================================

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const multer = require('multer'); // <--- 1. ĐÃ THÊM IMPORT MULTER

// === Route imports ===
const adminRoutes = require('./routes/admin.routes');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const userRoutes = require('./routes/userRoutes');
const playlistRoutes = require('./routes/playlist.routes');
const streamRoutes = require('./routes/stream.routes');
const quanLyPhongRoutes = require('./routes/quanLyPhong.routes')
const statsRoutes = require('./routes/stats');
const session = require('express-session');
const trackVisit = require('./middleware/trackVisit');
console.log('✅ Loaded quanLyPhongRoutes:', typeof quanLyPhongRoutes);

function createApp() {
  const app = express();

  // ======================================================
  // 🔧 MIDDLEWARE CƠ BẢN
  // ======================================================
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static('public'));

  // ======================================================
  // ✨✨ THÊM SESSION VÀ TRACKVISIT VÀO ĐÂY ✨✨
  // ======================================================
    const thirtyMinutes = 30 * 60 * 1000;
    app.use(session({
        secret: process.env.SESSION_SECRET || 'soundspace-secret-key-for-session',
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: thirtyMinutes,
            httpOnly: true
        },
        rolling: true
    }));
    
    // Đặt trackVisit ngay sau session
    app.use(trackVisit);

  // ======================================================
  // 🔐 PASSPORT CONFIG
  // ======================================================
  app.use(passport.initialize());
  require('./config/passport');

  // ======================================================
  // 📡 ĐÍNH SOCKET.IO INSTANCE VÀO REQ
  // ======================================================
  app.use((req, res, next) => {
    req.io = app.get('io');
    req.userSockets = app.get('userSockets');
    
    // 🔍 Debug log (có thể xóa sau khi test)
    if (req.path.includes('/toggle-lock')) {
      console.log('🔍 [MIDDLEWARE] Attaching socket to req:');
      console.log('   req.io exists:', !!req.io);
      console.log('   req.userSockets exists:', !!req.userSockets);
      console.log('   req.userSockets type:', req.userSockets?.constructor?.name);
    }
    next();
  });

  // ======================================================
  // 🚏 CÁC ROUTE CHÍNH
  // ======================================================
  console.log('\n🟡 ========== MOUNTING ROUTES ==========');

  // Admin (dashboard + reports)
  console.log('🟡 Mounting: /api/admin -> adminRoutes');
  app.use('/api/admin', adminRoutes);

  // Quản lý phòng
  console.log('🟡 Mounting: /api/admin -> quanLyPhongRoutes');
  app.use('/api/admin', quanLyPhongRoutes);

  console.log('🟡 Mounting: /api/admin/stats -> statsRoutes');
  app.use('/api/admin/stats', statsRoutes);

  // Auth
  console.log('🟡 Mounting: /api/auth -> authRoutes');
  app.use('/api/auth', authRoutes);

  // Room
  console.log('🟡 Mounting: /api/rooms -> roomRoutes');
  app.use('/api/rooms', roomRoutes);

  // Playlist
  console.log('🟡 Mounting: /api/rooms -> playlistRoutes');
  app.use('/api/rooms', playlistRoutes);

  // Stream
  console.log('🟡 Mounting: /api/stream -> streamRoutes');
  app.use('/api/stream', streamRoutes);

  // Users
  console.log('🟡 Mounting: /api/users -> userRoutes');
  app.use('/api/users', userRoutes);

  console.log('🟡 ========== ROUTES MOUNTED ==========\n');

  // ======================================================
  // 🧪 TEST ROUTE
  // ======================================================
  app.get('/', (req, res) => {
    res.send('🎵 SoundSpace Server is running!');
  });

  // ======================================================
  // 🔍 DEBUG: LIST ALL REGISTERED ROUTES
  // ======================================================
  app.set('listRoutes', () => {
    console.log('\n🔍 ========== ALL REGISTERED ROUTES ==========');
    if (!app._router || !app._router.stack) {
      console.log('   ⚠️ Router not initialized yet');
      return;
    }
    
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
        const path = middleware.route.path;
        console.log(`   ${methods.padEnd(10)} ${path}`);
      } else if (middleware.name === 'router' && middleware.handle.stack) {
        const basePath = middleware.regexp
          .toString()
          .replace(/\\/g, '')
          .replace(/\/\^/g, '')
          .replace(/\?(?=\/|$)/gi, '')
          .replace(/\$\//g, '')
          .split('?')[0] || '';
        
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
            const fullPath = basePath + handler.route.path;
            console.log(`   ${methods.padEnd(10)} ${fullPath}`);
          }
        });
      }
    });
    console.log('🔍 ==========================================\n');
  });

  // ======================================================
  // 🚒 GLOBAL ERROR HANDLING (ĐÃ NÂNG CẤP)
  // ======================================================

  // 🧭 404 Handler (Phải nằm trước Global Error Handler)
  app.use((req, res, next) => {
    res.status(404).json({ msg: 'Không tìm thấy API endpoint.' });
  });

  // 🔥 Global Error Handler (Đã nâng cấp)
  // <--- 2. THAY THẾ TOÀN BỘ app.use CŨ BẰNG ĐOẠN NÀY
  app.use((err, req, res, next) => {
    
    // Xử lý lỗi từ Multer trước
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        console.warn(`[MULTER WARN] File quá lớn: ${err.message}`);
        return res.status(400).json({ 
          // Bạn có thể đổi '100MB' này nếu bạn đặt giới hạn khác
          message: 'File quá lớn. Kích thước tối đa cho phép là 100MB.' 
        });
      }
      // Các lỗi multer khác (sai field, v.v.)
      console.warn(`[MULTER WARN] Lỗi Multer khác: ${err.message}`);
      return res.status(400).json({ message: `Lỗi upload: ${err.message}` });
    }

    // Nếu không phải lỗi multer, xử lý lỗi 500 như cũ
    console.error('============== LỖI TOÀN CỤC (500) ==============');
    console.error(err.stack);
    console.error('================================================');

    res.status(500).json({
      msg: 'Đã có lỗi nghiêm trọng xảy ra ở phía server.',
    });
  });

  return app;
}

module.exports = createApp;