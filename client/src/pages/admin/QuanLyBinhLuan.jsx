import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import './QuanLyBinhLuan.css';
import { Trash2, Shield, CheckSquare, Search, AlertCircle, CheckCircle, Users } from 'react-feather';
import api from '../../services/api';

// =================================================================
// ✨ COMPONENT MỚI: Tái sử dụng cho việc phân trang
// =================================================================
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) {
        return null; // Không hiển thị phân trang nếu chỉ có 1 trang
    }

    const handlePageClick = (page) => {
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    };

    // Tạo ra các nút số trang
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(
            <button
                key={i}
                onClick={() => handlePageClick(i)}
                className={`pagination-button ${currentPage === i ? 'active' : ''}`}
            >
                {i}
            </button>
        );
    }

    return (
        <div className="pagination-container">
            <button
                onClick={() => handlePageClick(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-button"
            >
                Trước
            </button>
            {pageNumbers}
            <button
                onClick={() => handlePageClick(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-button"
            >
                Sau
            </button>
        </div>
    );
};


// =================================================================
// ✨ CUSTOM HOOK: Xử lý logic đếm ngược thời gian
// =================================================================
const useCountdown = (targetDate) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        if (!targetDate) return;

        const targetTime = new Date(targetDate).getTime();
        if (isNaN(targetTime)) return;

        if (new Date(targetDate).getFullYear() > 9000) {
            setTimeLeft('Vĩnh viễn');
            setIsFinished(false);
            return;
        }

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

                if (days > 0) {
                    timeString = `${days} ngày, ${timeString}`;
                }

                setTimeLeft(timeString);
                setIsFinished(false);
            }
        }, 1000);

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

    const [reports, setReports] = useState([]);
    const [mutedUsers, setMutedUsers] = useState([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);
    const [isLoadingMuted, setIsLoadingMuted] = useState(true);

    const [muteDurations, setMuteDurations] = useState({});
    const [mutedUsersFilter, setMutedUsersFilter] = useState('');

    // State cho phân trang báo cáo
    const [currentPage, setCurrentPage] = useState(1);
    const REPORTS_PER_PAGE = 6; // Hiển thị 6 báo cáo mỗi trang (2 hàng x 3 cột)

    // Fetch dữ liệu ban đầu
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

    // Lắng nghe sự kiện real-time
    useEffect(() => {
        if (socket && user?.role === 'admin') {
            socket.emit('admin-join');

            const handleNewReport = (newReport) => {
                setReports(prev => [newReport, ...prev.filter(r => r._id !== newReport._id)]);
            };

            const handleUserMuted = (mutedUserDetail) => {
                setMutedUsers(prev => {
                    const existingUserIndex = prev.findIndex(u => u._id === mutedUserDetail._id);
                    if (existingUserIndex > -1) {
                        const updatedList = [...prev];
                        updatedList[existingUserIndex] = mutedUserDetail;
                        return updatedList;
                    } else {
                        return [mutedUserDetail, ...prev];
                    }
                });
            };

            socket.on('new-comment-report', handleNewReport);
            socket.on('user-mute-updated', handleUserMuted);

            return () => {
                socket.off('new-comment-report', handleNewReport);
                socket.off('user-mute-updated', handleUserMuted);
            };
        }
    }, [socket, user]);

    // Tính toán dữ liệu cho trang hiện tại
    const currentReports = useMemo(() => {
        const firstPageIndex = (currentPage - 1) * REPORTS_PER_PAGE;
        const lastPageIndex = firstPageIndex + REPORTS_PER_PAGE;
        return reports.slice(firstPageIndex, lastPageIndex);
    }, [reports, currentPage]);

    // Tính tổng số trang
    const totalPages = Math.ceil(reports.length / REPORTS_PER_PAGE);
    
    // Tự động về trang 1 nếu dữ liệu thay đổi làm giảm tổng số trang
     useEffect(() => {
        const newTotalPages = Math.ceil(reports.length / REPORTS_PER_PAGE);
        if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages);
        } else if (reports.length === 0) {
            setCurrentPage(1);
        }
    }, [reports.length, currentPage]);


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
                    <Search size={18} className="search-icon" />
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
                    <AlertCircle size={24} />
                    <h2>Báo cáo đang chờ xử lý ({reports.length})</h2>
                </div>
                <div className="reports-list">
                    {isLoadingReports ? <p>Đang tải báo cáo...</p> :
                        reports.length === 0 ? (
                            <p className="no-reports">Không có báo cáo nào đang chờ xử lý. 🎉</p>
                        ) : (
                            currentReports.map(report => (
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
                
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}