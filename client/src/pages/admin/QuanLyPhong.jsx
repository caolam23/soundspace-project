import React, { useState, useEffect, useContext } from "react";
import "./QuanLyPhong.css";
import { Music, Eye, Trash2 } from "lucide-react";
import ChuyenTrang from "../../components/ChuyenTrang";
import axios from "axios";
import { AuthContext } from "../../contexts/AuthContext";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import ModalPhong from '../../components/ModalPhong';

/**
 * ✅ FEATURE: Room Management & Strict Duration
 * Admin dashboard for room management:
 * - View all rooms with pagination & filtering
 * - Track room status (waiting/live/ended)
 * - Monitor member count & session duration
 * - View room statistics & analytics
 * - Ban/unban rooms via modal
 * Implementation Date: April 2026
 */

// Helper object để dịch status (loại bỏ 'banned' vì không còn dùng)
const statusMap = {
  waiting: "Đang chờ",
  live: "Hoạt động",
  ended: "Đã kết thúc",
};

const QuanLyPhong = () => {
  const { socket } = useContext(AuthContext);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState(""); // State cho giá trị input trực tiếp

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

      // Loại bỏ 'banned' trong filter nếu cần, nhưng API có thể vẫn hỗ trợ status khác
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
      }
    } catch (err) {
      console.error("Lỗi fetch rooms:", err);
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
      console.warn('[QuanLyPhong] Socket not available');
      return;
    }

     // Stable handler references so we can remove them on cleanup
    const handleRoomCreated = () => fetchRooms();
    const handleRoomDeleted = ({ roomId }) => {
      setRooms(prev => prev.filter(r => r.id !== roomId));
      toast.info("Một phòng vừa bị xóa");
    };
    const handleRoomEnded = () => fetchRooms();
    const handleRoomStatusChanged = () => fetchRooms();
    const handleRoomMembersChanged = (payload) => {
      // payload: { roomId, membersCount, totalJoins, peakMembers }
      console.debug('[QuanLyPhong] room-members-changed received', payload);

      const pid = String(payload.roomId || payload.id || payload._id || '');

      let found = false;
      setRooms(prev => prev.map(r => {
        // Support multiple id shapes: r.id, r._id, r.roomId
        const rid = String(r.id ?? r._id ?? r.roomId ?? '');
        if (rid === pid) {
          found = true;
          return {
            ...r,
            members: (typeof payload.membersCount === 'number') ? payload.membersCount : r.members,
            statistics: {
              ...r.statistics,
              totalJoins: payload.totalJoins ?? r.statistics?.totalJoins,
              peakMembers: payload.peakMembers ?? r.statistics?.peakMembers,
            }
          };
        }
        return r;
      }));

      // If we didn't find a matching room row locally, refresh the list to pick up changes
      if (!found) {
        console.debug('[QuanLyPhong] changed room not in current page, fetching fresh list');
        fetchRooms().catch(e => console.warn('[QuanLyPhong] fetchRooms after members-changed failed', e));
      } else {
        // If we did find it, perform a single-room fetch to guarantee canonical members count
        // (fixes cases where some emits carry stale counts)
        (async () => {
          try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get(`http://localhost:8800/api/admin/rooms/${payload.roomId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (data && data.success) {
              setRooms(prev => prev.map(r => {
                if (String(r.id) === String(payload.roomId) || String(r._id) === String(payload.roomId) || String(r.roomId) === String(payload.roomId)) {
                  const updated = data.data;
                  return {
                    ...r,
                    members: updated.members?.length ?? updated.members ?? r.members,
                    statistics: {
                      ...r.statistics,
                      totalJoins: updated.statistics?.totalJoins ?? r.statistics?.totalJoins,
                      peakMembers: updated.statistics?.peakMembers ?? r.statistics?.peakMembers,
                    }
                  };
                }
                return r;
              }));
            }
          } catch (e) {
            console.warn('[QuanLyPhong] fetch single room after members-changed failed', e);
          }
        })();
      }
    };

    // Attach listeners immediately so they survive reconnects; on reconnect we refresh
    socket.on("room-created", handleRoomCreated);
    socket.on("room-deleted", handleRoomDeleted);
    socket.on("room-ended-homepage", handleRoomEnded);
    socket.on("room-status-changed", handleRoomStatusChanged);
    socket.on("room-members-changed", handleRoomMembersChanged);

    const onConnectRefresh = () => {
      console.log('[QuanLyPhong] socket connected - refreshing rooms');
      fetchRooms().catch(e => console.warn('[QuanLyPhong] fetchRooms on connect failed', e));
    };
    socket.on('connect', onConnectRefresh);
    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("room-deleted", handleRoomDeleted);
      socket.off("room-ended-homepage", handleRoomEnded);
      socket.off("room-status-changed", handleRoomStatusChanged);
      socket.off("room-members-changed", handleRoomMembersChanged);
      socket.off('connect', onConnectRefresh);
    };
  }, [socket]);

  // =============================================
  // FETCH WHEN FILTERS CHANGE
  // =============================================
  useEffect(() => {
    // 🐛 BUG: Memory leak - debounce timer not cleared on component unmount
    // TODO: Add cleanup function in useEffect return to clear timeout
    const delayDebounceFn = setTimeout(() => {
        fetchRooms();
    }, 300); // Thêm một chút delay để tránh gọi API liên tục khi filter

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, statusFilter, searchTerm]);

  // =============================================
  // DELETE ROOM
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
        console.error("Lỗi xóa phòng:", err);
        toast.error(err.response?.data?.msg || "Không thể xóa phòng");
      }
    }
  };

  // =============================================
  // VIEW ROOM DETAILS
  // =============================================
  const openRoomDetail = async (roomId) => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        `http://localhost:8800/api/admin/rooms/${roomId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) setSelectedRoom(data.data);
    } catch (err) {
      console.error("Lỗi lấy chi tiết phòng:", err);
      toast.error("Không thể tải chi tiết phòng");
    }
  };

  const closeRoomDetail = () => setSelectedRoom(null);
  
  // =============================================
  // HANDLE SEARCH ON ENTER
  // =============================================
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setSearchTerm(inputValue);
      setCurrentPage(1);
    }
  };

  // =============================================
  // CLEAR FILTERS
  // =============================================
  const clearSearchFilter = () => {
    setSearchTerm('');
    setInputValue('');
    setCurrentPage(1);
  };

  const clearStatusFilter = () => {
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // =============================================
  // RENDER
  // =============================================
  if (loading && rooms.length === 0) {
    return <div className="QuanLyPhong-wrapper">Đang tải dữ liệu phòng...</div>;
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
            {/* Loại bỏ option banned */}
          </select>

          <input
            type="text"
            placeholder="Tìm theo tên phòng và nhấn Enter..."
            className="QuanLyPhong-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* ============================================= */}
        {/* PHẦN BỘ LỌC ĐÃ CẬP NHẬT (loại bỏ banned)     */}
        {/* ============================================= */}
        {(searchTerm || statusFilter !== 'all') && (
          <div className="QuanLyPhong-activeFilters">
            <span>Đang lọc với:</span>
            {searchTerm && (
              <span className="QuanLyPhong-filterTag">
                Từ khóa: "{searchTerm}"
                <button 
                  onClick={clearSearchFilter} 
                  className="QuanLyPhong-filterTag-close" 
                  title="Xóa bộ lọc từ khóa"
                >
                  ×
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="QuanLyPhong-filterTag">
                Trạng thái: {statusMap[statusFilter]}
                <button 
                  onClick={clearStatusFilter} 
                  className="QuanLyPhong-filterTag-close" 
                  title="Xóa bộ lọc trạng thái"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

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
                        room.status === "waiting" ? "QuanLyPhong-waiting"
                        : room.status === "live" ? "QuanLyPhong-live"
                        : "QuanLyPhong-ended"
                        }`}>
                        {statusMap[room.status] || "Không xác định"}
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
                          <Eye size={18} />
                        </button>
                        <button
                          className="QuanLyPhong-trashBtn"
                          onClick={() => deleteRoom(room.id, room.name)}
                          title="Xóa phòng"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    {loading ? "Đang tìm kiếm..." : 
                      searchTerm ? `Không tìm thấy phòng nào với từ khóa "${searchTerm}"` : "Chưa có phòng nào"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="QuanLyPhong-pagination">
          <ChuyenTrang
            totalPages={totalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            jumpPage={jumpPage}
            setJumpPage={setJumpPage}
          />
        </div>
      )}

      <ModalPhong
        isOpen={!!selectedRoom}
        onClose={closeRoomDetail}
        room={selectedRoom}
      />
    </div>
  );
};

export default QuanLyPhong;