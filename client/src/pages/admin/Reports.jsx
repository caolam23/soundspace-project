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

  // server emits several room-end related events in different places:
  // - 'room-ended' is emitted to sockets inside the room (payload may not include roomId)
  // - 'room-ended-homepage' is emitted globally and includes { roomId }
  // - 'room-deleted' may be emitted when admin deletes a room
    // Register handlers with event name so we can decide which events are owner-initiated
    const makeHandler = (eventName) => (payload) => {
      // Only consider owner-initiated end events. Logic:
      // - 'room-ended-homepage' and 'room-members-changed' are emitted in owner endSession
      // - 'room-ended' may be emitted for different reasons; ignore if payload.reason signals admin/host-block action
      const adminReasons = ['admin-banned', 'host-blocked'];
      if (eventName === 'room-ended') {
        if (payload && payload.reason && adminReasons.includes(payload.reason)) {
          console.log(`[Reports] Ignoring room-ended from admin action (${payload.reason})`);
          return;
        }
        // otherwise treat as owner-ended
      }

      if (eventName === 'room-deleted' || eventName === 'room-banned') {
        // admin deletion/banning — ignore because user asked to only count owner-ending
        console.log(`[Reports] Ignoring ${eventName} (admin action)`);
        return;
      }

      // Delegate to shared refresh handler
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
      {/* Dev-only: simulate room-end events to test real-time dedupe */}
      {import.meta.env.VITE_DEV_SIM === 'true' && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => {
              const fake = { roomId: prompt('RoomId to simulate', '') };
              // emit locally so socket.onAny will also log it
              socket.emit('room-ended-homepage', fake);
              // also call handler function by emitting the same event
            }}
            style={{ padding: '6px 10px', borderRadius: 6, marginRight: 8 }}
          >Simulate room-ended-homepage</button>
        </div>
      )}
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