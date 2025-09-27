import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminPanel() {
  const [dashboardData, setDashboardData] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get('http://localhost:8800/api/admin/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setDashboardData(res.data);
      } catch (err) {
        console.error('Không thể lấy dữ liệu admin', err.response?.data || err.message);
      }
    };

    fetchDashboard();
  }, [token]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Panel</h1>
      {dashboardData ? (
        <div>
          <p>{dashboardData.msg}</p>
          <p>UserId: {dashboardData.userId}</p>
          <p>Role: {dashboardData.role}</p>
        </div>
      ) : (
        <p>Loading dashboard...</p>
      )}
    </div>
  );
}
