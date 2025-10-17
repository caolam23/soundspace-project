// client/src/pages/RoomPage.jsx
import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import {
  LogOut,
  Headphones,
  Send,
  SkipBack,
  SkipForward,
  Pause,
  Flag,
  XCircle,
  UserPlus,
} from "react-feather";
import "./RoomPage.css";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MusicPlayer from "../components/MusicPlayer";
import RoomChat from "../components/RoomChat";
import ReportRoomModal from "../components/ReportRoomModal";
import { toastConfig } from "../services/toastConfig"; // hoặc đường dẫn bạn lưu file config
import { reportRoom } from "../services/api";

function RoomPage() {
  const isReloading = useRef(false);
  const roomRef = useRef(null);
  const hasInitialized = useRef(false);
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, socket } = useContext(AuthContext);

  const [room, setRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [joinNotification, setJoinNotification] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [leaveNotification, setLeaveNotification] = useState(null);
  const [hostFeedback, setHostFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const isHost = user && room && user._id === room.owner._id;

  // Append incoming saved chat message into room state so tab switches keep messages
  // HÀM MỚI ĐÃ SỬA LỖI
  const appendChatMessage = (msg) => {
    try {
      setChatMessages((prevMessages) => {
        // Tránh thêm tin nhắn trùng lặp nếu đã tồn tại
        if (prevMessages.some((c) => String(c._id || c.id) === String(msg.id || msg._id))) {
          return prevMessages;
        }
        // Tạo object tin nhắn mới để đảm bảo cấu trúc nhất quán
        const newMsg = {
          _id: msg.id || msg._id,
          userId: msg.userId,
          username: msg.username,
          avatar: msg.avatar,
          text: msg.text,
          meta: msg.meta,
          createdAt: msg.createdAt
        };
        // Thêm tin nhắn mới vào mảng
        return [...prevMessages, newMsg];
      });
    } catch (e) {
      console.warn('appendChatMessage error', e);
    }
  };

  // API kết thúc phòng
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
      console.error("Có lỗi xảy ra khi kết thúc phòng:", err);
      return false;
    }
  }, [roomId]);

  // Host xử lý join-request
  const handleNewJoinRequest = useCallback(
    ({ requester, roomId: requestedRoomId }) => {
      if (roomId === requestedRoomId) {
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
    socket.emit("respond-to-request", {
      requesterId,
      roomId,
      accepted,
    });

    setJoinRequests((prev) =>
      prev.map((r) =>
        r.requester._id === requesterId ? { ...r, status: accepted ? "accepted" : "denied" } : r
      )
    );

    setTimeout(() => {
      setJoinRequests((prev) => prev.filter((r) => r.requester._id !== requesterId));
    }, 5000);
  }, [roomId, socket]);

  // Detect reload/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      isReloading.current = true;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // ============================================
  // MAIN USEEFFECT - FETCH & SOCKET SETUP
  // ============================================
  useEffect(() => {
    if (!user) return;

    let currentUserIsHost = false;
    let cleanedUp = false;
    let socketJoined = false;
    const roomKey = `room_visited_${roomId}`;

    const fetchRoomDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        let { data: fetchedRoom } = await axios.get(
          `http://localhost:8800/api/rooms/${roomId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const hasVisited = localStorage.getItem(roomKey);
        
        const isReload = performance.navigation.type === 1 ||
                         performance.getEntriesByType('navigation')[0]?.type === 'reload';
        
        const isNewNavigation = !!(location.state?.fromCreate ||
                                   location.state?.fromJoin ||
                                   location.state?.fromApproval);
        
        if (isNewNavigation) {
          window.history.replaceState({}, document.title);
        }
        
        // Handle reload behavior
        if (hasVisited && isReload && !isNewNavigation) {
          const userIsHost = String(user._id) === String(fetchedRoom.owner._id);
          
          localStorage.removeItem(roomKey);
          
          if (userIsHost) {
            toast.error("Host không được reload khi đang live! Phòng đã bị kết thúc.", {
            ...toastConfig,
            autoClose: 4200, // ⏳ hiển thị lâu hơn 2 giây
            icon: "💀",
            style: {
              ...toastConfig.style,
              background: "linear-gradient(135deg, #2b2b2b, #3a3a3a)",
              color: "#ff8a8a", // chữ đỏ nhạt nhẹ
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            },
          });
            await endRoomAPI();
            navigate("/home", { replace: true });
            return;
          } else {
            socket.emit("leave-room", { roomId, userId: user._id });
            toast.warning("Bạn đã reload trang — bạn đã bị đẩy ra khỏi phòng.", {
                ...toastConfig,
                icon: "🔄",
                style: {
                  ...toastConfig.style,
                  background: "linear-gradient(135deg, #1CB5E0, #000046)", // xanh lạnh
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
                },
              });
            navigate("/home", { replace: true });
            return;
          }
        }
        if (!hasVisited) {
          localStorage.setItem(roomKey, "true");
        }
        
        hasInitialized.current = true;

        const isMember = (fetchedRoom.members || []).some(
          (m) => String(m._id) === String(user._id)
        );

        // Auto-join for public rooms
        if (!isMember && fetchedRoom.privacy === "public") {
          try {
            const joinRes = await axios.post(
              `http://localhost:8800/api/rooms/${roomId}/join`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchedRoom = joinRes.data.room || fetchedRoom;
            
            try {
              const myUsername = user.username || (joinRes.data.room?.owner?.username) || null;
              if (myUsername) {
                setJoinNotification({ username: myUsername, id: Date.now() });
                setTimeout(() => setJoinNotification(null), 4000);
              }
            } catch (e) { /* ignore */ }
          } catch (joinErr) {
            console.error("❌ Lỗi join phòng public:", joinErr);
          }
        }

        if (cleanedUp) return;
        
        // Merge fetchedRoom with existing room to avoid accidentally
        // removing properties like playlist when the server returns
        // a partial room object in some socket callbacks.
        setRoom((prev) => {
          if (!prev) return fetchedRoom;
          return { ...prev, ...fetchedRoom };
        });
        setChatMessages(fetchedRoom.chat || []);

        const owner = fetchedRoom.owner ? [fetchedRoom.owner] : [];
        const otherMembers = (fetchedRoom.members || []).filter(
          (m) => String(m._id) !== String(fetchedRoom.owner?._id)
        );
        setMembers([...owner, ...otherMembers]);

        // Join socket room
        if (socket.connected) {
          socket.emit("join-room", roomId);
          socketJoined = true;
        } else {
          socket.once("connect", () => {
            socket.emit("join-room", roomId);
            socketJoined = true;
          });
        }

        if (String(user._id) === String(fetchedRoom.owner?._id)) {
          currentUserIsHost = true;
          socket.on("new-join-request", handleNewJoinRequest);
        }
        // Keep room state in sync with server-side playback/playlist/status events
        // so participant UI (e.g., report button) updates in real-time.
        const handlePlaylistUpdated = (newPlaylist) => {
          try {
            setRoom((prev) => ({ ...prev, playlist: Array.isArray(newPlaylist) ? newPlaylist : prev?.playlist || [] }));
          } catch (e) { console.warn('handlePlaylistUpdated', e); }
        };

        const handlePlaybackStateChanged = (newState) => {
          try {
            setRoom((prev) => ({
              ...prev,
              playlist: Array.isArray(newState?.playlist) ? newState.playlist : prev?.playlist,
              currentTrackIndex: typeof newState?.currentTrackIndex !== 'undefined' ? newState.currentTrackIndex : prev?.currentTrackIndex,
              isPlaying: typeof newState?.isPlaying !== 'undefined' ? newState.isPlaying : prev?.isPlaying,
            }));
          } catch (e) { console.warn('handlePlaybackStateChanged', e); }
        };

        const handleRoomStatusChanged = (payload) => {
          try {
            if (!payload) return;
            // payload may be { roomId, status, ... }
            if (String(payload.roomId || payload._id || payload.id) !== String(roomId)) return;
            setRoom((prev) => ({ ...prev, status: payload.status ?? prev?.status }));
          } catch (e) { console.warn('handleRoomStatusChanged', e); }
        };

        socket.on('playlist-updated', handlePlaylistUpdated);
        socket.on('playback-state-changed', handlePlaybackStateChanged);
        socket.on('room-status-changed', handleRoomStatusChanged);
      } catch (err) {
        console.error("❌ Lỗi khi lấy thông tin phòng:", err);
        setError(err.response?.data?.msg || "Không thể tải phòng.");
        toast.error(err.response?.data?.msg || "Không thể tải phòng.");
        navigate("/home");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();

    // Socket event handlers
    const handleUpdateMembers = (data) => {
      const updatedMembers = data.members || data;
      if (!updatedMembers || updatedMembers.length === 0) return;
      
      const currentRoom = roomRef.current;
      if (!currentRoom || !currentRoom.owner) {
        setMembers(updatedMembers);
        return;
      }

      const ownerId = String(currentRoom.owner._id);
      const ownerObj = updatedMembers.find((m) => String(m._id) === ownerId);
      
      if (ownerObj) {
        const others = updatedMembers.filter((m) => String(m._id) !== ownerId);
        setMembers([ownerObj, ...others]);
      } else {
        setMembers(updatedMembers);
      }
    };

    const handleUserJoined = ({ username, avatar }) => {
      // 🆕 Thêm điều kiện: Không hiển thị thông báo nếu đó là chính mình
      if (user && user.username === username) return;
      
      const memberAvatar =
        avatar || members.find((m) => m.username === username)?.avatar || "/default-avatar.png";

      setJoinNotification({ username, avatar: memberAvatar, id: Date.now() });
      setTimeout(() => setJoinNotification(null), 4000);
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
      
      if (!isReloading.current) {
        localStorage.removeItem(roomKey);
      }
      
      if (socketJoined) {
        if (currentUserIsHost) {
          endRoomAPI();
        } else if (user) {
          socket.emit("leave-room", { roomId, userId: user._id });
        }
      }

      socket.off("update-members", handleUpdateMembers);
      socket.off("user-joined-notification", handleUserJoined);
      socket.off("room-ended", handleRoomEnded);
      socket.off("new-join-request", handleNewJoinRequest);
  socket.off('playlist-updated');
  socket.off('playback-state-changed');
  socket.off('room-status-changed');
    };
  }, [roomId, user, socket, navigate, handleNewJoinRequest, endRoomAPI, location.state]);

  useEffect(() => {
        const handleUserLeft = ({ username, avatar, userId }) => { // ⚠️ Nên thêm userId để lọc chính xác hơn
            // Lọc bỏ nếu người rời phòng là chính mình (đã chuyển hướng về /home)
            if (user && user._id === userId) return; // Lọc bằng _id sẽ chính xác hơn

            const memberAvatar = avatar || "/default-avatar.png";

            // Hiển thị thông báo rời phòng
            setLeaveNotification({ username, avatar: memberAvatar, id: Date.now() });

            // Tự động ẩn sau 4 giây
            const timer = setTimeout(() => setLeaveNotification(null), 4000);
            return () => clearTimeout(timer);
        };

        socket.on("user-left-notification", handleUserLeft);

        // If admin banned the room while user is in it
        const handleRoomBanned = (data) => {
          if (data && String(data.roomId) === String(roomId)) {
            toast.error('Phòng đã bị cấm bởi quản trị viên. Bạn sẽ được chuyển về trang chủ.', { ...toastConfig });
            localStorage.removeItem(`room_visited_${roomId}`);
            setTimeout(() => navigate('/home'), 1200);
          }
        };
        socket.on('room-banned', handleRoomBanned);

        return () => {
            socket.off("user-left-notification", handleUserLeft);
      socket.off('room-banned', handleRoomBanned);
        };
    }, [socket, user])

  // Guest join approval handling
  useEffect(() => {
    const handleJoinRequestAccepted = async ({ roomId: acceptedRoomId, room: payload }) => {
      if (acceptedRoomId !== roomId) return;
      
      try {
        socket.emit("join-room", roomId);
        
        setRoom((prev) => {
          if (!prev) return payload;
          return { ...prev, ...payload, playlist: payload.playlist ?? prev.playlist };
        });
        const owner = payload.owner ? [payload.owner] : [];
        const otherMembers = (payload.members || []).filter(
          (m) => String(m._id) !== String(payload.owner?._id)
        );
        setMembers([...owner, ...otherMembers]);
        
        toast.success("Bạn đã được chủ phòng chấp nhận — đang vào phòng!");
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const token = localStorage.getItem("token");
        const { data: freshRoom } = await axios.get(
          `http://localhost:8800/api/rooms/${roomId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (freshRoom.members.length >= payload.members.length) {
          setRoom((prev) => {
            if (!prev) return freshRoom;
            return { ...prev, ...freshRoom };
          });
          const freshOwner = freshRoom.owner ? [freshRoom.owner] : [];
          const freshOthers = (freshRoom.members || []).filter(
            (m) => String(m._id) !== String(freshRoom.owner?._id)
          );
          setMembers([...freshOwner, ...freshOthers]);
        }
        
      } catch (err) {
        console.error("❌ Lỗi khi xử lý join-request-accepted:", err);
        toast.error("Có lỗi xảy ra khi tải thông tin phòng.");
      }
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
  }, [roomId, socket, navigate]);

  // Prevent host from closing tab during live
  useEffect(() => {
    if (!isHost) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      toast.warning("Vui lòng nhấn 'Kết thúc' để dừng buổi live.");
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isHost]);

  // ============================================
// XỬ LÝ KHI HOST BỊ CHẶN
// ============================================
useEffect(() => {
  if (!isHost || !socket) return;

  const handleHostBlocked = ({ blocked, message }) => {
    if (blocked) {
      console.log('🚫 [HOST-BLOCKED] Host bị chặn, kết thúc phòng...');
      
      // Hiển thị thông báo cho host
      toast.error(message || 'Tài khoản của bạn đã bị chặn.', {
        ...toastConfig,
        autoClose: 3000,
        icon: "🚫",
        style: {
          ...toastConfig.style,
          background: "linear-gradient(135deg, #ff0000, #8B0000)",
          color: "#ffffff",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 4px 20px rgba(255, 0, 0, 0.5)",
        },
      });

      // Xóa localStorage và chuyển về home sau 2 giây
      setTimeout(() => {
        localStorage.removeItem(`room_visited_${roomId}`);
        navigate('/home', { replace: true });
      }, 2000);
    }
  };

  socket.on('user-blocked', handleHostBlocked);

  return () => {
    socket.off('user-blocked', handleHostBlocked);
  };
}, [isHost, socket, roomId, navigate]);

// ============================================
// XỬ LÝ KHI PHÒNG BỊ KẾT THÚC (CHO MEMBER)
// ============================================
useEffect(() => {
  if (!socket) return;

  const handleRoomEndedByHostBlock = (data) => {
    if (data.reason === 'host-blocked') {
      console.log('🚫 [ROOM-ENDED] Phòng bị kết thúc do host bị chặn');
      
      toast.warning('Phòng đã kết thúc vì chủ phòng bị chặn.', {
        ...toastConfig,
        autoClose: 3000,
        icon: "⚠️",
        style: {
          ...toastConfig.style,
          background: "linear-gradient(135deg, #ff9800, #f57c00)",
          color: "#ffffff",
        },
      });

      // Xóa localStorage và chuyển về home
      setTimeout(() => {
        localStorage.removeItem(`room_visited_${roomId}`);
        navigate('/home', { replace: true });
      }, 2000);
    }
  };

  socket.on('room-ended', handleRoomEndedByHostBlock);

  return () => {
    socket.off('room-ended', handleRoomEndedByHostBlock);
  };
}, [socket, roomId, navigate]);

  // Host end room handler
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
        localStorage.removeItem(`room_visited_${roomId}`);
        navigate("/home");
      } else {
        Swal.fire("Lỗi", "Không thể kết thúc phòng. Vui lòng thử lại.", "error");
      }
    }
  };

  // Guest leave room handler
  const handleLeaveRoom = () => {
    socket.emit("leave-room", { roomId, userId: user._id });
    localStorage.removeItem(`room_visited_${roomId}`);
    navigate("/home");
  };

  // Report room handler
  const handleSubmitReport = async ({ category, details }) => {
    try {
      await reportRoom(roomId, { category, details });
      toast.success('Cảm ơn — báo cáo của bạn đã được gửi.', { ...toastConfig });
      setReportOpen(false);
    } catch (err) {
      console.error('Report failed', err);
      toast.error(err?.response?.data?.msg || 'Không thể gửi báo cáo. Vui lòng thử lại.');
    }
  };

  if (isLoading) return <div>Đang tải phòng...</div>;
  if (error) return <div>Lỗi: {error}</div>;
  if (!room) return <div>Không tìm thấy phòng.</div>;

  // compute whether participants are allowed to report: only when room is live and has music
  const hasPlaylist = Array.isArray(room?.playlist) && room.playlist.length > 0;
  const isPlayingFlag = !!room?.isPlaying;
  const canReport = room?.status === 'live' && (hasPlaylist || isPlayingFlag);
  
  return (
    <div className="roompage-container">
      {/* ================= HEADER ================= */}
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
              <button className="btn btn-danger-outline" onClick={handleEndRoom}>
                <XCircle size={16} />
                <span>Kết thúc</span>
              </button>
              <button className="btn btn-primary">
                <UserPlus size={16} />
                <span>Mời</span>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {(() => {
                // Only allow reporting when the room is "live" and there is music (playlist or playing)
                const hasPlaylist = Array.isArray(room?.playlist) && room.playlist.length > 0;
                const isPlaying = !!room?.isPlaying; // defensively check
                const canReport = room?.status === 'live' && (hasPlaylist || isPlaying);
                return (
                  <button
                    className={`btn btn-report-room ${!canReport ? 'disabled' : ''}`}
                    onClick={() => canReport && setReportOpen(true)}
                    title={canReport ? 'Báo cáo phòng' : 'Chỉ có thể báo cáo khi phòng đang phát nhạc'}
                    aria-disabled={!canReport}
                    disabled={!canReport}
                  >
                    <Flag size={16} />
                    <span>Báo cáo</span>
                  </button>
                );
              })()}
              <button className="btn btn-leave-room" onClick={handleLeaveRoom}>
                <LogOut size={16} />
                <span>Rời phòng</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="roompage-main new-layout">
        {/* ===== CỘT TRÁI: Join Requests + MusicPlayer ===== */}
        <div className="roompage-left-column">
          {/* Join requests box for host */}
          {isHost && joinRequests.length > 0 && (
            <div className="join-requests-container">
              <h3>Yêu cầu tham gia</h3>
              <ul>
                {joinRequests.map((r) => (
                  <li key={r.requester._id} className="join-request-item">
                    <div className="join-request-info">
                      <img
                        src={r.requester.avatar || "/default-avatar.png"}
                        alt={r.requester.username}
                      />
                      <div>
                        <div className="join-request-username">
                          {r.requester.username}
                        </div>
                        <div className="join-request-meta">Yêu cầu vào phòng</div>
                      </div>
                    </div>
                    <div className="join-request-actions">
                      {r.status && r.status !== "pending" ? (
                        <div className={`join-request-status ${r.status}`}>
                          {r.status === "accepted"
                            ? "Đã chấp nhận"
                            : "Đã từ chối"}
                        </div>
                      ) : (
                        <>
                          <button
                            className="btn btn-accept"
                            onClick={() =>
                              respondToRequest(r.requester._id, true)
                            }
                          >
                            Chấp nhận
                          </button>
                          <button
                            className="btn btn-deny"
                            onClick={() =>
                              respondToRequest(r.requester._id, false)
                            }
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Music Player */}
          <MusicPlayer
            roomData={room}
            isHost={isHost}
            roomId={roomId}
            socket={socket}
          />
        </div>

        {/* ===== CỘT PHẢI: Chat + Participants ===== */}
        <aside className="roompage-right">
          <div className="roompage-tabs">
            <div
              className={`roompage-tab ${
                activeTab === "chat" ? "active" : ""
              }`}
              onClick={() => setActiveTab("chat")}
            >
              Trò chuyện ({chatMessages.length})
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

          {/* Chat box (realtime) */}
          {activeTab === "chat" && (
            <div style={{ height: '570px', display: 'flex', flexDirection: 'column' }}>
              <RoomChat
                roomId={roomId}
                ownerId={room?.owner?._id}
                initialMessages={chatMessages} // <-- SỬA Ở ĐÂY
                onNewMessage={appendChatMessage}
                canReport={canReport}
                onOpenReport={() => setReportOpen(true)}
              />
            </div>
          )}

          {/* Participants list */}
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

          {/* Chat input is included inside RoomChat component */}
        </aside>
      </main>
      
      {/* Bottom-right join notification */}
      {joinNotification && (
        <div className="join-toast" role="status" aria-live="polite">
          <div className="join-toast-content">
            <img
              className="join-toast-avatar"
              src={joinNotification.avatar || '/default-avatar.png'}
              alt={joinNotification.username}
            />
            <div className="join-toast-body">
              <div className="join-toast-username">{joinNotification.username}</div>
              <div className="join-toast-subtitle">vừa vào phòng</div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Bottom-right leave notification */}
      {leaveNotification && (
        <div className="join-toast leave-toast" role="status" aria-live="polite">
          <div className="join-toast-content">
            <img
              className="join-toast-avatar"
              src={leaveNotification.avatar || '/default-avatar.png'}
              alt={leaveNotification.username}
            />
            <div className="join-toast-body">
              <div className="join-toast-username">{leaveNotification.username}</div>
              <div className="join-toast-subtitle">đã rời phòng</div>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      <ReportRoomModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={handleSubmitReport}
        roomName={room?.name}
      />

    </div>
  );
}

export default RoomPage;