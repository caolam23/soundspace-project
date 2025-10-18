import React from 'react';
import { Link } from 'react-router-dom';
import './Content.css';

export default function Content() {
  return (
    <div className="AdminContent-wrapper">
      <h2>Báo cáo phòng</h2>
      <div className="AdminContent-grid">
        <Link to="/admin/content/reports" className="AdminContent-card">Báo cáo phòng</Link>
        <Link to="#" className="AdminContent-card">Kiểm duyệt nội dung (coming soon)</Link>
      </div>
    </div>
  );
}