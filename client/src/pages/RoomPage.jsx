// client/src/pages/RoomPage.jsx
import React, { useEffect, useState, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../services/socket";
import { AuthContext } from "../contexts/AuthContext";
import {
  LogOut,
  Headphones,
  Send,
  SkipBack,
  SkipForward,
  Pause,
  Smile,
  Flag,
  XCircle,
  UserPlus,
} from "react-feather";
import "./RoomPage.css";

function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("chat");

  // ✅ Tính toán vai trò ngay trước render
  const isHost = user && room && user._id === room.owner._id;

  // ✅ Hàm xử lý join request (chỉ dành cho host)
  const handleNewJoinRequest = useCallback(
    ({ requester, roomId: requestedRoomId }) => {
      if (roomId === requestedRoomId) {
        const accept = window.confirm(
          `Người dùng "${requester.username}" muốn tham gia phòng. Bạn có chấp nhận không?`
        );

        socket.emit("respond-to-request", {
          requesterId: requester._id,
          roomId: requestedRoomId,
          accepted: accept,
        });
      }
    },
    [roomId]
  );

  useEffect(() => {
    if (!user) return;

    // 1. Connect và join phòng
    socket.connect();
    socket.emit("join-room", roomId);

    // listener chung
    const handleUpdateMembers = (updatedMembers) => setMembers(updatedMembers);
    const handleUserJoined = ({ username }) =>
      alert(`${username} vừa tham gia phòng!`);
    const handleRoomEnded = (data) => {
      alert(data.message);
      navigate("/home");
    };

    socket.on("update-members", handleUpdateMembers);
    socket.on("user-joined-notification", handleUserJoined);
    socket.on("room-ended", handleRoomEnded);

    // 2. Fetch chi tiết phòng -> xác định vai trò
    let currentUserIsHost = false;
    const fetchRoomDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:8800/api/rooms/${roomId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const fetchedRoom = res.data;
        setRoom(fetchedRoom);
        setMembers(fetchedRoom.members || []);

        // nếu là host -> bật listener duyệt
        if (user._id === fetchedRoom.owner._id) {
          currentUserIsHost = true;
          socket.on("new-join-request", handleNewJoinRequest);
        }
      } catch (err) {
        console.error("Lỗi khi lấy thông tin phòng:", err);
        setError(err.response?.data?.msg || "Không thể tải phòng.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();

    // 3. cleanup
    return () => {
      if (!currentUserIsHost) {
        socket.emit("leave-room", { roomId, userId: user._id });
      }
      socket.off("update-members", handleUpdateMembers);
      socket.off("user-joined-notification", handleUserJoined);
      socket.off("room-ended", handleRoomEnded);
      socket.off("new-join-request", handleNewJoinRequest);
      socket.disconnect();
    };
  }, [roomId, user, navigate, handleNewJoinRequest]);

  // ==========================
  // Xử lý nút
  // ==========================
  const handleEndRoom = async () => {
    if (window.confirm("Bạn có chắc chắn muốn kết thúc phòng này không?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.put(
          `http://localhost:8800/api/rooms/${roomId}/end`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        alert("Có lỗi xảy ra khi kết thúc phòng.");
        console.error(err);
      }
    }
  };

  const handleLeaveRoom = () => {
    socket.emit("leave-room", { roomId, userId: user._id });
    navigate("/home");
  };

  // ==========================
  // Render UI
  // ==========================
  if (isLoading) return <div>Đang tải phòng...</div>;
  if (error) return <div>Lỗi: {error}</div>;
  if (!room) return <div>Không tìm thấy phòng.</div>;

  return (
    <div className="roompage-container">
      {/* HEADER */}
      <header className="roompage-header">
        <div className="roompage-header-info">
          <h1>{room.name}</h1>
          {room.description && <p>{room.description}</p>}
          {room.privacy === "private" && isHost && (
            <div className="roompage-roomcode">
              Mã phòng: <strong>{room.roomCode}</strong>
            </div>
          )}
        </div>

        <div className="roompage-header-actions">
          {isHost ? (
            <>
              <button
                className="btn btn-danger-outline"
                onClick={handleEndRoom}
              >
                <XCircle size={16} />
                <span>Kết thúc</span>
              </button>
              <button className="btn btn-primary">
                <UserPlus size={16} />
                <span>Mời</span>
              </button>
            </>
          ) : (
            <button className="btn" onClick={handleLeaveRoom}>
              <LogOut size={16} />
              <span>Rời phòng</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="roompage-main">
        {/* LEFT: QUEUE */}
        <aside className="roompage-left">
          <div className="roompage-queue">
            <h2>Danh sách phát</h2>
            <ul className="roompage-queue-list">
              {room.queue?.map((track) => (
                <li
                  key={track.id}
                  className={`roompage-queue-item ${
                    room.currentTrack?.id === track.id
                      ? "roompage-now-playing"
                      : ""
                  }`}
                >
                  <img src={track.albumArt} alt={track.title} />
                  <div className="roompage-queue-info">
                    <h3>{track.title}</h3>
                    <p>{track.artist}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* CENTER: PLAYER */}
        <section className="roompage-center">
          <img
            className="roompage-album-art"
            src={room.currentTrack?.albumArt}
            alt="Album Art"
          />
          <div className="roompage-song-info">
            <h1>{room.currentTrack?.title}</h1>
            <p>{room.currentTrack?.artist}</p>
          </div>

          <div className="roompage-player">
            <div className="roompage-player-progress">
              <div
                className="roompage-progress-bar"
                style={{ width: room.progress || "0%" }}
              ></div>
            </div>
            <div className="roompage-player-time">
              <span>{room.currentTime || "0:00"}</span>
              <span>{room.duration || "0:00"}</span>
            </div>
            <div className="roompage-player-controls">
              <button className="roompage-btn-icon" disabled>
                <SkipBack size={28} />
              </button>
              <button className="roompage-btn-icon roompage-btn-play" disabled>
                <Pause size={32} />
              </button>
              <button className="roompage-btn-icon" disabled>
                <SkipForward size={28} />
              </button>
            </div>
          </div>

          <button className="roompage-btn-spotify">
            <Headphones size={18} />
            <span>Nghe bản đầy đủ trên Spotify</span>
          </button>
        </section>

        {/* RIGHT: CHAT + MEMBERS */}
        <aside className="roompage-right">
          <div className="roompage-tabs">
            <div
              className={`roompage-tab ${
                activeTab === "chat" ? "active" : ""
              }`}
              onClick={() => setActiveTab("chat")}
            >
              Trò chuyện ({room.chat?.length || 0})
            </div>
            <div
              className={`roompage-tab ${
                activeTab === "participants" ? "active" : ""
              }`}
              onClick={() => setActiveTab("participants")}
            >
              Thành viên ({members.length})
            </div>
          </div>

          {activeTab === "chat" && (
            <div className="roompage-chat">
              {room.chat?.map((msg) => (
                <div
                  key={msg.id}
                  className={`roompage-chat-msg ${
                    msg.userId === room.owner._id ? "is-host" : ""
                  }`}
                >
                  <img src={msg.avatar} alt={msg.username} />
                  <div className="roompage-chat-body">
                    <div className="roompage-chat-username">
                      {msg.username}
                    </div>
                    <div className="roompage-chat-text">{msg.text}</div>
                    <div className="roompage-chat-actions">
                      <button className="roompage-btn-icon">
                        <Smile size={16} />
                      </button>
                      <button className="roompage-btn-icon">
                        <Flag size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "participants" && (
            <div className="roompage-participants">
              <ul className="roompage-participant-list">
                {members.map((p) => (
                  <li key={p._id} className="roompage-participant-item">
                    <div className="roompage-participant-info">
                      <img
                        src={p.avatar || "/default-avatar.png"}
                        alt={p.username}
                      />
                      <span>
                        {p.username}
                        {p._id === room.owner._id && (
                          <span className="roompage-host-tag">HOST</span>
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="roompage-chat-input">
            <input type="text" placeholder="Nhập tin nhắn..." />
            <button className="roompage-btn-icon">
              <Send size={18} />
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default RoomPage;
