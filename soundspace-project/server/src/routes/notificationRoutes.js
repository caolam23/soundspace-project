const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
    getNotifications,
    markAsRead,
    markAllAsRead
} = require('../controllers/notificationController');

// DEBUG: Check what we actually imported
console.log('[NOTIFICATION ROUTES] Imported handlers:', {
    getNotifications: typeof getNotifications,
    markAsRead: typeof markAsRead,
    markAllAsRead: typeof markAllAsRead,
    auth: typeof auth
});

// GET /api/notifications - Get user's notifications
router.get('/', auth, getNotifications);

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', auth, markAsRead);

// PUT /api/notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', auth, markAllAsRead);

module.exports = router;
