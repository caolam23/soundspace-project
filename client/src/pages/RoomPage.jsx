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

// Thư viện UI
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  // pending join requests for host
  const [joinRequests, setJoinRequests] = useState([]);
  const [hostFeedback, setHostFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("chat");

  const isHost = user && room && user._id === room.owner._id;

  // Log socket events for debugging but register once per component lifecycle
  useEffect(() => {
    const anyHandler = (event, ...args) => {
      console.log("📡 Received event:", event, args);
    };

    socket.onAny(anyHandler);

    return () => {
      socket.offAny(anyHandler);
    };
  }, []);

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
        // Deduplicate by requester id
        setJoinRequests((prev) => {
          if (prev.some((r) => r.requester._id === requester._id)) return prev;
          return [...prev, { requester, roomId: requestedRoomId, status: "pending" }];
        });
      }
    },
    [roomId]
  );

  // Accept / Deny handlers for host UI
  const respondToRequest = useCallback((requesterId, accepted) => {
    // Emit to server
    socket.emit("respond-to-request", {
      requesterId,
      roomId,
      accepted,
    });

    // Update only the matched request's status so it shows inline
    setJoinRequests((prev) =>
      prev.map((r) =>
        r.requester._id === requesterId ? { ...r, status: accepted ? "accepted" : "denied" } : r
      )
    );

    // Optionally remove the request after a short delay to keep the list clean
    setTimeout(() => {
      setJoinRequests((prev) => prev.filter((r) => r.requester._id !== requesterId));
    }, 5000);
  }, [roomId]);

  // ======================
  // useEffect chính
  // ======================
  useEffect(() => {
    if (!user) return;

    socket.connect();

    // Đăng ký user → socketId
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

        // đảm bảo owner luôn đứng đầu danh sách
        const owner = fetchedRoom.owner ? [fetchedRoom.owner] : [];
        const otherMembers = (fetchedRoom.members || []).filter(
          (m) => m._id !== fetchedRoom.owner?._id
        );
        setMembers([...owner, ...otherMembers]);

        // Kiểm tra user có phải host
        if (user._id === fetchedRoom.owner._id) {
          currentUserIsHost = true;
          socket.emit("join-room", roomId);
          socket.on("new-join-request", handleNewJoinRequest);
        } else {
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
            toast.error(err.response?.data?.msg || "Lỗi khi tham gia phòng");
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
    const handleJoinRequestAccepted = ({ roomId: acceptedRoomId, room: roomPayload }) => {
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
        {/* Join requests box for host */}
        {isHost && joinRequests.length > 0 && (
          <div className="join-requests-container">
            <h3>Yêu cầu tham gia</h3>
            <ul>
                {joinRequests.map((r) => (
                  <li key={r.requester._id} className="join-request-item">
                    <div className="join-request-info">
                      <img src={r.requester.avatar || '/default-avatar.png'} alt={r.requester.username} />
                      <div>
                        <div className="join-request-username">{r.requester.username}</div>
                        <div className="join-request-meta">Yêu cầu vào phòng</div>
                      </div>
                    </div>
                    <div className="join-request-actions">
                      {/* If request has been responded to, show inline status badge; otherwise show action buttons */}
                      {r.status && r.status !== "pending" ? (
                        <div className={`join-request-status ${r.status}`}>
                          {r.status === "accepted" ? "Đã chấp nhận" : "Đã từ chối"}
                        </div>
                      ) : (
                        r.status === "pending" ? (
                          <>
                            <button className="btn btn-accept" onClick={() => respondToRequest(r.requester._id, true)}>Chấp nhận</button>
                            <button className="btn btn-deny" onClick={() => respondToRequest(r.requester._id, false)}>Từ chối</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-accept" onClick={() => respondToRequest(r.requester._id, true)}>Chấp nhận</button>
                            <button className="btn btn-deny" onClick={() => respondToRequest(r.requester._id, false)}>Từ chối</button>
                          </>
                        )
                      )}
                    </div>
                  </li>
                ))}
              </ul>
          </div>
        )}
        {/* LEFT: QUEUE */}
            {hostFeedback && joinRequests.length === 0 && <div className="host-feedback">{hostFeedback}</div>}
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