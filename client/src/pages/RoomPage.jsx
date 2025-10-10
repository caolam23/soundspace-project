// client/src/pages/RoomPage.jsx
import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
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
import MusicPlayer from "../components/MusicPlayer"; 

function RoomPage() {
  const roomRef = useRef(null);
  const { roomId } = useParams();
  const navigate = useNavigate();

  // ✅ Lấy socket trực tiếp từ AuthContext
  const { user, socket } = useContext(AuthContext);

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [hostFeedback, setHostFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("chat");

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

  // Giữ roomRef luôn đồng bộ
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const isHost = user && room && user._id === room.owner._id;

  // ======================
  // API kết thúc phòng
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
      console.error("Có lỗi xảy ra khi kết thúc phòng:", err);
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

  let currentUserIsHost = false;
  let cleanedUp = false;
  let socketJoined = false; // ✅ Track xem đã join socket chưa

  const fetchRoomDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      let { data: fetchedRoom } = await axios.get(
        `http://localhost:8800/api/rooms/${roomId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const isMember = (fetchedRoom.members || []).some(
        (m) => String(m._id) === String(user._id)
      );

      // ✅ CHỈ auto-join nếu là PUBLIC và chưa là member
      if (!isMember && fetchedRoom.privacy === "public") {
        try {
          const joinRes = await axios.post(
            `http://localhost:8800/api/rooms/${roomId}/join`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          fetchedRoom = joinRes.data.room || fetchedRoom;
        } catch (joinErr) {
          console.error("Lỗi join phòng public:", joinErr);
        }
      }

      if (cleanedUp) return;
      setRoom(fetchedRoom);

      const owner = fetchedRoom.owner ? [fetchedRoom.owner] : [];
      const otherMembers = (fetchedRoom.members || []).filter(
        (m) => String(m._id) !== String(fetchedRoom.owner?._id)
      );
      setMembers([...owner, ...otherMembers]);

      // ✅ Emit join-room socket
      if (socket.connected) {
        socket.emit("join-room", roomId);
        socketJoined = true; // ✅ Đánh dấu đã join
      } else {
        console.warn("Socket chưa sẵn sàng, chờ connect...");
        socket.once("connect", () => {
          console.log("Socket đã kết nối, emit join-room");
          socket.emit("join-room", roomId);
          socketJoined = true; // ✅ Đánh dấu đã join
        });
      }

      if (String(user._id) === String(fetchedRoom.owner?._id)) {
        currentUserIsHost = true;
        socket.on("new-join-request", handleNewJoinRequest);
      }
    } catch (err) {
      console.error("Lỗi khi lấy thông tin phòng:", err);
      setError(err.response?.data?.msg || "Không thể tải phòng.");
      toast.error(err.response?.data?.msg || "Không thể tải phòng.");
      navigate("/home");
    } finally {
      setIsLoading(false);
    }
  };

  fetchRoomDetails();

  // Event handlers (giữ nguyên)
  const handleUpdateMembers = (data) => {
    const updatedMembers = data.members || data;
    if (!updatedMembers || updatedMembers.length === 0) return;
    
    console.log("📥 Received update-members:", updatedMembers.map(m => m.username));
    
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

  // ✅ CLEANUP đã sửa
  return () => {
    cleanedUp = true;
    
    // ✅ CHỈ emit leave-room nếu ĐÃ join socket thành công
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
  };
}, [roomId, user, socket, navigate, handleNewJoinRequest, endRoomAPI]);

  // ======================
  // Guest nhận phản hồi join
  // ======================
  useEffect(() => {
    const handleJoinRequestAccepted = async ({ roomId: acceptedRoomId, room: payload }) => {
      if (acceptedRoomId !== roomId) return;
      
      console.log("✅ Join request accepted, payload:", payload);
      
      try {
        // 1. Join socket room NGAY LẬP TỨC
        socket.emit("join-room", roomId);
        console.log("🔌 Emitted join-room for:", roomId);
        
        // 2. Cập nhật state từ payload socket (đã có data đầy đủ)
        setRoom(payload);
        const owner = payload.owner ? [payload.owner] : [];
        const otherMembers = (payload.members || []).filter(
          (m) => String(m._id) !== String(payload.owner?._id)
        );
        setMembers([...owner, ...otherMembers]);
        
        console.log("📋 Members from payload:", [...owner, ...otherMembers].map(m => m.username));
        
        toast.success("Bạn đã được chủ phòng chấp nhận — đang vào phòng!");
        
        // 3. Đợi một chút để server xử lý xong rồi mới fetch
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 4. Fetch lại từ API để verify (optional, nhưng để đảm bảo)
        const token = localStorage.getItem("token");
        const { data: freshRoom } = await axios.get(
          `http://localhost:8800/api/rooms/${roomId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log("🔄 Fresh room from API:", freshRoom);
        console.log("📋 Fresh members:", freshRoom.members);
        
        // 5. Chỉ update nếu data mới khác data cũ
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

  // ======================
  // Ngăn host tắt tab khi đang live
  // ======================
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
          <button className="btn" onClick={handleLeaveRoom}>
            <LogOut size={16} />
            <span>Rời phòng</span>
          </button>
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

        {/* Trình phát nhạc */}
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

        {/* Chat box */}
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
                  <div className="roompage-chat-username">{msg.username}</div>
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

        {/* Chat input */}
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