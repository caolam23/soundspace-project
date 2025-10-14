import React, { useState, useEffect, useContext } from "react";
import "./QuanLyPhong.css";
import { Music, Eye, Trash2, X, Ban, CheckCircle } from "lucide-react";
import ChuyenTrang from "../../components/ChuyenTrang";
import axios from "axios";
import { AuthContext } from "../../contexts/AuthContext";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

const QuanLyPhong = () => {
  const { socket } = useContext(AuthContext);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRooms, setTotalRooms] = useState(0);
  const roomsPerPage = 5;

  // =============================================
  // FETCH ROOMS FROM API
  // =============================================
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const params = {
        page: currentPage,
        limit: roomsPerPage,
        status: statusFilter,
        search: searchTerm,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const { data } = await axios.get(
        "http://localhost:8800/api/admin/rooms",
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );

      if (data.success) {
        setRooms(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalRooms(data.pagination.totalRooms);
      }
    } catch (err) {
      console.error("❌ Lỗi fetch rooms:", err);
      toast.error(err.response?.data?.msg || "Không thể tải danh sách phòng");
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // REALTIME SOCKET UPDATES
  // =============================================
  useEffect(() => {
    if (!socket) {
      console.warn('⚠️ [QuanLyPhong] Socket not available');
      return;
    }

    const setupListeners = () => {
      // Khi có phòng mới được tạo
      const handleRoomCreated = (newRoom) => {
        fetchRooms();
      };

      // Khi phòng bị xóa
      const handleRoomDeleted = ({ roomId }) => {
        setRooms(prev => prev.filter(r => r.id !== roomId));
        toast.info("Một phòng vừa bị xóa");
      };

      // Khi phòng kết thúc
      const handleRoomEnded = ({ roomId }) => {
        fetchRooms();
      };

      // Khi số lượng members thay đổi
      const handleUpdateMembers = (data) => {
        // Optional: có thể fetchRooms() nếu muốn cập nhật số members
      };

      // Khi trạng thái phòng thay đổi (waiting → live)
      const handleRoomStatusChanged = ({ roomId, status, startedAt }) => {
        setRooms(prev => {
          const updated = prev.map(room => {
            if (room.id === roomId) {
              const updatedRoom = { ...room, status };
              if (startedAt) updatedRoom.startedAt = startedAt;
              return updatedRoom;
            }
            return room;
          });
          return updated;
        });
      };

      // Register all listeners
      socket.on("room-created", handleRoomCreated);
      socket.on("room-deleted", handleRoomDeleted);
      socket.on("room-ended-homepage", handleRoomEnded);
      socket.on("update-members", handleUpdateMembers);
      socket.on("room-status-changed", handleRoomStatusChanged);
    };

    if (socket.connected) {
      setupListeners();
    } else {
      socket.once('connect', setupListeners);
    }

    // Cleanup
    return () => {
      socket.off("room-created");
      socket.off("room-deleted");
      socket.off("room-ended-homepage");
      socket.off("update-members");
      socket.off("room-status-changed");
      socket.off('connect', setupListeners);
    };
  }, [socket]);

  // =============================================
  // FETCH WHEN FILTERS CHANGE
  // =============================================
  useEffect(() => {
    fetchRooms();
  }, [currentPage, statusFilter, searchTerm]);

  // =============================================
  // XÓA PHÒNG
  // =============================================
  const deleteRoom = async (roomId, roomName) => {
    const result = await Swal.fire({
      title: "Xác nhận xóa",
      text: `Bạn có chắc muốn xóa phòng "${roomName}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626"
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.delete(
          `http://localhost:8800/api/admin/rooms/${roomId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (data.success) {
          toast.success("Xóa phòng thành công!");
          fetchRooms();
        }
      } catch (err) {
        console.error("❌ Lỗi xóa phòng:", err);
        toast.error(err.response?.data?.msg || "Không thể xóa phòng");
      }
    }
  };

  // =============================================
  // CẤM/BỎ CẤM PHÒNG
  // =============================================
  const toggleBanRoom = async (roomId, isBanned, roomName) => {
    const action = isBanned ? "bỏ cấm" : "cấm";

    let banReason = "";
    if (!isBanned) {
      const { value } = await Swal.fire({
        title: `Cấm phòng "${roomName}"`,
        input: 'textarea',
        inputLabel: 'Lý do cấm',
        inputPlaceholder: 'Nhập lý do cấm phòng...',
        inputAttributes: {
          'aria-label': 'Nhập lý do cấm phòng'
        },
        showCancelButton: true,
        confirmButtonText: 'Cấm',
        cancelButtonText: 'Hủy'
      });

      if (!value) return;
      banReason = value;
    } else {
      const result = await Swal.fire({
        title: `Bỏ cấm phòng "${roomName}"?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Bỏ cấm",
        cancelButtonText: "Hủy"
      });

      if (!result.isConfirmed) return;
    }

    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.patch(
        `http://localhost:8800/api/admin/rooms/${roomId}/ban`,
        { banReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.msg);
        fetchRooms();
      }
    } catch (err) {
      console.error(`❌ Lỗi ${action} phòng:`, err);
      toast.error(err.response?.data?.msg || `Không thể ${action} phòng`);
    }
  };

  // =============================================
  // XEM CHI TIẾT PHÒNG
  // =============================================
  const openRoomDetail = async (roomId) => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        `http://localhost:8800/api/admin/rooms/${roomId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setSelectedRoom(data.data);
      }
    } catch (err) {
      console.error("❌ Lỗi lấy chi tiết phòng:", err);
      toast.error("Không thể tải chi tiết phòng");
    }
  };

  const closeRoomDetail = () => setSelectedRoom(null);

  // =============================================
  // HANDLE SEARCH
  // =============================================
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // =============================================
  // RENDER
  // =============================================
  if (loading && rooms.length === 0) {
    return <div className="QuanLyPhong-wrapper">Đang tải...</div>;
  }

  return (
    <div className="QuanLyPhong-wrapper">
      <div className="QuanLyPhong-header">
        <h2>Quản lý Phòng</h2>
      </div>

      <div className="QuanLyPhong-card">
        <div className="QuanLyPhong-filters">
          <select
            className="QuanLyPhong-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="waiting">Đang chờ</option>
            <option value="live">Hoạt động</option>
            <option value="ended">Đã kết thúc</option>
            <option value="banned">Bị cấm</option>
          </select>

          <input
            type="text"
            placeholder="Tìm theo tên phòng..."
            className="QuanLyPhong-input"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className="QuanLyPhong-tableWrapper">
          <table className="QuanLyPhong-table">
            <thead className="QuanLyPhong-thead">
              <tr>
                <th>Tên phòng</th>
                <th>Host</th>
                <th>Thành viên</th>
                <th>Trạng thái</th>
                <th>Tạo lúc</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody className="QuanLyPhong-tbody">
              {rooms.length > 0 ? (
                rooms.map(room => (
                  <tr key={room.id} className="QuanLyPhong-tr">
                    <td className="QuanLyPhong-td">
                      <div className="QuanLyPhong-roomName">
                        <div className="QuanLyPhong-iconWrapper">
                          <Music className="QuanLyPhong-icon" />
                        </div>
                        <div className="QuanLyPhong-roomText">{room.name}</div>
                      </div>
                    </td>
                    <td className="QuanLyPhong-td">{room.host}</td>
                    <td className="QuanLyPhong-td">{room.members}</td>
                    <td className="QuanLyPhong-td">
                      <span className={`QuanLyPhong-status ${
                        room.status === "waiting"
                          ? "QuanLyPhong-waiting"
                          : room.status === "live"
                            ? "QuanLyPhong-live"
                            : room.status === "ended"
                              ? "QuanLyPhong-ended"
                              : room.isBanned
                                ? "QuanLyPhong-banned"
                                : "QuanLyPhong-ended"
                        }`}>
                        {room.status === "waiting" ? "Đang chờ" :
                          room.status === "live" ? "Hoạt động" :
                            room.status === "ended" ? "Đã kết thúc" :
                              room.isBanned ? "Bị cấm" : "Không xác định"}
                      </span>
                    </td>
                    <td className="QuanLyPhong-td">{room.created}</td>
                    <td className="QuanLyPhong-td">
                      <div className="QuanLyPhong-actions">
                        <button
                          className="QuanLyPhong-eyeBtn"
                          onClick={() => openRoomDetail(room.id)}
                          title="Xem chi tiết"
                        >
                          <Eye className="QuanLyPhong-eyeIcon" />
                        </button>

                        <button
                          className={room.isBanned ? "QuanLyPhong-unbanBtn" : "QuanLyPhong-banBtn"}
                          onClick={() => toggleBanRoom(room.id, room.isBanned, room.name)}
                          title={room.isBanned ? "Bỏ cấm" : "Cấm phòng"}
                        >
                          {room.isBanned ? (
                            <CheckCircle size={16} />
                          ) : (
                            <Ban size={16} />
                          )}
                        </button>

                        <button
                          className="QuanLyPhong-trashBtn"
                          onClick={() => deleteRoom(room.id, room.name)}
                          title="Xóa phòng"
                        >
                          <Trash2 className="QuanLyPhong-trashIcon" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    {searchTerm ? "Không tìm thấy phòng nào" : "Chưa có phòng nào"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
          <ChuyenTrang
            totalPages={totalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            jumpPage={jumpPage}
            setJumpPage={setJumpPage}
          />
        </div>
      )}

      {/* Modal xem chi tiết */}
      {selectedRoom && (
        <div className="QuanLyPhong-modalOverlay">
          <div className="QuanLyPhong-modal">
            <div className="QuanLyPhong-modalHeader">
              <h3>Chi tiết phòng</h3>
              <button className="QuanLyPhong-closeBtn" onClick={closeRoomDetail}>
                <X size={20} />
              </button>
            </div>
            <div className="QuanLyPhong-modalContent">
              <p><strong>Tên phòng:</strong> {selectedRoom.name}</p>
              <p><strong>Mô tả:</strong> {selectedRoom.description || "Không có"}</p>
              <p><strong>Host:</strong> {selectedRoom.host}</p>
              <p><strong>Email Host:</strong> {selectedRoom.hostEmail}</p>
              <p><strong>Số thành viên:</strong> {selectedRoom.totalMembers}</p>
              <p><strong>Quyền riêng tư:</strong> {
                selectedRoom.privacy === 'public' ? 'Công khai' :
                  selectedRoom.privacy === 'manual' ? 'Phê duyệt' : 'Riêng tư'
              }</p>
              {selectedRoom.roomCode && (
                <p><strong>Mã phòng:</strong> {selectedRoom.roomCode}</p>
              )}
              <p><strong>Trạng thái:</strong> {
                selectedRoom.status === "waiting" ? "Đang chờ" :
                  selectedRoom.status === "live" ? "Hoạt động" :
                    selectedRoom.status === "ended" ? "Đã kết thúc" :
                      selectedRoom.isBanned ? "Bị cấm" : "Không xác định"
              }</p>
              {selectedRoom.isBanned && (
                <p><strong>Lý do cấm:</strong> {selectedRoom.banReason}</p>
              )}
              <p><strong>Ngày tạo:</strong> {new Date(selectedRoom.createdAt).toLocaleString('vi-VN')}</p>
              {selectedRoom.startedAt && (
                <p><strong>Bắt đầu:</strong> {new Date(selectedRoom.startedAt).toLocaleString('vi-VN')}</p>
              )}
              {selectedRoom.endedAt && (
                <p><strong>Kết thúc:</strong> {new Date(selectedRoom.endedAt).toLocaleString('vi-VN')}</p>
              )}

              <hr style={{ margin: "15px 0", border: "1px solid #e5e7eb" }} />

              <p><strong>Thống kê:</strong></p>
              <ul style={{ marginLeft: "20px" }}>
                <li>Tổng lượt tham gia: {selectedRoom.statistics?.totalJoins || 0}</li>
                <li>Số người tối đa: {selectedRoom.statistics?.peakMembers || 0}</li>
                <li>Tổng tin nhắn: {selectedRoom.statistics?.totalMessages || 0}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuanLyPhong;