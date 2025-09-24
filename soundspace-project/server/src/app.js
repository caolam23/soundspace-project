// src/app.js

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Cấu hình CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL, // Cho phép frontend kết nối
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors());
app.use(express.json()); // Để parse body của request dưới dạng JSON

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully!"))
  .catch(err => console.error("MongoDB connection error:", err));

// Lắng nghe kết nối từ client
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Xử lý các sự kiện socket ở đây (sẽ được thêm trong file socketHandler.js)

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Route cơ bản
app.get('/', (req, res) => {
  res.send('SoundSpace Server is running!');
});

// Lắng nghe trên port đã định nghĩa
const PORT = process.env.PORT || 8800;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});