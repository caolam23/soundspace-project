const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Routes
router.get('/', userController.getAllUsers);
router.delete('/:id', userController.deleteUser);
router.put('/:id/toggle-lock', userController.toggleLockUser);

module.exports = router;
