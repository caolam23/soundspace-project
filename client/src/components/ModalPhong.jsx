import React from 'react';
import { X, User, Mail, Hash, Lock, Clock, Calendar, BarChart2, Users, MessageSquare, Star, Info, ShieldAlert, Ghost } from 'lucide-react';
import './ModalPhong.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const ModalPhong = ({ isOpen, onClose, room }) => {
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = React.useState(false);

  // If the modal isn't open or there's no room data, don't render anything
  if (!isOpen || !room) {
    return null;
  }

  // Helper function to get status text and class
  const getStatusInfo = (room) => {
    if (room.isBanned) return { text: 'Bị cấm', className: 'ModalPhong-status-banned' };
    switch (room.status) {
      case 'waiting':
        return { text: 'Đang chờ', className: 'ModalPhong-status-waiting' };
      case 'live':
        return { text: 'Hoạt động', className: 'ModalPhong-status-live' };
      case 'ended':
        return { text: 'Đã kết thúc', className: 'ModalPhong-status-ended' };
      default:
        return { text: 'Không xác định', className: 'ModalPhong-status-ended' };
    }
  };

  const statusInfo = getStatusInfo(room);

  // ============================================
  // 👻 HANDLER JOIN ROOM IN GHOST MODE
  // ============================================
  const handleGhostJoin = async () => {
    // Check if the room has ended
    if (room.status === 'ended') {
      toast.error('Phòng đã kết thúc, không thể tham gia!');
      return;
    }

    if (room.isBanned) {
      toast.error('Phòng đã bị cấm!');
      return;
    }

    try {
      setIsJoining(true);
      const token = localStorage.getItem('token');

      // Call the ghost join API
      const { data } = await axios.post(
        `http://localhost:8800/api/rooms/${room.id}/ghost-join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.isGhostMode) {
        toast.success('👻 Đang vào phòng ở chế độ Ghost...', {
          icon: '👻',
          autoClose: 2000
        });

        // Redirect to RoomPage with special state
        navigate(`/room/${room.id}`, {
          state: {
            isGhostMode: true, // ✅ Important flag
            fromAdmin: true,
            returnToAdmin: true
          },
          replace: false
        });

        // Close the modal
        onClose();
      }
    } catch (err) {
      console.error('❌ Lỗi ghost join:', err);
      toast.error(err.response?.data?.msg || 'Không thể tham gia phòng ở chế độ ghost');
    } finally {
      setIsJoining(false);
    }
  };

  // ❌ The redundant line that was here has been removed.

  return (
    <div className="ModalPhong-overlay" onClick={onClose}>
      <div className="ModalPhong-container" onClick={(e) => e.stopPropagation()}>

        {/* Modal Header */}
        <div className="ModalPhong-header">
          <h3 className="ModalPhong-title">Chi Tiết Phòng: {room.name}</h3>
          <button className="ModalPhong-closeButton" onClick={onClose} title="Đóng">
            <X size={24} />
          </button>
        </div>

        {/* Detailed Content */}
        <div className="ModalPhong-content">
          <div className="ModalPhong-infoGrid">
            {/* Host Info */}
            <div className="ModalPhong-infoItem">
              <User className="ModalPhong-infoIcon" />
              <strong>Host:</strong>
              <span>{room.host}</span>
            </div>
            <div className="ModalPhong-infoItem">
              <Mail className="ModalPhong-infoIcon" />
              <strong>Email Host:</strong>
              <span>{room.hostEmail}</span>
            </div>

            {/* Room Config */}
            <div className="ModalPhong-infoItem">
              <Lock className="ModalPhong-infoIcon" />
              <strong>Riêng tư:</strong>
              <span>{
                room.privacy === 'public' ? 'Công khai' :
                room.privacy === 'manual' ? 'Phê duyệt' : 'Riêng tư'
              }</span>
            </div>
            {room.roomCode && (
              <div className="ModalPhong-infoItem">
                <Hash className="ModalPhong-infoIcon" />
                <strong>Mã phòng:</strong>
                <span className="ModalPhong-code">{room.roomCode}</span>
              </div>
            )}

            {/* Status and Time */}
            <div className="ModalPhong-infoItem">
              <Star className="ModalPhong-infoIcon" />
              <strong>Trạng thái:</strong>
              <span className={`ModalPhong-status ${statusInfo.className}`}>
                {statusInfo.text}
              </span>
            </div>
            <div className="ModalPhong-infoItem">
              <Calendar className="ModalPhong-infoIcon" />
              <strong>Ngày tạo:</strong>
              <span>{new Date(room.createdAt).toLocaleString('vi-VN')}</span>
            </div>
            {room.startedAt && (
              <div className="ModalPhong-infoItem">
                <Clock className="ModalPhong-infoIcon" />
                <strong>Bắt đầu:</strong>
                <span>{new Date(room.startedAt).toLocaleString('vi-VN')}</span>
              </div>
            )}
            {room.endedAt && (
              <div className="ModalPhong-infoItem">
                <Clock className="ModalPhong-infoIcon" />
                <strong>Kết thúc:</strong>
                <span>{new Date(room.endedAt).toLocaleString('vi-VN')}</span>
              </div>
            )}
          </div>

          {/* Ban Reason (if any) */}
          {room.isBanned && (
            <div className="ModalPhong-banReason">
              <ShieldAlert size={20} />
              <div>
                <strong>Lý do cấm:</strong>
                <p>{room.banReason}</p>
              </div>
            </div>
          )}

          {/* Description (if any) */}
          {room.description && (
            <div className="ModalPhong-description">
              <Info size={20} />
              <div>
                <strong>Mô tả phòng:</strong>
                <p>{room.description}</p>
              </div>
            </div>
          )}

          <hr className="ModalPhong-divider" />

          {/* Statistics Section */}
          <div className="ModalPhong-statsSection">
            <h4 className="ModalPhong-statsTitle">
              <BarChart2 size={20} /> Thống Kê
            </h4>
            <div className="ModalPhong-statsGrid">
              <div className="ModalPhong-statItem">
                <Users />
                <span>Tổng lượt tham gia: <strong>{room.statistics?.totalJoins || 0}</strong></span>
              </div>
              <div className="ModalPhong-statItem">
                <Clock />
                <span>Tổng thời gian live: <strong>{room.statistics?.totalLiveTime || '0 phút'}</strong></span>
              </div>
              <div className="ModalPhong-statItem">
                <MessageSquare />
                <span>Tổng tin nhắn: <strong>{room.statistics?.totalMessages || 0}</strong></span>
              </div>
            </div>
          </div>

          {/* Ghost Mode Join Button */}
          <div className="ModalPhong-actionSection">
            <button
              className="ModalPhong-joinButton"
              onClick={handleGhostJoin}
              disabled={isJoining || room.status === 'ended' || room.isBanned}
              style={{
                opacity: (isJoining || room.status === 'ended' || room.isBanned) ? 0.5 : 1,
                cursor: (isJoining || room.status === 'ended' || room.isBanned) ? 'not-allowed' : 'pointer'
              }}
            >
              <Ghost size={20} />
              <span>{isJoining ? 'Đang vào...' : ' Tham Gia phòng'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalPhong;