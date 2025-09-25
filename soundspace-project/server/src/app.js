// ---- IMPORTS ----
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser'); // Thêm từ phiên bản 2

// Import cấu hình Passport (quan trọng cho Google Login)
require('./config/passport');

// Import các routes
const authRoutes = require('./routes/auth');
// const adminRoutes = require('./routes/admin'); // Tạm thời comment lại vì chưa làm

// ---- INITIALIZATION ----
const app = express();
const server = http.createServer(app);

// Cấu hình Socket.IO với CORS chi tiết
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL, // Chỉ cho phép kết nối từ địa chỉ client
    credentials: true, // Cho phép gửi cookie (nếu cần)
    methods: ["GET", "POST"]
  }
});

// ---- MIDDLEWARES ----
// Sử dụng CORS cho Express API
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(express.json()); // Để parse body của request dưới dạng JSON
app.use(cookieParser()); // Để đọc cookie
app.use(passport.initialize()); // Khởi tạo Passport để xác thực

// ---- DATABASE CONNECTION ----
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully!"))
  .catch(err => console.error("MongoDB connection error:", err));

// ---- API ROUTES ----
app.use('/api/auth', authRoutes);
// app.use('/api/admin', adminRoutes); // Sẽ dùng trong tương lai khi làm chức năng admin

// Route cơ bản để kiểm tra server
app.get('/', (req, res) => {
  res.send('SoundSpace Server is running!');
});

// ---- SOCKET.IO LOGIC ----
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Tất cả các logic về chat, đồng bộ nhạc sẽ được đặt ở đây

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// ---- SERVER LISTENING ----
const PORT = process.env.PORT || 8800;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});