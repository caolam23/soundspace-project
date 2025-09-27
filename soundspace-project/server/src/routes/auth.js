const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Local auth
router.post('/register', authController.register);
router.post('/login', authController.login);

// Google OAuth
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Get current user
router.get('/me', auth, authController.getMe);

module.exports = router;
