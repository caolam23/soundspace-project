// client/src/pages/UserHomePage.jsx
import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Plus, X, LogOut, UploadCloud } from 'react-feather';
import axios from 'axios';
import RoomCard from '../components/RoomCard';
import { useNavigate } from 'react-router-dom';
import './UserHomePage.css';

function UserHomePage() {
  const { user, logout, socket } = useContext(AuthContext);
  const navigate = useNavigate();

  // ==============================
  // STATE cho tạo phòng
  // ==============================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomData, setRoomData] = useState({
    name: '',
    description: '',
    privacy: 'public',
  });
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const fileInputRef = useRef(null);

  // ==============================
  // STATE cho danh sách phòng
  // ==============================
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleRoomsCount, setVisibleRoomsCount] = useState(6);

  // ==============================
  // HANDLE INPUT
  // ==============================
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

  // ==============================
  // HANDLE CREATE ROOM
  // ==============================
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', roomData.name);
    formData.append('description', roomData.description);
    formData.append('privacy', roomData.privacy);

    if (coverImage) {
      formData.append('coverImage', coverImage);
    } else {
      alert('Vui lòng chọn ảnh bìa!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:8800/api/rooms/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      const newRoom = res.data.room;
      console.log("Phòng đã tạo:", newRoom);

      closeModal();
      // Redirect Host vào phòng
      navigate(`/room/${newRoom._id}`);

    } catch (err) {
      console.error("Lỗi khi gọi API tạo phòng:", err);
      alert(err.response?.data?.msg || 'Đã có lỗi xảy ra.');
    }
  };

  // ==============================
  // LOAD MORE ROOMS
  // ==============================
  const handleLoadMore = () => {
    setVisibleRoomsCount(prevCount => prevCount + 9);
  };

  // ==============================
  // FETCH ACTIVE ROOMS khi load trang
  // ==============================
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

  // ==============================
  // Cleanup ảnh preview
  // ==============================
  useEffect(() => {
    return () => {
      if (coverImagePreview) {
        URL.revokeObjectURL(coverImagePreview);
      }
    };
  }, [coverImagePreview]);

  // ==============================
  // SOCKET LISTENERS (Realtime phòng)
  // ==============================
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

  // ==============================
  // SOCKET LISTENERS (Join Request)
  // ==============================
  useEffect(() => {
    if (!socket) return;

    socket.on('new-join-request', ({ requester, roomId }) => {
      const accept = window.confirm(
        `Người dùng "${requester.username}" muốn tham gia phòng của bạn. Đồng ý?`
      );
      socket.emit('respond-to-request', {
        requesterId: requester.id,
        roomId: roomId,
        accepted: accept
      });
    });

    socket.on('join-request-accepted', ({ roomId }) => {
      alert('Yêu cầu được chấp nhận! Bạn sẽ được chuyển vào phòng.');
      navigate(`/room/${roomId}`);
    });

    socket.on('join-request-denied', ({ message }) => {
      alert(message || 'Yêu cầu tham gia bị từ chối.');
    });

    return () => {
      socket.off('new-join-request');
      socket.off('join-request-accepted');
      socket.off('join-request-denied');
    };
  }, [socket, navigate]);

  // ==============================
  // RENDER
  // ==============================
  if (!user) {
    return <div className="loading-message">Đang tải thông tin người dùng...</div>;
  }

  return (
    <div className="user-theme">
      {/* HEADER */}
      <header className="user-page-header">
        <div className="header-container">
          <div className="header-logo">soundspace</div>

          <button onClick={() => setIsModalOpen(true)} className="create-room-button-header">
            <Plus className="create-room-icon" />
            <span className="create-room-text">Tạo phòng mới</span>
          </button>

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
