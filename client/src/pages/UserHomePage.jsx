import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Plus, X, LogOut, UploadCloud, ArrowRight } from 'react-feather';
import axios from 'axios';
import RoomCard from '../components/RoomCard';
import ThamGiaPhong from '../components/ThamGiaPhong';
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
    const [visibleRoomsCount, setVisibleRoomsCount] = useState(8); // Tăng lên 8 cho đẹp hơn

    // HANDLE INPUT
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Giới hạn ký tự
        if (name === 'name' && value.length > 50) {
            return; // Không cho phép nhập thêm nếu vượt quá 50 ký tự
        }
        if (name === 'description' && value.length > 130) {
            return; // Không cho phép nhập thêm nếu vượt quá 130 ký tự
        }
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

    // HANDLE CREATE ROOM - LOGIC GIỮ NGUYÊN
    const handleCreateRoom = async (e) => {
        e.preventDefault();

        if (!coverImage) {
            alert('Vui lòng chọn ảnh bìa!');
            return;
        }

        closeModal();
        setIsCreatingRoom(true);
        setIsApiComplete(false);

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
            setCreatedRoomId(newRoom._id);
            setIsApiComplete(true);

        } catch (err) {
            console.error("❌ Lỗi khi gọi API tạo phòng:", err);
            setIsCreatingRoom(false);
            setIsApiComplete(false);
            alert(err.response?.data?.msg || 'Đã có lỗi xảy ra.');
        }
    };

    // LOGIC XỬ LÝ LOADING VÀ NAVIGATE GIỮ NGUYÊN
    const handleLoadingComplete = () => {
        if (isApiComplete && createdRoomId) {
            setIsCreatingRoom(false);
            navigate(`/room/${createdRoomId}`, {
                state: { fromCreate: true },
                replace: true
            });
        }
    };

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
        setVisibleRoomsCount(prevCount => prevCount + 8);
    };

    // TẤT CẢ LOGIC useEffect VÀ SOCKET.IO GIỮ NGUYÊN
    useEffect(() => {
        if (!socket) return;
        const handleRoomUpdate = ({ roomId, memberCount, status }) => {
            setRooms(prevRooms =>
                prevRooms.map(room => {
                    if (room._id === roomId) {
                        const updatedRoom = { ...room };
                        if (memberCount !== undefined) updatedRoom.memberCount = memberCount;
                        if (status) updatedRoom.status = status;
                        return updatedRoom;
                    }
                    return room;
                })
            );
        };
        socket.on('room-info-update', handleRoomUpdate);
        return () => socket.off('room-info-update', handleRoomUpdate);
    }, [socket]);

    // Exposed fetch function so other components can trigger a refresh
    const fetchActiveRooms = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get('http://localhost:8800/api/rooms/active');
            const data = Array.isArray(res.data) ? res.data : res.data.rooms || [];
            setRooms(data);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách phòng:", error);
            setRooms([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveRooms();

        // Listen for explicit refresh requests (dispatched when a user is redirected from a room)
        const refreshHandler = () => fetchActiveRooms();
        window.addEventListener('soundspace:refresh-home', refreshHandler);
        return () => window.removeEventListener('soundspace:refresh-home', refreshHandler);
    }, []);

    useEffect(() => {
        return () => {
            if (coverImagePreview) {
                URL.revokeObjectURL(coverImagePreview);
            }
        };
    }, [coverImagePreview]);

    useEffect(() => {
        if (!socket) return;
        const handleRoomCreated = (newRoom) => {
            setRooms(prevRooms => {
                if (prevRooms.some(r => r._id === newRoom._id)) return prevRooms;
                return [newRoom, ...prevRooms];
            });
        };
        const handleRoomEnded = ({ roomId }) => {
            setRooms(prevRooms => prevRooms.filter(room => room._id !== roomId));
        };
        socket.on('room-created', handleRoomCreated);
        socket.on('room-ended-homepage', handleRoomEnded);
        return () => {
            socket.off('room-created', handleRoomCreated);
            socket.off('room-ended-homepage', handleRoomEnded);
        };
    }, [socket]);

    if (!user) {
        return <div className="loading-message">Đang tải thông tin người dùng...</div>;
    }

    return (
        <div className="user-homepage">
            {isCreatingRoom && <LoadingTaoPhong onComplete={handleLoadingComplete} />}

            <header className="user-header">
                <div className="header-container">
                    <div className="header-logo">soundspace</div>
                    <div className="header-user-profile">
                        <img
                            className="user-avatar"
                            src={user.avatar || '/images/default-avatar.png'}
                            alt="Avatar"
                        />
                        <span className="user-name">{user.username}</span>
                        <button onClick={logout} className="logout-btn" title="Đăng xuất">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="user-main-content">
                {/* HERO SECTION MỚI */}
                <section className="hero-section">
                    <h1 className="hero-title">Chào mừng trở lại, {user.username}!</h1>
                    <p className="hero-subtitle">Khám phá không gian âm nhạc hoặc tạo phòng của riêng bạn.</p>
                    <div className="hero-actions">
                        <ThamGiaPhong /> {/* Component này được giữ nguyên */}
                        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                            <Plus size={20} />
                            Tạo phòng mới
                        </button>
                    </div>
                </section>

                <section className="room-list-section">
                    <div className="section-header">
                        <h2 className="section-title">Phòng đang hoạt động</h2>
                        <a href="#all-rooms" className="section-link">
                            Xem tất cả <ArrowRight size={16} />
                        </a>
                    </div>
                    <div className="room-grid">
                        {isLoading ? (
                            <p className="loading-text">Đang tải danh sách phòng...</p>
                        ) : rooms.length > 0 ? (
                            rooms.slice(0, visibleRoomsCount).map(room => (
                                <RoomCard key={room._id} room={room} />
                            ))
                        ) : (
                            <p className="empty-text">Hiện chưa có phòng nào đang hoạt động. Hãy là người đầu tiên tạo phòng!</p>
                        )}
                    </div>

                    {!isLoading && rooms.length > visibleRoomsCount && (
                        <div className="load-more-container">
                            <button onClick={handleLoadMore} className="btn btn-secondary">
                                Xem thêm
                            </button>
                        </div>
                    )}
                </section>
            </main>

            {/* MODAL TẠO PHÒNG - GIỮ NGUYÊN LOGIC, THAY ĐỔI GIAO DIỆN QUA CSS */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button onClick={closeModal} className="modal-close-btn">
                            <X size={24} />
                        </button>
                        <h2 className="modal-title">Tạo phòng nghe nhạc mới</h2>
                        <form onSubmit={handleCreateRoom} className="modal-form">
                            <div className="form-group">
                                <label>Ảnh bìa</label>
                                <div
                                    className="upload-area"
                                    onClick={() => fileInputRef.current.click()}
                                    style={{
                                        backgroundImage: coverImagePreview ? `url(${coverImagePreview})` : 'none',
                                    }}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        accept="image/png, image/jpeg, image/gif"
                                        style={{ display: 'none' }}
                                        required
                                    />
                                    {!coverImagePreview && (
                                        <>
                                            <UploadCloud size={48} />
                                            <p>Nhấp hoặc kéo thả ảnh vào đây</p>
                                            <span>PNG, JPG, GIF (tối đa 5MB)</span>
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
                                    maxLength={50}
                                    required
                                />
                                <small className="char-counter">{roomData.name.length}/50 ký tự</small>
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
                                    maxLength={130}
                                />
                                <small className="char-counter">{roomData.description.length}/130 ký tự</small>
                            </div>

                            <div className="form-group">
                                <label>Quyền riêng tư</label>
                                <div className="privacy-options">
                                    <label className="privacy-option">
                                        <input type="radio" name="privacy" value="public" checked={roomData.privacy === 'public'} onChange={handleInputChange} />
                                        <div className="privacy-option-content">
                                            <strong>Công khai</strong>
                                            <span>Bất kỳ ai cũng có thể tham gia.</span>
                                        </div>
                                    </label>
                                    <label className="privacy-option">
                                        <input type="radio" name="privacy" value="manual" checked={roomData.privacy === 'manual'} onChange={handleInputChange} />
                                        <div className="privacy-option-content">
                                            <strong>Cần xét duyệt</strong>
                                            <span>Bạn phải duyệt thủ công từng người.</span>
                                        </div>
                                    </label>
                                    <label className="privacy-option">
                                        <input type="radio" name="privacy" value="private" checked={roomData.privacy === 'private'} onChange={handleInputChange} />
                                        <div className="privacy-option-content">
                                            <strong>Riêng tư</strong>
                                            <span>Chỉ người có mã phòng mới vào được.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary btn-submit">Tạo phòng ngay</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserHomePage;