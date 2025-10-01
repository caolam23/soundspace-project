const express = require('express'); 
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport'); // GIỮ LẠI

function createApp() {
  const app = express();

  // middlewares
  app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static('public'));
  app.use(passport.initialize());

  // passport config (chỉ require để chạy config, KHÔNG gán biến)
  require('./config/passport');

  // middleware to attach io and userSockets to req
  app.use((req, res, next) => {
    req.io = app.get('io');
    req.io.userSockets = app.get('userSockets');
    next();
  });

  // routes
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/rooms', require('./routes/room.js'));
  app.use('/api/users', require('./routes/userRoutes'));
  // test route
  app.get('/', (req, res) => res.send('SoundSpace Server is running!'));

  return app;
}

module.exports = createApp;