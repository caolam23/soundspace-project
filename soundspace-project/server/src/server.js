require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const createApp = require('./app');

// 1. Connect Database
connectDB();

// 2. Init Express App (sau khi env đã load)
const app = createApp();

// 3. Create HTTP server
const server = http.createServer(app);

// 4. Socket.IO config
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// 5. Start server
const PORT = process.env.PORT || 8800;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
