// client/src/components/RoomCard.jsx
import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { X, Lock } from 'react-feather';
import { toast } from 'react-toastify';
import { toastConfig } from '../services/toastConfig';
import "./RoomCard.css";
import { AuthContext } from "../contexts/AuthContext";
import socket from "../services/socket";

function RoomCard({ room }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [waiting, setWaiting] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState(null);
  const [resultMessage, setResultMessage] = useState("");
  const [acceptedBox, setAcceptedBox] = useState(false);
  const [acceptedRoomIdNav, setAcceptedRoomIdNav] = useState(null);
  
  // State cho modal nhập mã phòng
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinRoom = async () => {
    const token = localStorage.getItem("token");
    if (!user || !token) {
      toast.error("Vui lòng đăng nhập để tham gia!", toastConfig);
      return;
    }

    try {
      if (room.privacy === "public") {
        await axios.post(
          `http://localhost:8800/api/rooms/${room._id}/join`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        navigate(`/room/${room._id}`, { 
          state: { fromJoin: true },
          replace: true 
        });
      } else if (room.privacy === "private") {
        // Mở modal nhập mã phòng thay vì dùng prompt
        setIsCodeModalOpen(true);
      } else if (room.privacy === "manual") {
        socket.emit("request-to-join", {
          roomId: room._id,
          requester: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
          },
        });

        setPendingRoomId(room._id);
        setWaiting(true);
      }
    } catch (err) {
      console.error("Lỗi khi tham gia phòng:", err);
      toast.error(err.response?.data?.msg || "Không thể tham gia phòng. Vui lòng thử lại.", toastConfig);
    }
  };

  const handleCloseCodeModal = () => {
    setIsCodeModalOpen(false);
    setRoomCode('');
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (value.length <= 6) {
      setRoomCode(value);
    }
  };

  const handleSubmitCode = async (e) => {
    e.preventDefault();
    
    if (!roomCode || roomCode.length !== 6) {
      toast.error('Vui lòng nhập đúng 6 ký tự mã phòng!', toastConfig);
      return;
    }

    setIsJoining(true);

    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `http://localhost:8800/api/rooms/${room._id}/join`,
        { roomCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Đang vào phòng...', {
        ...toastConfig,
        icon: '🎉',
      });

      handleCloseCodeModal();
      
      navigate(`/room/${room._id}`, { 
        state: { fromJoin: true },
        replace: true 
      });

    } catch (err) {
      console.error('Lỗi khi tham gia phòng:', err);
      const errorMsg = err.response?.data?.msg || 'Mã phòng không đúng. Vui lòng thử lại.';
      toast.error(errorMsg, toastConfig);
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    const handleAccepted = ({ roomId: acceptedRoomId }) => {
      if (!pendingRoomId) return;
      if (acceptedRoomId === pendingRoomId) {
        setWaiting(false);
        setPendingRoomId(null);
        setAcceptedRoomIdNav(acceptedRoomId);
        setAcceptedBox(true);
      }
    };

    const handleDenied = ({ message, roomId: deniedRoomId }) => {
      if (!pendingRoomId) return;
      if (deniedRoomId && deniedRoomId !== pendingRoomId) return;
      setWaiting(false);
      setPendingRoomId(null);
      setResultMessage(message || "Yêu cầu tham gia bị từ chối.");
      setTimeout(() => setResultMessage(""), 10000);
    };

    socket.on("join-request-accepted", handleAccepted);
    socket.on("join-request-denied", handleDenied);

    return () => {
      socket.off("join-request-accepted", handleAccepted);
      socket.off("join-request-denied", handleDenied);
    };
  }, [pendingRoomId]);

  return (
    <>
      {waiting && (
        <div className="join-wait-overlay">
          <div className="join-wait-box">
            <div className="spinner" />
            <div className="join-wait-text">Đang chờ chủ phòng xác nhận...</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Vui lòng chờ trong giây lát
            </div>
          </div>
        </div>
      )}

      {resultMessage && <div className="join-result-msg">{resultMessage}</div>}

      {acceptedBox && (
        <div className="join-wait-overlay">
          <div className="join-accepted-box modal-black">
            <div style={{ fontSize: 18, fontWeight: 800 }}>Yêu cầu được chấp nhận!</div>
            <div style={{ marginTop: 8, color: "var(--text-secondary)" }}>
              Bạn sẽ được chuyển vào phòng.
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                className="accepted-btn"
                onClick={() => {
                  setAcceptedBox(false);
                  if (acceptedRoomIdNav) {
                    navigate(`/room/${acceptedRoomIdNav}`, { 
                      state: { fromApproval: true },
                      replace: true 
                    });
                  }
                }}
              >
                Vào phòng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nhập mã phòng */}
      {isCodeModalOpen && (
        <div className="ThamGiaPhong-modal-overlay" onClick={handleCloseCodeModal}>
          <div className="ThamGiaPhong-modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleCloseCodeModal} className="ThamGiaPhong-modal-close">
              <X size={24} />
            </button>

            <div className="ThamGiaPhong-modal-header">
              <div className="ThamGiaPhong-lock-icon">
                <Lock size={40} />
              </div>
              <h2 className="ThamGiaPhong-modal-title">Phòng: {room.name}</h2>
              <p className="ThamGiaPhong-modal-subtitle">
                Nhập mã 6 ký tự để vào phòng
              </p>
            </div>

            <form onSubmit={handleSubmitCode} className="ThamGiaPhong-form">
              <div className="ThamGiaPhong-input-group">
                <input
                  type="text"
                  value={roomCode}
                  onChange={handleInputChange}
                  placeholder="VD: ABC123"
                  className="ThamGiaPhong-input"
                  maxLength={6}
                  autoFocus
                  disabled={isJoining}
                />
                <div className="ThamGiaPhong-input-hint">
                  {roomCode.length}/6 ký tự
                </div>
              </div>

              <button 
                type="submit" 
                className="ThamGiaPhong-submit-btn"
                disabled={isJoining || roomCode.length !== 6}
              >
                {isJoining ? (
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

      {/* Thẻ card chính */}
      <div className="room-card">
        <img
          className="room-card-image"
          src={room.coverImage}
          alt={`Ảnh bìa của phòng ${room.name}`}
        />
        <div className="room-card-content">
          <h3>{room.name}</h3>
          <p>{room.description}</p>
          <div className="room-card-actions">
            <button onClick={handleJoinRoom} className="btn-join-session">
              Tham gia
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default RoomCard;