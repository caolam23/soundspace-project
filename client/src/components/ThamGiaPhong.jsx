// client/src/components/ThamGiaPhong.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock } from 'react-feather';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { toastConfig } from '../services/toastConfig';
import './ThamGiaPhong.css';

function ThamGiaPhong() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setRoomCode('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setRoomCode('');
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (value.length <= 6) {
      setRoomCode(value);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    
    if (!roomCode || roomCode.length !== 6) {
      toast.error('Vui lòng nhập đúng 6 ký tự mã phòng!', toastConfig);
      return;
    }

    if (!user) {
      toast.error('Vui lòng đăng nhập để tham gia phòng!', toastConfig);
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Tìm phòng theo roomCode
      const searchRes = await axios.get(
        `http://localhost:8800/api/rooms/search-by-code/${roomCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const room = searchRes.data.room;

      if (!room) {
        toast.error('Không tìm thấy phòng với mã này!', {
          ...toastConfig,
          icon: '🔍',
        });
        setIsLoading(false);
        return;
      }

      // Join phòng
      await axios.post(
        `http://localhost:8800/api/rooms/${room._id}/join`,
        { roomCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Đang vào phòng...', {
        ...toastConfig,
        icon: '🎉',
      });

      handleCloseModal();
      
      navigate(`/room/${room._id}`, {
        state: { fromJoin: true },
        replace: true
      });

    } catch (err) {
      console.error('Lỗi khi tham gia phòng:', err);
      const errorMsg = err.response?.data?.msg || 'Không thể tham gia phòng. Vui lòng thử lại.';
      toast.error(errorMsg, toastConfig);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleOpenModal} className="ThamGiaPhong-button-header">
        <Lock className="ThamGiaPhong-icon" size={18} />
        <span className="ThamGiaPhong-text">Tham gia phòng</span>
      </button>

      {isModalOpen && (
        <div className="ThamGiaPhong-modal-overlay" onClick={handleCloseModal}>
          <div className="ThamGiaPhong-modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleCloseModal} className="ThamGiaPhong-modal-close">
              <X size={24} />
            </button>

            <div className="ThamGiaPhong-modal-header">
              <div className="ThamGiaPhong-lock-icon">
                <Lock size={40} />
              </div>
              <h2 className="ThamGiaPhong-modal-title">Tham gia phòng riêng tư</h2>
              <p className="ThamGiaPhong-modal-subtitle">
                Nhập mã 6 ký tự để vào phòng
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="ThamGiaPhong-form">
              <div className="ThamGiaPhong-input-group">
                <input
                  type="text"
                  value={roomCode}
                  onChange={handleInputChange}
                  placeholder="VD: ABC123"
                  className="ThamGiaPhong-input"
                  maxLength={6}
                  autoFocus
                  disabled={isLoading}
                />
                <div className="ThamGiaPhong-input-hint">
                  {roomCode.length}/6 ký tự
                </div>
              </div>

              <button 
                type="submit" 
                className="ThamGiaPhong-submit-btn"
                disabled={isLoading || roomCode.length !== 6}
              >
                {isLoading ? (
                  <>
                    <div className="ThamGiaPhong-spinner" />
                    <span>Đang tham gia...</span>
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    <span>Tham gia ngay</span>
                  </>
                )}
              </button>
            </form>

            <div className="ThamGiaPhong-modal-footer">
              <p>Mã phòng được cung cấp bởi chủ phòng</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ThamGiaPhong;