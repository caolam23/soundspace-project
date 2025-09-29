const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');

function createApp() {
  const app = express();

  // middlewares
  app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());

  // passport config
  require('./config/passport');

  // routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/users', require('./routes/userRoutes'));

  // test route
  app.get('/', (req, res) => res.send('SoundSpace Server is running!'));

  return app;
}

module.exports = createApp;
