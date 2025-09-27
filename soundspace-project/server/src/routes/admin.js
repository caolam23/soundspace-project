const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Chỉ admin mới truy cập
router.get('/dashboard', auth, isAdmin, adminController.getDashboard);

module.exports = router;
