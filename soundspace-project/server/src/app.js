// src/app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');

// === Route imports ===
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const userRoutes = require('./routes/userRoutes');
const playlistRoutes = require('./routes/playlist.routes');
const streamRoutes = require('./routes/stream.routes');
const quanLyPhongRoutes = require('./routes/quanLyPhong.routes');

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
  // 🔐 PASSPORT CONFIG
  // ======================================================
  app.use(passport.initialize());
  require('./config/passport');

  // ======================================================
  // 📡 ĐÍNH SOCKET.IO INSTANCE VÀO REQ
  // ✅ SỬA LẠI: req.userSockets thay vì req.io.userSockets
  // ======================================================
  app.use((req, res, next) => {
    req.io = app.get('io');
    req.userSockets = app.get('userSockets'); // ✅ FIXED: Gán trực tiếp vào req.userSockets
    
    // 🔍 Debug log (có thể xóa sau khi test xong)
    if (req.path.includes('/toggle-lock')) {
      console.log('🔍 [MIDDLEWARE] Attaching socket to req:');
      console.log('   req.io exists:', !!req.io);
      console.log('   req.userSockets exists:', !!req.userSockets);
      console.log('   req.userSockets type:', req.userSockets?.constructor?.name);
    }
    
    next();
  });

  // ======================================================
  // 🚏 CÁC ROUTE CHÍNH
  // ======================================================
  console.log('\n🟡 ========== MOUNTING ROUTES ==========');
  
  app.use('/api/admin', (req, res, next) => {
    console.log('🔶 Request to /api/admin/*');
    console.log('   Full path:', req.originalUrl);
    next();
  });
  
  console.log('🟡 Mounting: /api/admin -> quanLyPhongRoutes');
  app.use('/api/admin', quanLyPhongRoutes);
  
  console.log('🟡 Mounting: /api/admin -> adminRoutes');
  app.use('/api/admin', adminRoutes);
  
  console.log('🟡 Mounting: /api/auth -> authRoutes');
  app.use('/api/auth', authRoutes);
  
  console.log('🟡 Mounting: /api/rooms -> roomRoutes');
  app.use('/api/rooms', roomRoutes);
  
  console.log('🟡 Mounting: /api/rooms -> playlistRoutes');
  app.use('/api/rooms', playlistRoutes);
  
  console.log('🟡 Mounting: /api/stream -> streamRoutes');
  app.use('/api/stream', streamRoutes);
  
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
      console.log('   ⚠️ Router not initialized yet');
      return;
    }
    
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
        const path = middleware.route.path;
        console.log(`   ${methods.padEnd(10)} ${path}`);
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
            console.log(`   ${methods.padEnd(10)} ${fullPath}`);
          }
        });
      }
    });
    console.log('🔍 ==========================================\n');
  });

  // ======================================================
  // 🚒 GLOBAL ERROR HANDLING
  // ======================================================

  // 🧭 404 Handler
  app.use((req, res, next) => {
    res.status(404).json({ msg: 'Không tìm thấy API endpoint.' });
  });

  // 🔥 Global Error Handler
  app.use((err, req, res, next) => {
    console.error('============== LỖI TOÀN CỤC ==============');
    console.error(err.stack);
    console.error('=========================================');

    res.status(500).json({
      msg: 'Đã có lỗi nghiêm trọng xảy ra ở phía server.',
    });
  });

  return app;
}

module.exports = createApp;