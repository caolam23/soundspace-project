const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Routes
router.get('/', userController.getAllUsers);
router.delete('/:id', userController.deleteUser);
router.post('/create', userController.createUser); // 🔥 Route mới để tạo user
router.put('/:id/toggle-lock', userController.toggleLockUser);

module.exports = router;
