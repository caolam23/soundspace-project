import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';import { X, User, Mail, Hash, Lock, Clock, Calendar, BarChart2, Users, MessageSquare, Star, Info, ShieldAlert } from 'lucide-react';
import './ModalPhong.css';

const ModalPhong = ({ isOpen, onClose, room: initialRoom }) => {
  // Nếu modal không mở hoặc không có dữ liệu phòng thì không render gì cả
   const { socket } = useContext(AuthContext);
  const [room, setRoom] = useState(initialRoom);

  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  useEffect(() => {
    if (!isOpen || !initialRoom) return;

    // When modal opens, fetch freshest room details from API
    const fetchDetail = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:8800/api/admin/rooms/${initialRoom.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.success) setRoom(res.data.data);
      } catch (err) {
        console.warn('[ModalPhong] Could not fetch room detail:', err?.message || err);
      }
    };
    fetchDetail();

    const handleMembersChanged = (payload) => {
      if (String(payload.roomId) === String(initialRoom.id)) {
        setRoom(r => {
          // Do not update realtime stats if room already ended
          if (r?.status === 'ended') return r;
          return { ...r, members: payload.membersCount, statistics: { ...r?.statistics, totalJoins: payload.totalJoins, peakMembers: payload.peakMembers } };
        });
      }
    };

    const handleRoomEnded = (payload) => {
      if (payload?.roomId === initialRoom.id) {
        // Refetch final stats when room ended
        fetchDetail();
      }
    };

    if (socket) {
      socket.on('room-members-changed', handleMembersChanged);
      socket.on('room-ended', handleRoomEnded);
    }

    return () => {
      if (socket) {
        socket.off('room-members-changed', handleMembersChanged);
        socket.off('room-ended', handleRoomEnded);
      }
    };
  }, [isOpen, initialRoom, socket]);

  if (!isOpen || !room) return null;
  // Helper function để lấy text và class cho trạng thái
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

  return (
    // Lớp phủ nền mờ, click vào sẽ đóng modal
    <div className="ModalPhong-overlay" onClick={onClose}>
      {/* Container chính của modal, ngăn sự kiện click lan ra overlay */}
      <div className="ModalPhong-container" onClick={(e) => e.stopPropagation()}>

        {/* Header của Modal */}
        <div className="ModalPhong-header">
          <h3 className="ModalPhong-title">Chi Tiết Phòng: {room.name}</h3>
          <button className="ModalPhong-closeButton" onClick={onClose} title="Đóng">
            <X size={24} />
          </button>
        </div>

        {/* Nội dung chi tiết */}
        <div className="ModalPhong-content">
          <div className="ModalPhong-infoGrid">
            {/* Thông tin Host */}
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

            {/* Cấu hình phòng */}
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

            {/* Trạng thái và thời gian */}
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

          {/* Lý do cấm (nếu có) */}
          {room.isBanned && (
            <div className="ModalPhong-banReason">
                <ShieldAlert size={20} />
                <div>
                    <strong>Lý do cấm:</strong>
                    <p>{room.banReason}</p>
                </div>
            </div>
          )}

          {/* Mô tả (nếu có) */}
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

          {/* Phần thống kê */}
          <div className="ModalPhong-statsSection">
            <h4 className="ModalPhong-statsTitle">
              <BarChart2 size={20} /> Thống Kê
            </h4>
            <div className="ModalPhong-statsGrid">
               <div className="ModalPhong-statItem">
                  <Users />
                  <span>
                    Tổng lượt tham gia: <strong>{(() => {
                      const s = room.statistics?.totalJoins;
                      if (typeof s === 'number' && s > 0) return s;
                      return (room.members && room.members.length) || 0;
                    })()}</strong>
                  </span>
                </div>
                <div className="ModalPhong-statItem">
                  <Clock />
                  <span>
                    Tổng thời gian live: <strong>{(() => {
                      const dur = room.statistics?.totalDuration;
                      if (typeof dur !== 'number' || isNaN(dur)) return (room.statistics?.totalDuration || '0 phút');
                      const totalSeconds = Math.max(0, Math.floor(dur));
                      const minutes = Math.floor(totalSeconds / 60);
                      const seconds = totalSeconds % 60;
                      const secStr = String(seconds).padStart(2, '0');
                      return `${minutes} phút ${secStr} giây`;
                    })()}</strong>
                  </span>
                </div>
                <div className="ModalPhong-statItem">
                  <MessageSquare />
                  <span>Tổng tin nhắn: <strong>{room.statistics?.totalMessages || 0}</strong></span>
                </div>
            </div>
          </div>

          {/* Nút Join vào phòng */}
          <div className="ModalPhong-actionSection">
            <button className="ModalPhong-joinButton" onClick={() => {
              // Logic join phòng sẽ được thêm vào đây
              console.log('Join room:', room.id);
            }}>
              <Users size={20} />
              <span>Tham Gia Phòng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalPhong;