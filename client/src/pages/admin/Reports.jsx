import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';
import './Reports.css'; // Đảm bảo đã import
import { toast } from 'react-toastify';
import ConfirmBanModal from './ConfirmBanModal'; // ✅ 1. Import Modal mới

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ 2. Thêm state để quản lý modal
  const [modalState, setModalState] = useState({
    isOpen: false,
    reportId: null,
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
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

  // ... (giữ nguyên tất cả các useEffect của bạn)
  const { socket, socketReady } = useContext(AuthContext);

  useEffect(() => { fetchReports(); }, []);

  // Keep short-lived history to deduplicate events that arrive multiple times
  // (server may emit room-ended to every socket in room + a global homepage event)
  const recentHandled = React.useRef(new Map());
  const lastGlobalHandled = React.useRef(0);

  useEffect(() => {
    if (!socket || !socketReady) return;
    const handler = () => {
      console.log('[Reports] socket event: room-reported');
      fetchReports();
      toast.info('Có báo cáo phòng mới');
    };
    socket.on('room-reported', handler);
    return () => socket.off('room-reported', handler);
  }, [socket, socketReady]);

  // Listen for room end / deletion so reports for that room disappear in real-time
  useEffect(() => {
    if (!socket || !socketReady) return;

    const refreshHandler = (payload) => {
      try {
        console.log('[Reports] room-end related event received:', payload);
        const now = Date.now();
        const DEDUPE_MS = 3000; // ignore duplicate events within 3 seconds
        const roomId = payload && (payload.roomId || payload._id || payload.id);

        if (roomId) {
          const last = recentHandled.current.get(String(roomId)) || 0;
          if (now - last < DEDUPE_MS) {
            console.log(`[Reports] Duplicate room-end for ${roomId}, ignoring.`);
            return;
          }
          recentHandled.current.set(String(roomId), now);

          // remove local reports for that room (optimistic) and then sync once
          setReports(prev => prev.filter(r => {
            const rid = r.room && (r.room._id || r.room.id || r.room);
            return String(rid) !== String(roomId);
          }));
          fetchReports();
          toast.info('Một phòng đã kết thúc — cập nhật báo cáo');
        } else {
          // global/no-roomId events: dedupe by time window
          if (now - lastGlobalHandled.current < DEDUPE_MS) {
            console.log('[Reports] Duplicate global room-end event, ignoring.');
            return;
          }
          lastGlobalHandled.current = now;
          fetchReports();
          toast.info('Một phòng đã kết thúc — cập nhật báo cáo');
        }
      } catch (err) {
        console.error('[Reports] refreshHandler error', err);
        fetchReports();
      }
    };
    const makeHandler = (eventName) => (payload) => {
      const adminReasons = ['admin-banned', 'host-blocked'];
      if (eventName === 'room-ended') {
        if (payload && payload.reason && adminReasons.includes(payload.reason)) {
          console.log(`[Reports] Ignoring room-ended from admin action (${payload.reason})`);
          return;
        }
      }

      if (eventName === 'room-deleted' || eventName === 'room-banned') {
        console.log(`[Reports] Ignoring ${eventName} (admin action)`);
        return;
      }
      refreshHandler(payload);
    };

    socket.on('room-ended', makeHandler('room-ended'));
    socket.on('room-ended-homepage', makeHandler('room-ended-homepage'));
    socket.on('room-deleted', makeHandler('room-deleted'));
    socket.on('room-members-changed', makeHandler('room-members-changed'));

    return () => {
      socket.off('room-ended');
      socket.off('room-ended-homepage');
      socket.off('room-deleted');
      socket.off('room-members-changed');
    };
  }, [socket, socketReady]);

  // ✅ 3. Cập nhật hàm doAction
  const doAction = async (reportId, action) => {
    // Với action 'ban', chúng ta chỉ mở modal, không gọi API trực tiếp
    if (action === 'ban') {
      setModalState({ isOpen: true, reportId: reportId });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      let url = '';
      if (action === 'ignore') url = `/api/admin/room-reports/${reportId}/ignore`;
      if (action === 'warn') url = `/api/admin/room-reports/${reportId}/warn`;
      
      const { data } = await axios.post(`http://localhost:8800${url}`, {}, {
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

  // ✅ 4. Hàm mới để xử lý xác nhận cấm phòng từ modal
  const handleConfirmBan = async (reason) => {
    const { reportId } = modalState;
    if (!reportId) return;

    try {
      const token = localStorage.getItem('token');
      const url = `/api/admin/room-reports/${reportId}/ban-room`;
      const body = { reason };

      const { data } = await axios.post(`http://localhost:8800${url}`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data && data.success) {
        toast.success(data.msg || 'Cấm phòng thành công');
        fetchReports();
      }
    } catch (err) {
      console.error('Ban action error', err);
      toast.error(err.response?.data?.msg || 'Cấm phòng thất bại');
    } finally {
      // Đóng modal sau khi hoàn tất
      setModalState({ isOpen: false, reportId: null });
    }
  };

  return (
    <div className="AdminReports-wrapper">
      <div className="AdminReports-header">
        <h2 className="AdminReports-title">Báo cáo phòng</h2>
        {/* Có thể thêm bộ lọc hoặc tìm kiếm ở đây trong tương lai */}
      </div>
      
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
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="AdminReports-noData">
                    🎉 Không có báo cáo nào.
                  </td>
                </tr>
              ) : reports.map(r => (
                <tr key={r._id}>
                  <td>{r.room ? r.room.name : '—'}</td>
                  <td>{r.category}</td>
                  <td>{r.details || '—'}</td>
                  <td>{r.reporter ? r.reporter.username : 'Ẩn danh'}</td>
                  <td>
                    <span className={`AdminReports-badge AdminReports-badge-${r.status || 'open'}`}>
                      {r.status === 'open' && 'Mới'}
                      {r.status === 'reviewed' && 'Đã xử lý'}
                      {r.status === 'dismissed' && 'Đã bỏ qua'}
                      {!['open','reviewed','dismissed'].includes(r.status) && (r.status || '—')}
                    </span>
                  </td>
                  <td>
                    <div className="AdminReports-actionGroup">
                      <button className="AdminReports-btn" onClick={() => doAction(r._id, 'ignore')} disabled={r.status !== 'open'}>
                        Bỏ qua
                      </button>
                      <button className="AdminReports-btn AdminReports-btn-warning" onClick={() => doAction(r._id, 'warn')} disabled={r.status !== 'open'}>
                        Cảnh báo
                      </button>
                      <button className="AdminReports-btn AdminReports-btn-danger" onClick={() => doAction(r._id, 'ban')} disabled={r.status !== 'open'}>
                        Cấm phòng
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* ✅ 5. Render Modal */}
      <ConfirmBanModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, reportId: null })}
        onConfirm={handleConfirmBan}
      />
    </div>
  );
}