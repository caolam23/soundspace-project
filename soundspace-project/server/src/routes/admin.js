const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Chỉ admin mới truy cập
router.get('/dashboard', auth, isAdmin, adminController.getDashboard);

// Reports management
router.get('/reports', auth, isAdmin, adminController.listReports);
router.post('/reports/:id/ignore', auth, isAdmin, adminController.ignoreReport);
router.post('/reports/:id/warn', auth, isAdmin, adminController.warnOwner);
router.post('/reports/:id/ban-room', auth, isAdmin, adminController.banRoom);

module.exports = router;
