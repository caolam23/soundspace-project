// src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  Home,
  MessageCircle,
  Music,
  BarChart3,
  Settings,
  Shield,
  TrendingUp
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
  return (
    <div className="Sidebar__wrapper">
      {/* Logo */}
      <div className="Sidebar__logo">
        <div className="Sidebar__logoIcon">
          <Music size={22} />
        </div>
        <div>
          <h1 className="Sidebar__title">SoundSpace</h1>
          <p className="Sidebar__subtitle">Admin Panel</p>
        </div>
      </div>

      {/* Menu */}
      <ul className="Sidebar__menu">
        <li>
          <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'Sidebar__link active' : 'Sidebar__link'}>
            <BarChart3 size={18} /> <span>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'Sidebar__link active' : 'Sidebar__link'}>
            <Users size={18} /> <span>Quản lý User</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/quanlyphong" className={({ isActive }) => isActive ? 'Sidebar__link active' : 'Sidebar__link'}>
            <Home size={18} /> <span>Quản lý Phòng</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/comments" className={({ isActive }) => isActive ? 'Sidebar__link active' : 'Sidebar__link'}>
            <MessageCircle size={18} /> <span>Quản lý Bình luận</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/content" className={({ isActive }) => isActive ? 'Sidebar__link active' : 'Sidebar__link'}>
            <Shield size={18} /> <span>Nội dung & Bản quyền</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/analytics" className={({ isActive }) => isActive ? 'Sidebar__link active' : 'Sidebar__link'}>
            <TrendingUp size={18} /> <span>Thống kê</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'Sidebar__link active' : 'Sidebar__link'}>
            <Settings size={18} /> <span>Cài đặt</span>
          </NavLink>
        </li>
      </ul>
    </div>
  );
}
