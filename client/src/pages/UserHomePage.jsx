// client/src/pages/UserHomePage.jsx
import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Plus, X, LogOut, UploadCloud } from 'react-feather';
import axios from 'axios';
import RoomCard from '../components/RoomCard';
import ThamGiaPhong from '../components/ThamGiaPhong'; // ✅ IMPORT MỚI
import { useNavigate } from 'react-router-dom';
import LoadingTaoPhong from '../components/LoadingTaoPhong';
import './UserHomePage.css';

function UserHomePage() {
  const { user, logout, socket } = useContext(AuthContext);
  const navigate = useNavigate();

  // STATE cho tạo phòng
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomData, setRoomData] = useState({
    name: '',
    description: '',
    privacy: 'public',
  });
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const fileInputRef = useRef(null);

  // STATE cho loading tạo phòng
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState(null);
  const [isApiComplete, setIsApiComplete] = useState(false);

  // STATE cho danh sách phòng
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleRoomsCount, setVisibleRoomsCount] = useState(6);

  // HANDLE INPUT
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRoomData({ ...roomData, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setCoverImage(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setRoomData({ name: '', description: '', privacy: 'public' });
    setCoverImage(null);
    setCoverImagePreview('');
  };

  // ✅ HANDLE CREATE ROOM - HIỆN LOADING NGAY LẬP TỨC
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!coverImage) {
      alert('Vui lòng chọn ảnh bìa!');
      return;
    }

    // ✅ ĐÓNG MODAL VÀ HIỆN LOADING NGAY LẬP TỨC
    closeModal();
    setIsCreatingRoom(true);
    setIsApiComplete(false);

    // Chuẩn bị form data
    const formData = new FormData();
    formData.append('name', roomData.name);
    formData.append('description', roomData.description);
    formData.append('privacy', roomData.privacy);
    formData.append('coverImage', coverImage);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:8800/api/rooms/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      const newRoom = res.data.room;
      console.log("✅ Phòng đã tạo:", newRoom);

      // ✅ Lưu roomId và đánh dấu API đã xong
      setCreatedRoomId(newRoom._id);
      setIsApiComplete(true);

    } catch (err) {
      console.error("❌ Lỗi khi gọi API tạo phòng:", err);
      
      // Nếu lỗi thì tắt loading và hiện alert
      setIsCreatingRoom(false);
      setIsApiComplete(false);
      alert(err.response?.data?.msg || 'Đã có lỗi xảy ra.');
    }
  };

  // ✅ Xử lý khi loading hoàn tất (chỉ navigate khi CẢ loading VÀ API đều xong)
  const handleLoadingComplete = () => {
    // Chỉ navigate khi API đã hoàn thành
    if (isApiComplete && createdRoomId) {
      setIsCreatingRoom(false);
      navigate(`/room/${createdRoomId}`, {
        state: { fromCreate: true },
        replace: true
      });
    } else {
      // Nếu API chưa xong thì chờ thêm
      console.log("⏳ Loading xong nhưng API chưa hoàn thành, đang chờ...");
    }
  };

  // ✅ Khi API xong và loading cũng xong thì navigate
  useEffect(() => {
    if (isApiComplete && createdRoomId && !isCreatingRoom) {
      navigate(`/room/${createdRoomId}`, {
        state: { fromCreate: true },
        replace: true
      });
    }
  }, [isApiComplete, createdRoomId, isCreatingRoom, navigate]);

  // LOAD MORE ROOMS
  const handleLoadMore = () => {
    setVisibleRoomsCount(prevCount => prevCount + 9);
  };

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = ({ roomId, memberCount, status }) => {
      console.log(`⚡️ Realtime update for room ${roomId}:`, { memberCount, status });
      setRooms(prevRooms =>
        prevRooms.map(room => {
          if (room._id === roomId) {
            // Tạo một object mới với thông tin được cập nhật
            const updatedRoom = { ...room };
            if (memberCount !== undefined) {
              updatedRoom.memberCount = memberCount;
            }
            if (status) {
              updatedRoom.status = status;
            }
            return updatedRoom;
          }
          return room;
        })
      );
    };

    socket.on('room-info-update', handleRoomUpdate);

    // Dọn dẹp listener khi component unmount
    return () => {
      socket.off('room-info-update', handleRoomUpdate);
    };
  }, [socket]);

  // FETCH ACTIVE ROOMS khi load trang
  useEffect(() => {
    const fetchActiveRooms = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get('http://localhost:8800/api/rooms/active');
        console.log("API trả về:", res.data);
        const data = Array.isArray(res.data) ? res.data : res.data.rooms || [];
        setRooms(data);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách phòng:", error);
        setRooms([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchActiveRooms();
  }, []);

  // Cleanup ảnh preview
  useEffect(() => {
    return () => {
      if (coverImagePreview) {
        URL.revokeObjectURL(coverImagePreview);
      }
    };
  }, [coverImagePreview]);

  // SOCKET LISTENERS (Realtime phòng)
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (newRoom) => {
      console.log('🎉 Nhận được phòng mới:', newRoom);
      setRooms(prevRooms => {
        if (prevRooms.some(r => r._id === newRoom._id)) return prevRooms;
        return [newRoom, ...prevRooms];
      });
    };

    const handleRoomEnded = ({ roomId }) => {
      console.log(`🚪 Phòng ${roomId} đã kết thúc.`);
      setRooms(prevRooms => prevRooms.filter(room => room._id !== roomId));
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('room-ended-homepage', handleRoomEnded);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-ended-homepage', handleRoomEnded);
    };
  }, [socket]);

  // RENDER
  if (!user) {
    return <div className="loading-message">Đang tải thông tin người dùng...</div>;
  }

  return (
    <div className="user-theme">
      {/* ✅ LOADING TẠO PHÒNG - HIỆN NGAY KHI BẤM NÚT */}
      {isCreatingRoom && <LoadingTaoPhong onComplete={handleLoadingComplete} />}

      {/* HEADER */}
      <header className="user-page-header">
        <div className="header-container">
          <div className="header-logo">soundspace</div>

          {/* ✅ GROUP BUTTONS MỚI */}
          <div className="header-action-buttons">
            <ThamGiaPhong />
            <button onClick={() => setIsModalOpen(true)} className="create-room-button-header">
              <Plus className="create-room-icon" />
              <span className="create-room-text">Tạo phòng mới</span>
            </button>
          </div>

          <div className="header-user-profile">
            <span className="user-profile-welcome">Chào mừng, {user.username}!</span>
            <img
              className="user-profile-avatar"
              src={user.avatar || '/images/default-avatar.png'}
              alt="Avatar"
            />
            <button onClick={logout} className="user-profile-logout-btn">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="user-page-main-content">
        <div className="main-content-container">
          <section className="user-room-list-section">
            <h2 className="room-list-title">Phòng đang hoạt động</h2>
            <div className="room-grid-container">
              {isLoading ? (
                <p>Đang tải danh sách phòng...</p>
              ) : rooms.length > 0 ? (
                rooms.slice(0, visibleRoomsCount).map(room => (
                  <RoomCard key={room._id} room={room} />
                ))
              ) : (
                <p>Hiện chưa có phòng nào đang hoạt động.</p>
              )}
            </div>

            {!isLoading && rooms.length > visibleRoomsCount && (
              <div className="load-more-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button onClick={handleLoadMore} className="load-more-button">
                  Xem thêm
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* MODAL TẠO PHÒNG */}
      {isModalOpen && (
        <div className="create-room-modal-overlay" onClick={closeModal}>
          <div className="create-room-modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} className="modal-close-button">
              <X size={24} />
            </button>
            <h2 className="modal-title">Tạo phòng nghe nhạc</h2>
            <form onSubmit={handleCreateRoom} className="create-room-form">
              <div className="form-group">
                <label>Ảnh bìa</label>
                <div
                  className="upload-area"
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    backgroundImage: `url(${coverImagePreview})`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/png, image/jpeg, image/gif"
                    style={{ display: 'none' }}
                  />
                  {!coverImagePreview && (
                    <>
                      <UploadCloud size={48} color="var(--text-secondary)" />
                      <p>Kéo và thả file hoặc nhấp để chọn</p>
                      <span>PNG, JPG hoặc GIF (tối đa 5MB)</span>
                    </>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="roomName">Tên phòng</label>
                <input
                  type="text"
                  id="roomName"
                  name="name"
                  className="form-control"
                  placeholder="Ví dụ: Đêm nhạc Lofi & Chill"
                  value={roomData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="roomDescription">Mô tả ngắn</label>
                <textarea
                  id="roomDescription"
                  name="description"
                  className="form-control"
                  placeholder="Giới thiệu về phòng của bạn..."
                  value={roomData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Quyền riêng tư</label>
                <div className="privacy-options">
                  <label className="privacy-option">
                    <input
                      type="radio"
                      name="privacy"
                      value="public"
                      checked={roomData.privacy === 'public'}
                      onChange={handleInputChange}
                    />
                    <strong>Công khai (Auto-Join)</strong>
                    <span>Bất kỳ ai có mã đều có thể tham gia ngay.</span>
                  </label>
                  <label className="privacy-option">
                    <input
                      type="radio"
                      name="privacy"
                      value="manual"
                      checked={roomData.privacy === 'manual'}
                      onChange={handleInputChange}
                    />
                    <strong>Yêu cầu xét duyệt (Manual-Join)</strong>
                    <span>Bạn phải duyệt thủ công từng người nghe.</span>
                  </label>
                  <label className="privacy-option">
                    <input
                      type="radio"
                      name="privacy"
                      value="private"
                      checked={roomData.privacy === 'private'}
                      onChange={handleInputChange}
                    />
                    <strong>Phòng riêng tư (Dùng mã)</strong>
                    <span>Chỉ những người có mã phòng mới có thể tham gia.</span>
                  </label>
                </div>
              </div>
              <button type="submit" className="btn-submit-room">Tạo phòng ngay</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserHomePage;