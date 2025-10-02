const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
// Routes
router.get('/', userController.getAllUsers);
router.delete('/:id', userController.deleteUser);
router.post('/create', userController.createUser); // 🔥 Route mới để tạo user
router.put('/:id/toggle-lock', userController.toggleLockUser);
// 🔥 Route đổi password (cần xác thực)
router.put('/change-password', verifyToken, userController.changePassword);

module.exports = router;
