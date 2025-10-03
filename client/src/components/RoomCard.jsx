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
    if (room.privacy === "public") {
      const res = await axios.post(
        `http://localhost:8800/api/rooms/${room._id}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // đảm bảo server trả về populated room (server của bạn đang làm vậy)
      navigate(`/room/${room._id}`);
    } else if (room.privacy === "private") {
      const roomCode = prompt("Nhập mã phòng:");
      if (!roomCode) return;
      await axios.post(
        `http://localhost:8800/api/rooms/${room._id}/join`,
        { roomCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/room/${room._id}`);
    } else if (room.privacy === "manual") {
      socket.emit("request-to-join", {
        roomId: room._id,
        requester: {
          _id: user._id,
          username: user.username,
          avatar: user.avatar,
        },
      });
      alert("Yêu cầu tham gia đã được gửi. Chờ chủ phòng duyệt.");
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