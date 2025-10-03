// client/src/pages/RoomPage.jsx
import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
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

import Swal from "sweetalert2";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function RoomPage() {
  const roomRef = useRef(null);

  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Đặt state room trước khi dùng
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("chat");

  // keep ref in sync whenever room changes
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // helper: đảm bảo socket connect trước khi emit
  const ensureSocketConnected = () =>
    new Promise((resolve) => {
      if (socket.connected) return resolve();
      socket.once("connect", () => resolve());
      socket.connect();
    });
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
    async ({ requester, roomId: requestedRoomId }) => {
      if (roomId === requestedRoomId) {
        const result = await Swal.fire({
          title: "Yêu cầu tham gia",
          text: `Người dùng "${requester.username}" muốn tham gia phòng.`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Chấp nhận",
          cancelButtonText: "Từ chối",
        });

        socket.emit("respond-to-request", {
          requesterId: requester._id,
          roomId: requestedRoomId,
          accepted: result.isConfirmed,
        });
      }
    },
    [roomId]
  );

  // ======================
  // useEffect chính (đã kết hợp code 2 vào code 1)
  // ======================
  useEffect(() => {
  if (!user) return;

  let currentUserIsHost = false;
  let cleanedUp = false;

  const fetchRoomDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      // 1) lấy details (lúc này DB chưa chắc đã có user nếu người dùng vừa gọi join)
      const res = await axios.get(
        `http://localhost:8800/api/rooms/${roomId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let fetchedRoom = res.data;

      // 2) nếu user chưa nằm trong fetchedRoom.members:
      const isMember = (fetchedRoom.members || []).some(
        (m) => String(m._id) === String(user._id)
      );

      // CHỈ auto-call API join cho phòng public.
      // (private cần code, manual cần host accept => server sẽ push populatedRoom back)
      if (!isMember && fetchedRoom.privacy === "public") {
        try {
          const joinRes = await axios.post(
            `http://localhost:8800/api/rooms/${roomId}/join`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          // server trả về { msg, room } theo controller của bạn
          fetchedRoom = joinRes.data.room || fetchedRoom;
        } catch (joinErr) {
          // nếu join lỗi (vd: 403/require code) thì show và dừng
          console.error("Lỗi joinRoom tự động:", joinErr);
          // optional: setError(joinErr.response?.data?.msg || "Không thể tham gia phòng.");
          // nếu bị private mà không có code thì sẽ bị 403, không tự join
        }
      }

      if (cleanedUp) return;

      setRoom(fetchedRoom);

      // đặt owner đứng đầu an toàn (so sánh bằng String)
      const owner = fetchedRoom.owner ? [fetchedRoom.owner] : [];
      const otherMembers = (fetchedRoom.members || []).filter(
        (m) => String(m._id) !== String(fetchedRoom.owner?._id)
      );
      setMembers([...owner, ...otherMembers]);

      // 3) đảm bảo socket connected trước khi emit join-room
      await ensureSocketConnected();
      socket.emit("join-room", roomId);

      // nếu user là host, listen new-join-request
      if (String(user._id) === String(fetchedRoom.owner?._id)) {
        currentUserIsHost = true;
        socket.on("new-join-request", handleNewJoinRequest);
      }
    } catch (err) {
      console.error("Lỗi khi lấy thông tin phòng:", err);
      setError(err.response?.data?.msg || "Không thể tải phòng.");
      toast.error(err.response?.data?.msg || "Lỗi khi tải phòng");
      navigate("/home");
    } finally {
      setIsLoading(false);
    }
  };

  fetchRoomDetails();

  // ======================
  // Socket events (dùng roomRef để tránh stale closure)
  // ======================
  const handleUpdateMembers = (updatedMembers) => {
    if (!updatedMembers) return;

    // Cases:
    // - server có thể gửi [owner, ...others] OR chỉ gửi members (không có owner)
    // - chúng ta ưu tiên giữ owner đứng đầu nếu biết owner từ roomRef
    const currentRoom = roomRef.current;

    if (currentRoom && currentRoom.owner) {
      const ownerId = String(currentRoom.owner._id);
      // tìm owner trong payload
      const ownerObj = updatedMembers.find((m) => String(m._id) === ownerId);
      if (ownerObj) {
        const others = updatedMembers.filter((m) => String(m._id) !== ownerId);
        setMembers([ownerObj, ...others]);
        return;
      } else {
        // payload không có owner — có thể server gửi chỉ members (no owner)
        // ta vẫn giữ currentRoom.owner đứng đầu, và merge members (tránh duplicate)
        const dedupOthers = updatedMembers.filter(
          (m) => String(m._id) !== ownerId
        );
        setMembers([currentRoom.owner, ...dedupOthers]);
        return;
      }
    }

    // fallback
    setMembers(updatedMembers);
  };

  const handleUserJoined = ({ username }) => {
    toast.success(`${username} vừa tham gia phòng!`);
  };

  const handleRoomEnded = (data) => {
    if (!currentUserIsHost) toast.info(data.message);
    navigate("/home");
  };

  socket.on("update-members", handleUpdateMembers);
  socket.on("user-joined-notification", handleUserJoined);
  socket.on("room-ended", handleRoomEnded);

  // Cleanup
  return () => {
    cleanedUp = true;
    if (currentUserIsHost) endRoomAPI();
    else if (user) socket.emit("leave-room", { roomId, userId: user._id });

    socket.off("update-members", handleUpdateMembers);
    socket.off("user-joined-notification", handleUserJoined);
    socket.off("room-ended", handleRoomEnded);
    socket.off("new-join-request", handleNewJoinRequest);
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
      toast.success("Bạn đã được chủ phòng chấp nhận — đang vào phòng!");
    };

    const handleJoinRequestDenied = ({ message }) => {
      toast.error(message || "Yêu cầu tham gia bị từ chối.");
      navigate("/home");
    };

    socket.on("join-request-accepted", handleJoinRequestAccepted);
    socket.on("join-request-denied", handleJoinRequestDenied);

    return () => {
      socket.off("join-request-accepted", handleJoinRequestAccepted);
      socket.off("join-request-denied", handleJoinRequestDenied);
    };
  }, [roomId, navigate]);

  // ✅ Chặn host tắt tab/back mà không kết thúc live
  useEffect(() => {
    if (!isHost) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      toast.warning("Vui lòng nhấn nút 'Kết thúc' để dừng buổi live.");
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isHost]);

  // ======================
  // Host kết thúc phòng
  // ======================
  const handleEndRoom = async () => {
    const result = await Swal.fire({
      title: "Xác nhận",
      text: "Bạn có chắc chắn muốn kết thúc live không?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Kết thúc",
      cancelButtonText: "Hủy",
    });

    if (result.isConfirmed) {
      const success = await endRoomAPI();
      if (success) {
        Swal.fire("Đã kết thúc", "Buổi live đã được kết thúc.", "success");
        navigate("/home");
      } else {
        Swal.fire("Lỗi", "Không thể kết thúc phòng. Vui lòng thử lại.", "error");
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