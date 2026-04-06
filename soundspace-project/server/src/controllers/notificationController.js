const Notification = require('../models/Notification');

// ========================================
// GET USER'S NOTIFICATIONS WITH PAGINATION AND UNREAD COUNT
// ========================================
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const { limit = 20, skip = 0, unreadOnly = false } = req.query;

        const filter = { userId };
        if (unreadOnly === 'true') {
            filter.isRead = false;
        }

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .lean();

        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        return res.status(200).json({
            notifications,
            unreadCount,
            total: notifications.length
        });

    } catch (error) {
        console.error('[GET_NOTIFICATIONS] Error:', error);
        return res.status(500).json({ msg: 'Lỗi máy chủ' });
    }
};

// ========================================
// MARK SINGLE NOTIFICATION AS READ
// ========================================
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.user?._id;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId }, // Ensure user owns this notification
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ msg: 'Không tìm thấy thông báo' });
        }

        return res.status(200).json({
            msg: 'Đã đánh dấu là đã đọc',
            notification
        });

    } catch (error) {
        console.error('[MARK_AS_READ] Error:', error);
        return res.status(500).json({ msg: 'Lỗi máy chủ' });
    }
};

// ========================================
// MARK ALL NOTIFICATIONS AS READ
// ========================================
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        const result = await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true }
        );

        return res.status(200).json({
            msg: 'Đã đánh dấu tất cả là đã đọc',
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('[MARK_ALL_AS_READ] Error:', error);
        return res.status(500).json({ msg: 'Lỗi máy chủ' });
    }
};

// ========================================
// DELETE SINGLE NOTIFICATION
// ========================================
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.user?._id;

        const notification = await Notification.findOneAndDelete({ _id: id, userId });

        if (!notification) {
            return res.status(404).json({ msg: 'Không tìm thấy thông báo' });
        }

        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        return res.status(200).json({
            msg: 'Đã xóa thông báo',
            unreadCount
        });

    } catch (error) {
        console.error('[DELETE_NOTIFICATION] Error:', error);
        return res.status(500).json({ msg: 'Lỗi máy chủ' });
    }
};

// ========================================
// DELETE ALL READ NOTIFICATIONS
// ========================================
const deleteAllRead = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        const result = await Notification.deleteMany({ userId, isRead: true });

        return res.status(200).json({
            msg: 'Đã xóa tất cả thông báo đã đọc',
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error('[DELETE_ALL_READ] Error:', error);
        return res.status(500).json({ msg: 'Lỗi máy chủ' });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead
};
