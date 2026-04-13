import axios from 'axios';

const API_URL = 'http://localhost:8800/api/recommendations';

export const recommendationApi = {
    getTrending: async (limit = 10, roomId = null) => {
        try {
            const params = { limit };
            if (roomId) params.roomId = roomId;

            const response = await axios.get(`${API_URL}/trending`, {
                params,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching trending music:', error);
            throw error;
        }
    },

    getForUser: async (limit = 10) => {
        try {
            const response = await axios.get(`${API_URL}/user`, {
                params: { limit },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching user recommendations:', error);
            throw error;
        }
    }
};
