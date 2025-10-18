// Reports.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';
import './Reports.css';
import { toast } from 'react-toastify';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // 🔥 THAY ĐỔI: từ /reports → /room-reports
      const { data } = await axios.get('http://localhost:8800/api/admin/room-reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data && data.success) setReports(data.data);
    } catch (err) {
      console.error('Fetch reports error', err);
      toast.error('Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const { socket } = useContext(AuthContext);
  useEffect(() => { fetchReports(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      fetchReports();
      toast.info('Có báo cáo phòng mới');
    };
    socket.on('room-reported', handler);
    return () => socket.off('room-reported', handler);
  }, [socket]);

  const doAction = async (reportId, action) => {
    try {
      const token = localStorage.getItem('token');
      let url = '';
      // 🔥 THAY ĐỔI: Đổi tất cả /reports/:id → /room-reports/:id
      if (action === 'ignore') url = `/api/admin/room-reports/${reportId}/ignore`;
      if (action === 'warn') url = `/api/admin/room-reports/${reportId}/warn`;
      if (action === 'ban') url = `/api/admin/room-reports/${reportId}/ban-room`;

      let body = {};
      if (action === 'ban') {
        const reason = window.prompt('Lý do cấm phòng (tuỳ chọn):', 'Vi phạm chính sách');
        body = { reason };
      }

      const { data } = await axios.post(`http://localhost:8800${url}`, body, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (data && data.success) {
        toast.success(data.msg || 'Thao tác thành công');
        fetchReports();
      }
    } catch (err) {
      console.error('Action error', err);
      toast.error(err.response?.data?.msg || 'Thao tác thất bại');
    }
  };

  return (
    <div className="AdminReports-wrapper">
      <h2>Báo cáo phòng</h2>
      {loading ? <div>Đang tải...</div> : (
        <div className="AdminReports-tableWrapper">
          <table className="AdminReports-table">
            <thead>
              <tr>
                <th>Phòng</th>
                <th>Loại báo cáo</th>
                <th>Mô tả</th>
                <th>Người báo cáo</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr><td colSpan={6}>Không có báo cáo</td></tr>
              )}
              {reports.map(r => (
                <tr key={r._id}>
                  <td>{r.room ? r.room.name : '—'}</td>
                  <td>{r.category}</td>
                  <td>{r.details || '—'}</td>
                  <td>{r.reporter ? r.reporter.username : 'Ẩn danh'}</td>
                  <td>
                    <span className={`AdminReports-badge AdminReports-badge-${r.status || 'open'}`}>
                      {r.status === 'open' && 'Mới'}
                      {r.status === 'reviewed' && 'Đã xử lý'}
                      {r.status === 'dismissed' && 'Bị bỏ qua'}
                      {!['open','reviewed','dismissed'].includes(r.status) && (r.status || '—')}
                    </span>
                  </td>
                  <td>
                    <button className="AdminReports-btn" onClick={() => doAction(r._id, 'ignore')} disabled={r.status !== 'open'}>
                      Bỏ qua
                    </button>
                    <button className="AdminReports-btn AdminReports-btn-warning" onClick={() => doAction(r._id, 'warn')} disabled={r.status !== 'open'}>
                      Cảnh báo chủ phòng
                    </button>
                    <button className="AdminReports-btn AdminReports-btn-danger" onClick={() => doAction(r._id, 'ban')} disabled={r.status !== 'open'}>
                      Xóa phòng / Cấm phòng
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}