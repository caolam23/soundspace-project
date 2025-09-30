// routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const {
  register,
  login,
  googleAuth,
  googleCallback,
  getMe,
  getProfile
} = require('../controllers/authController');

// Middleware xác thực
const { auth, verifyToken } = require('../middleware/auth');

const router = express.Router();

// =======================
// Local Auth
// =======================
router.post('/register', register);
router.post('/login', login);

// =======================
// Google OAuth
// =======================
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// =======================
// Current User
// =======================
router.get('/me', auth, getMe);

// =======================
// Lấy thông tin Profile từ JWT
// =======================
router.get('/profile', verifyToken, getProfile);

module.exports = router;
