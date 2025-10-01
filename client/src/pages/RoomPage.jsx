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

  const isHost = user && room && user._id === room.owner._id;

  // ======================
  // API end room
  // ======================
  const endRoomAPI = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:8800/api/rooms/${roomId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (err) {
      console.error("Có lỗi xảy ra khi kết thúc phòng.", err);
      return false;
    }
  }, [roomId]);

  // ======================
  // Host xử lý join-request
  // ======================
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

  // ======================
  // useEffect chính
  // ======================
  useEffect(() => {
    if (!user) return;

    socket.connect();

    // Đăng ký user → socketId (map để server quản lý)
    if (user && user._id) {
      socket.emit("register-user", user._id);
    }

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

        // đảm bảo owner luôn có trong members list
        const owner = fetchedRoom.owner ? [fetchedRoom.owner] : [];
        const otherMembers = (fetchedRoom.members || []).filter(
          (m) => m._id !== fetchedRoom.owner?._id
        );
        setMembers([...owner, ...otherMembers]);

        // Kiểm tra user có phải host
        if (user._id === fetchedRoom.owner._id) {
          currentUserIsHost = true;
          // Host không cần join API, emit socket trực tiếp
          socket.emit("join-room", roomId);
          socket.on("new-join-request", handleNewJoinRequest);
        } else {
          // Nếu là member bình thường, gọi API join
          try {
            await axios.post(
              `http://localhost:8800/api/rooms/${roomId}/join`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            socket.emit("join-room", roomId);
          } catch (err) {
            console.error(
              "❌ Lỗi join phòng:",
              err.response?.data?.msg || err.message
            );
            alert(err.response?.data?.msg || "Lỗi khi tham gia phòng");
          }
        }
      } catch (err) {
        console.error("Lỗi khi lấy thông tin phòng:", err);
        setError(err.response?.data?.msg || "Không thể tải phòng.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();

    // ======================
    // Socket events
    // ======================
    const handleUpdateMembers = (updatedMembers) => {
      // luôn đảm bảo owner đứng đầu danh sách
      if (room && room.owner) {
        const owner = [room.owner];
        const others = updatedMembers.filter(
          (m) => m._id !== room.owner._id
        );
        setMembers([...owner, ...others]);
      } else {
        setMembers(updatedMembers);
      }
    };

    const handleUserJoined = ({ username }) =>
      alert(`${username} vừa tham gia phòng!`);

    const handleRoomEnded = (data) => {
      if (!currentUserIsHost) alert(data.message);
      navigate("/home");
    };

    socket.on("update-members", handleUpdateMembers);
    socket.on("user-joined-notification", handleUserJoined);
    socket.on("room-ended", handleRoomEnded);

    // Cleanup khi unmount
    return () => {
      if (currentUserIsHost) endRoomAPI();
      else if (user) socket.emit("leave-room", { roomId, userId: user._id });

      socket.off("update-members", handleUpdateMembers);
      socket.off("user-joined-notification", handleUserJoined);
      socket.off("room-ended", handleRoomEnded);
      socket.off("new-join-request", handleNewJoinRequest);
      socket.disconnect();
    };
  }, [roomId, user, navigate, handleNewJoinRequest, endRoomAPI]);

  // ======================
  // Guest listener accept/deny
  // ======================
  useEffect(() => {
    const handleJoinRequestAccepted = ({
      roomId: acceptedRoomId,
      room: roomPayload,
    }) => {
      if (acceptedRoomId !== roomId) return;

      const populatedRoom = roomPayload;
      const owner = populatedRoom.owner ? [populatedRoom.owner] : [];
      const otherMembers = (populatedRoom.members || []).filter(
        (m) => m._id !== populatedRoom.owner?._id
      );
      setRoom(populatedRoom);
      setMembers([...owner, ...otherMembers]);

      socket.emit("join-room", roomId);
      alert("Bạn đã được chủ phòng chấp nhận — đang vào phòng!");
    };

    const handleJoinRequestDenied = ({ message }) => {
      alert(message || "Yêu cầu tham gia bị từ chối.");
      navigate("/home");
    };

    socket.on("join-request-accepted", handleJoinRequestAccepted);
    socket.on("join-request-denied", handleJoinRequestDenied);

    return () => {
      socket.off("join-request-accepted", handleJoinRequestAccepted);
      socket.off("join-request-denied", handleJoinRequestDenied);
    };
  }, [roomId, navigate]);

  // ✅ [SỬA ĐỔI] - Cơ chế CHẶN người dùng thoát trang cho Host
  useEffect(() => {
    if (!isHost) return;

    // --- Xử lý ĐÓNG TAB / TẢI LẠI TRANG ---
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = ""; 
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // --- Xử lý NHẤN NÚT BACK của trình duyệt ---
    // Đẩy một state vào history để bắt sự kiện back từ trang này
    window.history.pushState(null, "", window.location.href);
    const handlePopState = (event) => {
        // Khi người dùng nhấn back, hiển thị cảnh báo và đẩy họ lại trang cũ
        alert("Vui lòng nhấn nút 'Kết thúc' để dừng buổi live.");
        window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);

    // Dọn dẹp listener khi component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isHost]);


  const handleEndRoom = async () => {
    if (window.confirm("Bạn có chắc chắn muốn kết thúc live không?")) {
      const success = await endRoomAPI();
      if (success) {
        alert("Buổi live đã được kết thúc.");
        // Sau khi kết thúc thành công, ta không cần chặn người dùng nữa
        // nên có thể điều hướng an toàn
        navigate("/home");
      } else {
        alert("Đã có lỗi xảy ra, không thể kết thúc phòng. Vui lòng thử lại.");
      }
    }
  };

  const handleLeaveRoom = () => {
    socket.emit("leave-room", { roomId, userId: user._id });
    navigate("/home");
  };

  if (isLoading) return <div>Đang tải phòng...</div>;
  if (error) return <div>Lỗi: {error}</div>;
  if (!room) return <div>Không tìm thấy phòng.</div>;

  return (
    <div className="roompage-container">
      {/* ...Phần còn lại của JSX giữ nguyên... */}
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