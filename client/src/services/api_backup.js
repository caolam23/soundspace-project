import axios from 'axios';
import StatisticsPage from '../pages/admin/StatisticsPage';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8800';
const api = axios.create({ baseURL: `${SERVER_URL}/api` });

// Add token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// Thêm route này
<Route path="/admin/statistics" element={<StatisticsPage />} />
