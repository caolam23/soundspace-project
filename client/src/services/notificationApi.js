import axios from 'axios';

const API_URL = 'http://localhost:8800/api';

// Get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const notificationApi = {
    // Get user's notifications
    getNotifications: async (params = {}) => {
        const { limit = 20, skip = 0, unreadOnly = false } = params;
        const response = await axios.get(
            `${API_URL}/notifications`,
            {
                params: { limit, skip, unreadOnly },
                headers: getAuthHeaders()
            }
        );
        return response.data;
    },

    // Mark single notification as read
    markAsRead: async (notificationId) => {
        const response = await axios.put(
            `${API_URL}/notifications/${notificationId}/read`,
            {},
            { headers: getAuthHeaders() }
        );
        return response.data;
    },

    // Mark all notifications as read
    markAllAsRead: async () => {
        const response = await axios.put(
            `${API_URL}/notifications/mark-all-read`,
            {},
            { headers: getAuthHeaders() }
        );
        return response.data;
    }
};
