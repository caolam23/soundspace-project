// src/pages/AdminLayout.jsx (hoặc giữ AdminPanel.jsx)
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom'; // Để render content động
import axios from 'axios';
import { FaUserCircle, FaRegBell, FaSearch } from 'react-icons/fa';
import Sidebar from '../components/Sidebar'; // Import sidebar mới
import './AdminLayout.css'; // Đổi tên CSS nếu cần

export default function AdminLayout() {
  const [dashboardData, setDashboardData] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get('http://localhost:8800/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDashboardData(res.data);
      } catch (err) {
        console.error('Không thể lấy dữ liệu admin', err.response?.data || err.message);
      }
    };
    fetchDashboard();
  }, [token]);

  return (
    <div className="AdminLayout__wrapper">
      <Sidebar /> {/* Sidebar bên trái */}

      <div className="AdminLayout__content">
        <div className="AdminLayout__header">
          {/* Header như code cũ của bạn */}
          <div className="AdminLayout__searchWrapper">
            <FaSearch className="AdminLayout__searchIcon" />
            <input type="text" placeholder="Tìm kiếm..." className="AdminLayout__searchInput" />
          </div>
          <div className="AdminLayout__actions">
            <button className="AdminLayout__bellBtn">
              <FaRegBell className="AdminLayout__bellIcon" size={27} />
              <span className="AdminLayout__notificationBadge"></span>
            </button>
            {dashboardData ? (
              <div className="AdminLayout__userInfo">
                {dashboardData.avatar ? (
                  <img src={dashboardData.avatar} alt="avatar" className="AdminLayout__avatar" />
                ) : (
                  <FaUserCircle size={32} className="AdminLayout__defaultAvatar" />
                )}
                <div>
                  <div className="AdminLayout__username" title={dashboardData.username || 'Admin User'}>
                    {dashboardData.username || 'Admin User'}
                  </div>
                  <div className="AdminLayout__role">Quản trị viên</div>
                </div>
              </div>
            ) : (
              <p>Loading...</p>
            )}
          </div>
        </div>

        <main className="AdminLayout__main">
          <Outlet /> {/* Phần content động: render trang con ở đây */}
        </main>
      </div>
    </div>
  );
}