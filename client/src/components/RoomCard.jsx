// client/src/components/RoomCard.jsx
import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./RoomCard.css";
import { AuthContext } from "../contexts/AuthContext"; // Lấy user từ context
import socket from "../services/socket"; // Socket instance

function RoomCard({ room }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext); // Lấy thông tin user hiện tại
  const [waiting, setWaiting] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState(null);
  const [resultMessage, setResultMessage] = useState("");
  const [acceptedBox, setAcceptedBox] = useState(false);
  const [acceptedRoomIdNav, setAcceptedRoomIdNav] = useState(null);

  const handleJoinRoom = async () => {
    const token = localStorage.getItem("token");
    if (!user || !token) {
      // small inline message could be implemented; for now use alert for unauthenticated
      alert("Vui lòng đăng nhập để tham gia!");
      return;
    }

    try {
      // 1. Phòng công khai (public)
      if (room.privacy === "public") {
        await axios.post(
          `http://localhost:8800/api/rooms/${room._id}/join`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        navigate(`/room/${room._id}`);
      }

      // 2. Phòng riêng tư (private)
      else if (room.privacy === "private") {
        const roomCode = prompt("Phòng này yêu cầu mã. Vui lòng nhập mã phòng:");
        if (roomCode) {
          await axios.post(
            `http://localhost:8800/api/rooms/${room._id}/join`,
            { roomCode },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          navigate(`/room/${room._id}`);
        }
      }

      // 3. Phòng cần xét duyệt (manual) → PHÁT SOCKET
      else if (room.privacy === "manual") {
        const requesterInfo = {
          _id: user._id,
          username: user.username,
          avatar: user.avatar,
        };

        socket.emit("request-to-join", {
          roomId: room._id,
          requester: requesterInfo,
        });

        // Show non-system waiting overlay
        setPendingRoomId(room._id);
        setWaiting(true);
      }
    } catch (err) {
      console.error("Lỗi khi tham gia phòng:", err);
      // fallback small message
      alert(err.response?.data?.msg || "Không thể tham gia phòng. Vui lòng thử lại.");
    }
  };

  useEffect(() => {
    const handleAccepted = ({ roomId: acceptedRoomId }) => {
      if (!pendingRoomId) return;
      if (acceptedRoomId === pendingRoomId) {
        setWaiting(false);
        setPendingRoomId(null);
        // show accepted box with explicit "Vào phòng" button
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
      // hide message after 3s
      setTimeout(() => setResultMessage(""), 3000);
    };

    socket.on("join-request-accepted", handleAccepted);
    socket.on("join-request-denied", handleDenied);

    return () => {
      socket.off("join-request-accepted", handleAccepted);
      socket.off("join-request-denied", handleDenied);
    };
  }, [pendingRoomId, navigate]);

  return (
    <>
      {waiting && (
        <div className="join-wait-overlay">
          <div className="join-wait-box">
            <div className="spinner" />
            <div className="join-wait-text">Đang chờ chủ phòng xác nhận...</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Vui lòng chờ trong giây lát</div>
          </div>
        </div>
      )}
      {resultMessage && <div className="join-result-msg">{resultMessage}</div>}
      {acceptedBox && (
        <div className="join-wait-overlay">
          <div className="join-accepted-box modal-black">
            <div style={{ fontSize: 18, fontWeight: 800 }}>Yêu cầu được chấp nhận!</div>
            <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>Bạn sẽ được chuyển vào phòng.</div>
            <div style={{ marginTop: 16 }}>
              <button className="accepted-btn" onClick={() => {
                setAcceptedBox(false);
                if (acceptedRoomIdNav) navigate(`/room/${acceptedRoomIdNav}`);
              }}>Vào phòng</button>
            </div>
          </div>
        </div>
      )}
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