// client/src/pages/RoomPage.jsx
import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import {
  LogOut,
  XCircle,
  UserPlus,
  Flag
} from "react-feather";
import { Ghost } from "lucide-react";
import "./RoomPage.css";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MusicPlayer from "../components/MusicPlayer";
import PodcastRoom from "../components/PodcastRoom";
import RoomChat from "../components/RoomChat";
import ReportRoomModal from "../components/ReportRoomModal";
import { toastConfig } from "../services/toastConfig";
import { reportRoom } from "../services/api";
import RequestsList from "../components/SongRequest/RequestsList";
import SongRequestModal from "../components/SongRequest/SongRequestModal";
import useRoomNotifications from "../hooks/useRoomNotifications.jsx";
import NotificationCenter from "../components/Notifications/NotificationCenter";



function RoomPage() {
  // ============================================
  // REFS
  // ============================================
  const isGhostModeRef = useRef(false);
  const isReloading = useRef(false);
  const roomRef = useRef(null);
  const hasInitialized = useRef(false);
  const hasHandledRoomEnd = useRef(false);

  // ============================================
  // HOOKS
  // ============================================
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, socket } = useContext(AuthContext);

  useRoomNotifications(socket);

  // ============================================
  // STATES
  // ============================================
  const [room, setRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [joinNotification, setJoinNotification] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [leaveNotification, setLeaveNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // ============================================
  // SYNC ROOM TO REF
  // ============================================
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // ============================================
  // COMPUTED PROPERTIES
  // ============================================
  const isHost = user && room && user._id === room.owner._id;
  const hasPlaylist = Array.isArray(room?.playlist) && room.playlist.length > 0;
  const isPlayingFlag = !!room?.isPlaying;
  const canReport = room?.status === 'live' && (hasPlaylist || isPlayingFlag);

  // ============================================
  // APPEND CHAT MESSAGE
  // ============================================
  const appendChatMessage = useCallback((msg) => {
    setChatMessages((prevMessages) => {
      if (prevMessages.some((c) => String(c._id || c.id) === String(msg.id || msg._id))) {
        return prevMessages;
      }
      const newMsg = {
        _id: msg.id || msg._id,
        userId: msg.userId,
        username: msg.username,
        avatar: msg.avatar,
        text: msg.text,
        meta: msg.meta,
        createdAt: msg.createdAt,
        isGhost: msg.isGhost || false
      };
      return [...prevMessages, newMsg];
    });
  }, []);

  // ============================================
  // END ROOM API
  // ============================================
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

  // ============================================
  // HANDLE NEW JOIN REQUEST (HOST) - ONLY FOR NORMAL MODE
  // ============================================
  const handleNewJoinRequest = useCallback(
    ({ requester, roomId: requestedRoomId }) => {
      if (isGhostModeRef.current) return;

      if (roomId === requestedRoomId) {
        setJoinRequests((prev) => {
          if (prev.some((r) => r.requester._id === requester._id)) return prev;
          return [...prev, { requester, roomId: requestedRoomId, status: "pending" }];
        });
      }
    },
    [roomId]
  );

  // ============================================
  // RESPOND TO JOIN REQUEST
  // ============================================
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

  // ============================================
  // DETECT RELOAD/CLOSE
  // ============================================
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
  // DETECT GHOST MODE FROM LOCATION STATE (RUN ONCE)
  // ============================================
  useEffect(() => {
    if (location.state?.isGhostMode) {
      setIsGhostMode(true);
      isGhostModeRef.current = true;
    }
    // 🎙️ If navigation includes podcastMode, use it as hint
    if (location.state?.podcastMode) {
      console.log('🎙️ [RoomPage] Podcast mode detected from navigation state');
    }
  }, []);

  // ============================================
  // COMMENT DELETED LISTENER
  // ============================================
  useEffect(() => {
    if (!socket) return;

    const handleCommentDeleted = ({ commentId }) => {
      setChatMessages((prevMessages) =>
        prevMessages.filter((m) => String(m._id || m.id) !== String(commentId))
      );
    };

    socket.on('comment-deleted', handleCommentDeleted);
    return () => socket.off('comment-deleted', handleCommentDeleted);
  }, [socket]);

  // ============================================
  // ACTION NOTIFICATION (FROM ADMIN)
  // ============================================
  useEffect(() => {
    if (!socket) return;

    const handleActionNotification = ({ type, message }) => {
      switch (type) {
        case 'warning':
          toast.warn(message, { icon: "⚠️" });
          break;
        case 'error':
          toast.error(message, { icon: "🚫" });
          break;
        default:
          toast.info(message);
          break;
      }
    };

    socket.on('action-notification', handleActionNotification);
    return () => socket.off('action-notification', handleActionNotification);
  }, [socket]);

  // ============================================
  // MAIN USEEFFECT - FETCH & SOCKET SETUP
  // ============================================
  useEffect(() => {
    if (!user || !socket) return;

    let currentUserIsHost = false;
    let cleanedUp = false;
    let socketJoined = false;
    const roomKey = `room_visited_${roomId}`;
    const isGhostModeNow = isGhostModeRef.current;

    const fetchRoomDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        let { data: fetchedRoom } = await axios.get(
          `http://localhost:8800/api/rooms/${roomId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // ============================================
        // RELOAD HANDLING (SKIP FOR GHOST MODE)
        // ============================================
        if (!isGhostModeNow) {
          const hasVisited = localStorage.getItem(roomKey);
          const isReload = performance.navigation.type === 1 ||
            performance.getEntriesByType('navigation')[0]?.type === 'reload';
          const isNewNavigation = !!(location.state?.fromCreate ||
            location.state?.fromJoin ||
            location.state?.fromApproval ||
            location.state?.fromAdmin);

          if (isNewNavigation) {
            window.history.replaceState({}, document.title);
          }

          if (hasVisited && isReload && !isNewNavigation) {
            const userIsHost = String(user._id) === String(fetchedRoom.owner._id);
            localStorage.removeItem(roomKey);

            if (userIsHost) {
              toast.error("Host không được reload khi đang live! Phòng đã bị kết thúc.", {
                ...toastConfig,
                autoClose: 4200,
                icon: "💀",
              });
              await endRoomAPI();
              navigate("/home", { replace: true });
              return;
            } else {
              socket.emit("leave-room", { roomId, userId: user._id });
              toast.warning("Bạn đã reload trang — bạn đã bị đẩy ra khỏi phòng.", {
                ...toastConfig,
                icon: "🔄",
              });
              navigate("/home", { replace: true });
              return;
            }
          }
          if (!hasVisited) {
            localStorage.setItem(roomKey, "true");
          }
        }

        hasInitialized.current = true;

        // ============================================
        // 🔍 DEBUG: LOG PODCAST MODE
        // ============================================
        console.log('🎙️ [RoomPage] Fetched room data:', {
          roomId: fetchedRoom._id,
          name: fetchedRoom.name,
          podcastMode: fetchedRoom.podcastMode,
          podcastActive: fetchedRoom.podcastActive,
          podcastDuration: fetchedRoom.podcastDuration,
          status: fetchedRoom.status,
          privacy: fetchedRoom.privacy
        });

        // ============================================
        // AUTO-JOIN PUBLIC ROOM (SKIP FOR GHOST MODE)
        // ============================================
        if (!isGhostModeNow) {
          const isMember = (fetchedRoom.members || []).some(
            (m) => String(m._id) === String(user._id)
          );

          if (!isMember && fetchedRoom.privacy === "public") {
            try {
              const joinRes = await axios.post(
                `http://localhost:8800/api/rooms/${roomId}/join`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              fetchedRoom = joinRes.data.room || fetchedRoom;
            } catch (joinErr) {
              console.error("❌ Lỗi join phòng public:", joinErr);
            }
          }
        }

        if (cleanedUp) return;

        setRoom(fetchedRoom);
        setChatMessages(fetchedRoom.chat || []);

        const owner = fetchedRoom.owner ? [fetchedRoom.owner] : [];
        const otherMembers = (fetchedRoom.members || []).filter(
          (m) => String(m._id) !== String(fetchedRoom.owner?._id)
        );
        setMembers([...owner, ...otherMembers]);

        // ============================================
        // SOCKET JOIN: GHOST vs NORMAL
        // ============================================
        if (socket.connected) {
          if (isGhostModeNow) {
            socket.emit("join-room-ghost", { roomId, isAdmin: user.role === 'admin' });
          } else {
            socket.emit("join-room", roomId);
          }
          socketJoined = true;
        } else {
          socket.once("connect", () => {
            if (isGhostModeNow) {
              socket.emit("join-room-ghost", { roomId, isAdmin: user.role === 'admin' });
            } else {
              socket.emit("join-room", roomId);
            }
            socketJoined = true;
          });
        }

        if (String(user._id) === String(fetchedRoom.owner?._id)) {
          currentUserIsHost = true;
          socket.on("new-join-request", handleNewJoinRequest);
        }

        // ============================================
        // PLAYLIST/PLAYBACK LISTENERS
        // ============================================
        const handlePlaylistUpdated = (newPlaylist) => {
          setRoom((prev) => ({
            ...prev,
            playlist: Array.isArray(newPlaylist) ? newPlaylist : prev?.playlist || []
          }));
        };

        const handlePlaybackStateChanged = (newState) => {
          setRoom((prev) => ({
            ...prev,
            playlist: Array.isArray(newState?.playlist) ? newState.playlist : prev?.playlist,
            currentTrackIndex: newState?.currentTrackIndex ?? prev?.currentTrackIndex,
            isPlaying: newState?.isPlaying ?? prev?.isPlaying,
          }));
        };

        const handleRoomStatusChanged = (payload) => {
          if (!payload || String(payload.roomId || payload._id) !== String(roomId)) return;
          setRoom((prev) => ({ ...prev, status: payload.status ?? prev?.status }));
        };

        socket.on('playlist-updated', handlePlaylistUpdated);
        socket.on('playback-state-changed', handlePlaybackStateChanged);
        socket.on('room-status-changed', handleRoomStatusChanged);

        setIsLoading(false);

      } catch (err) {
        console.error("❌ Lỗi khi lấy thông tin phòng:", err);
        setError(err.response?.data?.msg || "Không thể tải phòng.");
        toast.error(err.response?.data?.msg || "Không thể tải phòng.");
        navigate("/home");
        setIsLoading(false);
      }
    };

    fetchRoomDetails();

    // ============================================
    // UPDATE MEMBERS
    // ============================================
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

    // ============================================
    // USER JOINED NOTIFICATION (IGNORE IN GHOST MODE)
    // ============================================
    const handleUserJoined = ({ username, avatar }) => {
      if (isGhostModeRef.current) return;
      if (user && user.username === username) return;

      setJoinNotification({ username, avatar: avatar || "/default-avatar.png", id: Date.now() });
      setTimeout(() => setJoinNotification(null), 15000);
    };

    socket.on("update-members", handleUpdateMembers);
    socket.on("user-joined-notification", handleUserJoined);

    // ============================================
    // CLEANUP
    // ============================================
    return () => {
      cleanedUp = true;

      socket.off("update-members", handleUpdateMembers);
      socket.off("user-joined-notification", handleUserJoined);
      socket.off("new-join-request", handleNewJoinRequest);
      socket.off('playlist-updated');
      socket.off('playback-state-changed');
      socket.off('room-status-changed');

      if (!isReloading.current && !isGhostModeNow) {
        localStorage.removeItem(roomKey);
      }

      if (socketJoined) {
        if (isGhostModeNow) {
          socket.emit("leave-room-ghost", { roomId });
        } else if (currentUserIsHost) {
          endRoomAPI();
        } else if (user) {
          socket.emit("leave-room", { roomId, userId: user._id });
        }
      }
    };
  }, [roomId, user, socket, navigate, endRoomAPI, handleNewJoinRequest]);

  // ============================================
  // USER LEFT NOTIFICATION + ROOM BANNED
  // ============================================
  useEffect(() => {
    if (!socket) return;

    const handleUserLeft = ({ username, avatar, userId }) => {
      if (isGhostModeRef.current) return;
      if (user && user._id === userId) return;

      setLeaveNotification({ username, avatar: avatar || "/default-avatar.png", id: Date.now() });
      setTimeout(() => setLeaveNotification(null), 15000);
    };

    const handleRoomBanned = (data) => {
      if (data && String(data.roomId) === String(roomId)) {
        toast.error('Phòng đã bị cấm bởi quản trị viên. Bạn sẽ được chuyển về trang chủ.', { ...toastConfig });
        localStorage.removeItem(`room_visited_${roomId}`);
        setTimeout(() => navigate('/home'), 1200);
      }
    };

    socket.on("user-left-notification", handleUserLeft);
    socket.on('room-banned', handleRoomBanned);

    return () => {
      socket.off("user-left-notification", handleUserLeft);
      socket.off('room-banned', handleRoomBanned);
    };
  }, [socket, user, roomId, navigate]);

  // ============================================
  // JOIN REQUEST ACCEPTED/DENIED
  // ============================================
  useEffect(() => {
    if (!socket) return;

    const handleJoinRequestAccepted = async ({ roomId: acceptedRoomId, room: payload }) => {
      if (isGhostModeRef.current) return;
      if (acceptedRoomId !== roomId) return;

      try {
        socket.emit("join-room", roomId);

        setRoom(payload);
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
          setRoom(freshRoom);
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
      if (isGhostModeRef.current) return;
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

  // ============================================
  // PREVENT HOST FROM CLOSING TAB (EXCEPT GHOST MODE)
  // ============================================
  useEffect(() => {
    if (!isHost || isGhostMode) return;

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
  }, [isHost, isGhostMode]);

  // ============================================
  // HOST BLOCKED
  // ============================================
  useEffect(() => {
    if (!isHost || !socket) return;

    const handleHostBlocked = ({ blocked, message }) => {
      if (blocked) {
        toast.error(message || 'Tài khoản của bạn đã bị chặn.', {
          ...toastConfig,
          autoClose: 3000,
          icon: "🚫",
        });

        setTimeout(() => {
          localStorage.removeItem(`room_visited_${roomId}`);
          navigate('/home', { replace: true });
        }, 2000);
      }
    };

    socket.on('user-blocked', handleHostBlocked);
    return () => socket.off('user-blocked', handleHostBlocked);
  }, [isHost, socket, roomId, navigate]);

  // ============================================
  // UNIFIED ROOM-ENDED
  // ============================================
  useEffect(() => {
    if (!socket) return;

    const handleUnifiedRoomEnded = (data) => {
      if (hasHandledRoomEnd.current) return;
      hasHandledRoomEnd.current = true;

      localStorage.removeItem(`room_visited_${roomId}`);

      // HOST BỊ CHẶN
      if (data.reason === "host-blocked") {
        toast.warning("Phòng đã kết thúc vì chủ phòng bị chặn.", { ...toastConfig });
        setTimeout(() => navigate("/home", { replace: true }), 2000);
        return;
      }

      // GHOST MODE
      if (isGhostModeRef.current) {
        toast.info("Phòng đã kết thúc bởi chủ phòng.", { ...toastConfig });
        setTimeout(() => navigate("/admin/quanlyphong", { replace: true }), 1500);
        return;
      }

      // NORMAL MEMBER
      if (!isHost) {
        toast.info(data.message || "Phòng đã được chủ phòng kết thúc.", { ...toastConfig });
      }

      navigate("/home", { replace: true });
    };

    socket.on("room-ended", handleUnifiedRoomEnded);
    return () => socket.off("room-ended", handleUnifiedRoomEnded);
  }, [socket, navigate, isHost, roomId]);

  // ============================================
  // HANDLE END ROOM
  // ============================================
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

  // ============================================
  // HANDLE LEAVE ROOM (GHOST MODE → ADMIN)
  // ============================================
  const handleLeaveRoom = useCallback(() => {
    if (isGhostMode && location.state?.returnToAdmin) {
      navigate('/admin/quanlyphong', { replace: true });
    } else {
      socket.emit("leave-room", { roomId, userId: user._id });
      localStorage.removeItem(`room_visited_${roomId}`);
      navigate("/home");
    }
  }, [isGhostMode, location.state, navigate, socket, roomId, user]);



  // ============================================
  // HANDLE SUBMIT REPORT
  // ============================================
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

  // ============================================
  // LOADING & ERROR STATES
  // ============================================
  if (isLoading) return <div>Đang tải phòng...</div>;
  if (error) return <div>Lỗi: {error}</div>;
  if (!room) return <div>Không tìm thấy phòng.</div>;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className={`roompage-container ${isGhostMode ? 'ghost-mode' : ''}`}>
      {isGhostMode && (
        <div className="ghost-mode-watermark">
          👻 Ghost Mode
        </div>
      )}

      <header className="roompage-header">
        <div className="roompage-header-info">
          {/* Bọc tên phòng và mã phòng vào một div chung */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ margin: 0 }}>{room.name}</h1>

            {/* Di chuyển Mã phòng vào trong div này */}
            {room.privacy === "private" && isHost && !isGhostMode && (
              <div className="roompage-roomcode">
                Mã phòng: <strong>{room.roomCode}</strong>
              </div>
            )}
          </div>

          {/* ✅ BỌC DESCRIPTION VÀ GHOST BADGE TRONG 1 DIV */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            {room.description && <p style={{ margin: 0 }}>{room.description}</p>}

            {isGhostMode && (
              <div className="roompage-ghost-badge">
                <Ghost size={16} />
                <span>Chế độ Ghost</span>
              </div>
            )}
          </div>
        </div>

        <div className="roompage-header-actions">
          {isHost && !isGhostMode ? (
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
              {!isGhostMode && (
                <button
                  className={`btn btn-report-room ${!canReport ? 'disabled' : ''}`}
                  onClick={() => canReport && setReportOpen(true)}
                  title={canReport ? 'Báo cáo phòng' : 'Chỉ có thể báo cáo khi phòng đang phát nhạc'}
                  disabled={!canReport}
                >
                  <Flag size={16} />
                  <span>Báo cáo</span>
                </button>
              )}

              {/* ✅ PHASE 5: NOTIFICATION CENTER */}
              {!isGhostMode && <NotificationCenter />}

              <button
                className={`btn-leave-room ${isGhostMode ? 'ghost-mode-btn' : ''}`}
                onClick={handleLeaveRoom}
              >
                <LogOut size={16} />
                <span>{isGhostMode ? 'Quay lại' : 'Rời phòng'}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="roompage-main new-layout">
        <div className="roompage-left-column">
          {isHost && !isGhostMode && joinRequests.length > 0 && (
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
                          {r.status === "accepted" ? "Đã chấp nhận" : "Đã từ chối"}
                        </div>
                      ) : (
                        <>
                          <button
                            className="btn btn-accept"
                            onClick={() => respondToRequest(r.requester._id, true)}
                          >
                            Chấp nhận
                          </button>
                          <button
                            className="btn btn-deny"
                            onClick={() => respondToRequest(r.requester._id, false)}
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
          {room?.podcastMode ? (
              <PodcastRoom 
                roomId={roomId} 
                role={isHost ? 'host' : 'listener'} 
                currentUser={user} 
                podcastDuration={room.podcastDuration} 
              />
            ) : (
            <MusicPlayer
              roomData={room}
              isHost={isHost}
              roomId={roomId}
              socket={socket}
              currentUserId={user?._id}
              onRequestOpen={() => setIsRequestModalOpen(true)}
              memberCount={members.length}
            />
          )}

          {/* ✅ FEATURE: SONG REQUESTS MODAL (Button & List now in MusicPlayer) */}
          {!isGhostMode && (
            <SongRequestModal
              isOpen={isRequestModalOpen}
              onClose={() => setIsRequestModalOpen(false)}
              roomId={roomId}
            />
          )}

        </div>

        <aside className="roompage-right">
          <div className="roompage-tabs">
            <div
              className={`roompage-tab ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              Trò chuyện ({chatMessages.length})
            </div>
            <div
              className={`roompage-tab ${activeTab === "participants" ? "active" : ""}`}
              onClick={() => setActiveTab("participants")}
            >
              Thành viên ({members.length})
            </div>

          </div>

          {activeTab === "chat" && (
            <div style={{ height: '570px', display: 'flex', flexDirection: 'column' }}>
              <RoomChat
                roomId={roomId}
                ownerId={room?.owner?._id}
                initialMessages={chatMessages}
                onNewMessage={appendChatMessage}
                isGhostMode={isGhostMode}
                canReport={canReport}
                onOpenReport={() => setReportOpen(true)}
              />
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


        </aside>
      </main>

      {joinNotification && !isGhostMode && (
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

      {leaveNotification && !isGhostMode && (
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