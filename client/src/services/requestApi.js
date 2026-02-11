import axios from 'axios';

const API_URL = 'http://localhost:8800/api';

// Helper to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const requestApi = {
    // Get list of requests for a room
    getRequests: async (roomId) => {
        const response = await axios.get(
            `${API_URL}/rooms/${roomId}/requests?status=pending`,
            getAuthHeaders()
        );
        return response.data;
    },

    // Submit a YouTube request
    youtubeRequest: async (roomId, data) => {
        const response = await axios.post(
            `${API_URL}/rooms/${roomId}/requests/youtube`,
            data,
            getAuthHeaders()
        );
        return response.data;
    },

    // Submit a file upload request
    uploadRequest: async (roomId, formData) => {
        const response = await axios.post(
            `${API_URL}/rooms/${roomId}/requests/upload`,
            formData,
            {
                headers: {
                    ...getAuthHeaders().headers,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        return response.data;
    },

    // Vote for a request
    vote: async (roomId, requestId) => {
        const response = await axios.post(
            `${API_URL}/rooms/${roomId}/requests/${requestId}/vote`,
            {},
            getAuthHeaders()
        );
        return response.data;
    },

    // Approve a request (Host only)
    approve: async (roomId, requestId) => {
        const response = await axios.post(
            `${API_URL}/rooms/${roomId}/requests/${requestId}/approve`,
            {},
            getAuthHeaders()
        );
        return response.data;
    },

    // Reject a request (Host only)
    reject: async (roomId, requestId) => {
        const response = await axios.post(
            `${API_URL}/rooms/${roomId}/requests/${requestId}/reject`,
            {},
            getAuthHeaders()
        );
        return response.data;
    }
};
