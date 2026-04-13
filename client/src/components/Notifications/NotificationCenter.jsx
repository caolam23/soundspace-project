import React, { useState, useEffect, useRef, useContext } from 'react';
import { FaBell, FaTimes } from 'react-icons/fa';
import { AuthContext } from '../../contexts/AuthContext';
import { notificationApi } from '../../services/notificationApi';
import styles from './NotificationCenter.module.css';

const NotificationCenter = () => {
    const { socket } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all' | 'unread'
    const [deletingIds, setDeletingIds] = useState([]); // IDs đang trong animation xóa
    const dropdownRef = useRef(null);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationApi.getNotifications({ limit: 10 });
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.error('[NotificationCenter] Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, []);

    // Listen for new personal notifications (socket)
    useEffect(() => {
        if (!socket) {
            console.log('[NotificationCenter] Socket not available yet');
            return;
        }

        console.log('[NotificationCenter] Setting up personal-notification listener');

        const handlePersonalNotification = ({ notification, unreadCount: newCount }) => {
            console.log('[NotificationCenter] 🔔 Received personal-notification:', {
                notification,
                unreadCount: newCount
            });

            setNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep last 10
            setUnreadCount(newCount);
        };

        socket.on('personal-notification', handlePersonalNotification);

        return () => {
            console.log('[NotificationCenter] Cleaning up personal-notification listener');
            socket.off('personal-notification', handlePersonalNotification);
        };
    }, [socket]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Mark single notification as read
    const handleMarkAsRead = async (notificationId) => {
        try {
            await notificationApi.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('[NotificationCenter] Error marking as read:', error);
        }
    };

    // Mark all as read
    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('[NotificationCenter] Error marking all as read:', error);
        }
    };

    // Delete single notification
    const handleDelete = async (e, notificationId) => {
        e.stopPropagation(); // Không trigger markAsRead

        // Animation fade-out
        setDeletingIds(prev => [...prev, notificationId]);

        setTimeout(async () => {
            try {
                const data = await notificationApi.deleteNotification(notificationId);
                setNotifications(prev => prev.filter(n => n._id !== notificationId));
                setUnreadCount(data.unreadCount ?? unreadCount);
            } catch (error) {
                console.error('[NotificationCenter] Error deleting notification:', error);
                // Rollback animation nếu lỗi
                setDeletingIds(prev => prev.filter(id => id !== notificationId));
            }
        }, 300); // Đợi animation xong rồi xóa
    };

    // Delete all read notifications
    const handleDeleteAllRead = async () => {
        const readNotifs = notifications.filter(n => n.isRead);
        if (readNotifs.length === 0) return;

        const confirmed = window.confirm(
            `Xóa ${readNotifs.length} thông báo đã đọc? Hành động này không thể hoàn tác.`
        );
        if (!confirmed) return;

        // Animation fade-out cho tất cả đã đọc
        const readIds = readNotifs.map(n => n._id);
        setDeletingIds(prev => [...prev, ...readIds]);

        setTimeout(async () => {
            try {
                await notificationApi.deleteAllRead();
                setNotifications(prev => prev.filter(n => !n.isRead));
                setDeletingIds([]);
            } catch (error) {
                console.error('[NotificationCenter] Error deleting all read:', error);
                setDeletingIds([]);
            }
        }, 300);
    };

    // Format time ago
    const formatTimeAgo = (createdAt) => {
        const now = new Date();
        const notifDate = new Date(createdAt);
        const diffMs = now - notifDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d trước`;
        if (diffHours > 0) return `${diffHours}h trước`;
        if (diffMins > 0) return `${diffMins}m trước`;
        return 'Vừa xong';
    };

    // Filtered notifications
    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.isRead)
        : notifications;

    // Check if there are any read notifications
    const hasReadNotifications = notifications.some(n => n.isRead);

    return (
        <div className={styles.center} ref={dropdownRef}>
            <button
                className={styles.bell}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
            >
                <FaBell size={20} />
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <h3>Thông báo</h3>
                        <div className={styles.headerActions}>
                            {unreadCount > 0 && (
                                <button
                                    className={styles.headerBtn}
                                    onClick={handleMarkAllAsRead}
                                    title="Đánh dấu tất cả đã đọc"
                                >
                                    Đọc tất cả
                                </button>
                            )}
                            {hasReadNotifications && (
                                <button
                                    className={`${styles.headerBtn} ${styles.deleteBtn}`}
                                    onClick={handleDeleteAllRead}
                                    title="Xóa tất cả thông báo đã đọc"
                                >
                                    Xóa đã đọc
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${filter === 'all' ? styles.tabActive : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            Tất cả
                        </button>
                        <button
                            className={`${styles.tab} ${filter === 'unread' ? styles.tabActive : ''}`}
                            onClick={() => setFilter('unread')}
                        >
                            Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
                        </button>
                    </div>

                    <div className={styles.list}>
                        {loading ? (
                            <div className={styles.empty}>Đang tải...</div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className={styles.empty}>
                                <div className={styles.emptyIcon}>🔔</div>
                                <p>{filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}</p>
                            </div>
                        ) : (
                            (() => {
                                // Group notifications by room
                                const groupedByRoom = filteredNotifications.reduce((acc, notif) => {
                                    const roomName = notif.payload?.roomName || 'Khác';
                                    if (!acc[roomName]) acc[roomName] = [];
                                    acc[roomName].push(notif);
                                    return acc;
                                }, {});

                                return Object.entries(groupedByRoom).map(([roomName, notifs]) => (
                                    <div key={roomName} className={styles.roomGroup}>
                                        {/* Room Header */}
                                        <div className={styles.roomHeader}>
                                            <span className={styles.roomIcon}>📍</span>
                                            <span className={styles.roomName}>{roomName}</span>
                                            <span className={styles.roomCount}>({notifs.length})</span>
                                        </div>

                                        {/* Notifications in this room */}
                                        {notifs.map(notif => (
                                            <div
                                                key={notif._id}
                                                className={`${styles.item} ${!notif.isRead ? styles.unread : ''} ${deletingIds.includes(notif._id) ? styles.deleting : ''}`}
                                                onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
                                            >
                                                <div className={styles.content}>
                                                    <div className={styles.icon}>
                                                        {notif.type === 'song_approved' && '🎉'}
                                                        {notif.type === 'song_rejected' && '❌'}
                                                        {notif.type === 'vote_milestone' && '🔥'}
                                                    </div>
                                                    <div className={styles.text}>
                                                        <p>{notif.payload?.message || 'Thông báo mới'}</p>
                                                        <span className={styles.time}>
                                                            {formatTimeAgo(notif.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                                {!notif.isRead && <div className={styles.dot}></div>}
                                                <button
                                                    className={styles.deleteItemBtn}
                                                    onClick={(e) => handleDelete(e, notif._id)}
                                                    title="Xóa thông báo"
                                                >
                                                    <FaTimes size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ));
                            })()
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
