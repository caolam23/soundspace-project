import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import './QuanLyBinhLuan.css';
import { Trash2, Shield, CheckSquare, Search, AlertCircle, CheckCircle, Users } from 'react-feather';
import api from '../../services/api';

// =================================================================
// ✨ CUSTOM HOOK: Xử lý logic đếm ngược thời gian
// Tách riêng logic này giúp component chính gọn gàng hơn.
// =================================================================
const useCountdown = (targetDate) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!targetDate) return;

    const targetTime = new Date(targetDate).getTime();
    if (isNaN(targetTime)) return;

    // Xử lý trường hợp bị cấm vĩnh viễn (năm 9999)
    if (new Date(targetDate).getFullYear() > 9000) {
        setTimeLeft('Vĩnh viễn');
        setIsFinished(false);
        return; // Dừng lại, không cần đếm ngược
    }

    // Thiết lập một interval để cập nhật thời gian mỗi giây
    const intervalId = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetTime - now;

      if (distance < 0) {
        clearInterval(intervalId);
        setTimeLeft('00:00:00');
        setIsFinished(true);
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        let timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Chỉ hiển thị ngày nếu thời gian còn lại lớn hơn 1 ngày
        if (days > 0) {
            timeString = `${days} ngày, ${timeString}`;
        }

        setTimeLeft(timeString);
        setIsFinished(false);
      }
    }, 1000);

    // Dọn dẹp interval khi component unmount
    return () => clearInterval(intervalId);
  }, [targetDate]);

  return { timeLeft, isFinished };
};

// =================================================================
// 🎨 COMPONENT CON: Hiển thị một hàng trong bảng người dùng bị giới hạn
// =================================================================
const MutedUserRow = ({ user }) => {
    const { timeLeft, isFinished } = useCountdown(user.muteExpiresAt);

    return (
        <tr>
            <td>
                <div className="user-info">
                    <img src={user.avatar || 'https://i.pravatar.cc/40'} alt={user.username} className="user-avatar" />
                    <span>{user.username}</span>
                </div>
            </td>
            <td><span className="reason-badge small">{user.reason}</span></td>
            <td className="countdown-cell">
                {isFinished ? (
                    <span className="status-active"><CheckCircle size={16} /> Hoạt động</span>
                ) : (
                    <span className="countdown-timer">{timeLeft}</span>
                )}
            </td>
            <td>
                 {isFinished ? (
                    <span className="status-active">Đã hết hạn</span>
                ) : (
                    <span className="status-muted">Đang bị giới hạn</span>
                )}
            </td>
        </tr>
    );
};

// =================================================================
// 🚀 COMPONENT CHÍNH: Trang quản lý bình luận
// =================================================================
export default function QuanLyBinhLuan() {
  const { socket, user } = useContext(AuthContext);
  
  // State cho cả 2 khu vực
  const [reports, setReports] = useState([]);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [isLoadingMuted, setIsLoadingMuted] = useState(true);
  
  // State cho việc xử lý và lọc
  const [muteDurations, setMuteDurations] = useState({});
  const [mutedUsersFilter, setMutedUsersFilter] = useState('');

  // Fetch dữ liệu ban đầu khi component được tải
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingReports(true);
      setIsLoadingMuted(true);
      
      try {
        const [reportRes, mutedRes] = await Promise.all([
          api.get('/admin/reports?status=pending'),
          api.get('/admin/muted-users')
        ]);
        setReports(reportRes.data);
        setMutedUsers(mutedRes.data);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu ban đầu:", error);
      } finally {
        setIsLoadingReports(false);
        setIsLoadingMuted(false);
      }
    };

    fetchInitialData();
  }, []);

  // Lắng nghe các sự kiện real-time từ server
  useEffect(() => {
    if (socket && user?.role === 'admin') {
      socket.emit('admin-join');

      // Có báo cáo mới -> thêm vào đầu danh sách
      const handleNewReport = (newReport) => {
        setReports(prev => [newReport, ...prev.filter(r => r._id !== newReport._id)]);
      };

      // Có người dùng bị mute -> cập nhật danh sách real-time
      const handleUserMuted = (mutedUserDetail) => {
          setMutedUsers(prev => {
              const existingUserIndex = prev.findIndex(u => u._id === mutedUserDetail._id);
              if (existingUserIndex > -1) {
                  // Cập nhật user đã có trong danh sách
                  const updatedList = [...prev];
                  updatedList[existingUserIndex] = mutedUserDetail;
                  return updatedList;
              } else {
                  // Thêm user mới vào đầu danh sách
                  return [mutedUserDetail, ...prev];
              }
          });
      };

      socket.on('new-comment-report', handleNewReport);
      socket.on('user-mute-updated', handleUserMuted);

      // Dọn dẹp listener khi component unmount
      return () => {
        socket.off('new-comment-report', handleNewReport);
        socket.off('user-mute-updated', handleUserMuted);
      };
    }
  }, [socket, user]);
  
  // Các hàm xử lý hành động của Admin
  const handleDurationSelect = (reportId, duration) => {
    setMuteDurations(prev => ({ ...prev, [reportId]: duration }));
  };

  const handleMuteUser = (report) => {
    if (!socket) return;
    const durationMinutes = muteDurations[report._id];
    if (typeof durationMinutes === 'undefined') {
        alert("Vui lòng chọn thời gian giới hạn trước khi xác nhận.");
        return;
    }
    socket.emit('admin-mute-user', {
      reportedUserId: report.reportedUser._id,
      durationMinutes: durationMinutes,
      reportId: report._id,
    });
    // Xóa report khỏi danh sách chờ xử lý ngay lập tức
    setReports(prev => prev.filter(r => r._id !== report._id));
  };
  
  const handleDeleteComment = (report) => {
    if (!socket) return;
      socket.emit('admin-delete-comment', {
        roomId: report.roomId,
        commentId: report.messageId,
        reportId: report._id,
      });
      setReports(prev => prev.filter(r => r._id !== report._id));
  };

  const handleIgnore = async (reportId) => {
    try {
      await api.patch(`/admin/reports/${reportId}`, { status: 'resolved-ignored' });
      setReports(prev => prev.filter(r => r._id !== reportId));
    } catch (error) {
      console.error("Lỗi khi bỏ qua báo cáo:", error);
    }
  };

  const muteOptions = [
    { label: '5 phút', value: 5 }, { label: '15 phút', value: 15 },
    { label: '1 giờ', value: 60 }, { label: 'Vĩnh viễn', value: -1 },
  ];

  // Lọc danh sách người dùng bị giới hạn dựa trên ô tìm kiếm
  const filteredMutedUsers = useMemo(() => 
    mutedUsers.filter(u => u.username.toLowerCase().includes(mutedUsersFilter.toLowerCase())),
    [mutedUsers, mutedUsersFilter]
  );

  return (
    <div className="quanly-binhluan-container">
        {/* ================================================================= */}
        {/* KHU VỰC 1: DANH SÁCH NGƯỜI DÙNG BỊ GIỚI HẠN                   */}
        {/* ================================================================= */}
        <div className="section-container">
            <div className="section-header">
                <Users size={24} />
                <h2>Danh sách người dùng bị giới hạn ({filteredMutedUsers.length})</h2>
            </div>
             <div className="filter-container">
                <Search size={18} className="search-icon"/>
                <input 
                    type="text"
                    placeholder="Tìm kiếm theo tên người dùng..."
                    className="filter-input"
                    value={mutedUsersFilter}
                    onChange={(e) => setMutedUsersFilter(e.target.value)}
                />
            </div>
            <div className="table-wrapper">
                {isLoadingMuted ? <p>Đang tải danh sách...</p> : (
                    <table className="muted-users-table">
                        <thead>
                            <tr>
                                <th>Người dùng</th>
                                <th>Lý do</th>
                                <th>Thời gian còn lại</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMutedUsers.length > 0 ? (
                                filteredMutedUsers.map(u => <MutedUserRow key={u._id} user={u} />)
                            ) : (
                                <tr><td colSpan="4" className="no-data">Không có người dùng nào đang bị giới hạn.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* ================================================================= */}
        {/* KHU VỰC 2: CÁC BÁO CÁO CẦN XỬ LÝ                                 */}
        {/* ================================================================= */}
        <div className="section-container">
             <div className="section-header">
                <AlertCircle size={24}/>
                <h2>Báo cáo đang chờ xử lý ({reports.length})</h2>
            </div>
            <div className="reports-list">
                {isLoadingReports ? <p>Đang tải báo cáo...</p> :
                 reports.length === 0 ? (
                  <p className="no-reports">Không có báo cáo nào đang chờ xử lý. 🎉</p>
                ) : (
                  reports.map(report => (
                    <div key={report._id} className="report-card">
                      <div className="report-header">
                        <span className="reason-badge">{report.reason}</span>
                        <span className="report-time">{new Date(report.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="report-comment">"{report.messageContent}"</p>
                      <div className="report-details">
                         <p><strong>Người báo cáo:</strong> {report.reporter.username}</p>
                         <p><strong>Người bị báo cáo:</strong> {report.reportedUser.username}</p>
                      </div>
                      
                      <div className="report-actions-container">
                        <div className="mute-section">
                            <p className="mute-section-title">Hành động giới hạn chat:</p>
                            <div className="mute-options">
                               {muteOptions.map(opt => (
                                 <button key={opt.value} className={`duration-btn ${muteDurations[report._id] === opt.value ? 'active' : ''}`}
                                   onClick={() => handleDurationSelect(report._id, opt.value)}>
                                   {opt.label}
                                 </button>
                               ))}
                            </div>
                            <button onClick={() => handleMuteUser(report)} className="action-btn mute-btn-confirm">
                                <Shield size={16} /> Xác nhận Giới hạn
                            </button>
                        </div>
                        <div className="other-actions">
                            <button onClick={() => handleDeleteComment(report)} className="action-btn delete-btn"><Trash2 size={16} /> Xóa bình luận</button>
                            <button onClick={() => handleIgnore(report._id)} className="action-btn ignore-btn"><CheckSquare size={16} /> Bỏ qua</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
            </div>
        </div>
    </div>
  );
}