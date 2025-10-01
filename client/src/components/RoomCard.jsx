// client/src/components/RoomCard.jsx
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./RoomCard.css";
import { AuthContext } from "../contexts/AuthContext"; // Lấy user từ context
import socket from "../services/socket"; // Socket instance

function RoomCard({ room }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext); // Lấy thông tin user hiện tại

  const handleJoinRoom = async () => {
    const token = localStorage.getItem("token");
    if (!user || !token) {
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

        alert("Yêu cầu tham gia đã được gửi đi. Vui lòng chờ chủ phòng duyệt.");
      }
    } catch (err) {
      console.error("Lỗi khi tham gia phòng:", err);
      alert(err.response?.data?.msg || "Không thể tham gia phòng. Vui lòng thử lại.");
    }
  };

  return (
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
  );
}

export default RoomCard;