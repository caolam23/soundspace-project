import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:8800/api' });

// Add token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Submit a report for a room.
 * payload: { category: string, details?: string }
 */
export const reportRoom = async (roomId, payload) => {
  return api.post(`/rooms/${roomId}/report`, payload);
};

export default api;
