import React, { useState } from "react";
import "./QuanLyPhong.css";
import { Music, Eye, Trash2, X } from "lucide-react";
import ChuyenTrang from "../../components/ChuyenTrang"; 

const QuanLyPhong = () => {
  // Mock data phòng
  const [activeRooms, setActiveRooms] = useState([
    { id: 1, name: "Phòng 1", host: "Alice", members: 5, status: "active", created: "28/09/2025" },
    { id: 2, name: "Phòng 2", host: "Bob", members: 3, status: "reported", created: "27/09/2025" },
    { id: 3, name: "Phòng 3", host: "Charlie", members: 8, status: "active", created: "26/09/2025" },
    { id: 4, name: "Phòng 4", host: "David", members: 2, status: "active", created: "25/09/2025" },
    { id: 5, name: "Phòng 5", host: "Eve", members: 6, status: "reported", created: "24/09/2025" },
    { id: 6, name: "Phòng 6", host: "Frank", members: 4, status: "active", created: "23/09/2025" },
    { id: 7, name: "Phòng 7", host: "Grace", members: 7, status: "active", created: "22/09/2025" },
  ]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState(1);
  const roomsPerPage = 5;
  const indexOfLastRoom = currentPage * roomsPerPage;
  const indexOfFirstRoom = indexOfLastRoom - roomsPerPage;
  const currentRooms = activeRooms.slice(indexOfFirstRoom, indexOfLastRoom);
  const totalPages = Math.ceil(activeRooms.length / roomsPerPage);

  // Xóa phòng
  const deleteRoom = (id) => {
    setActiveRooms(activeRooms.filter(room => room.id !== id));
    if ((currentPage - 1) * roomsPerPage >= activeRooms.length - 1) {
      setCurrentPage(Math.max(currentPage - 1, 1));
    }
  };

  // Modal xem chi tiết
  const [selectedRoom, setSelectedRoom] = useState(null);

  const openRoomDetail = (room) => setSelectedRoom(room);
  const closeRoomDetail = () => setSelectedRoom(null);

  // Hàm xử lý chuyển trang khi Enter hoặc blur
  const handleJump = () => {
    let page = parseInt(jumpPage);
    if (isNaN(page)) page = 1;
    page = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(page);
    setJumpPage(page);
  };

  return (
    <div className="QuanLyPhong-wrapper">
      <div className="QuanLyPhong-header">
        <h2>Quản lý Phòng</h2>
      </div>

      <div className="QuanLyPhong-card">
        <div className="QuanLyPhong-filters">
          <select className="QuanLyPhong-select">
            <option>Tất cả trạng thái</option>
            <option>Đang hoạt động</option>
            <option>Bị báo cáo</option>
            <option>Đã đóng</option>
          </select>
          <input
            type="text"
            placeholder="Tìm theo tên phòng..."
            className="QuanLyPhong-input"
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
              {currentRooms.length > 0 ? (
                currentRooms.map(room => (
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
                        room.status === "active"
                          ? "QuanLyPhong-active"
                          : "QuanLyPhong-reported"
                      }`}>
                        {room.status === "active" ? "Hoạt động" : "Báo cáo"}
                      </span>
                    </td>
                    <td className="QuanLyPhong-td">{room.created}</td>
                    <td className="QuanLyPhong-td">
                      <div className="QuanLyPhong-actions">
                        <button
                          className="QuanLyPhong-eyeBtn"
                          onClick={() => openRoomDetail(room)}
                        >
                          <Eye className="QuanLyPhong-eyeIcon" />
                        </button>
                        <button
                          className="QuanLyPhong-trashBtn"
                          onClick={() => deleteRoom(room.id)}
                        >
                          <Trash2 className="QuanLyPhong-trashIcon" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">Chưa có phòng nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div> {/* ✅ Đóng QuanLyPhong-card */}

      {/* Pagination thay bằng component */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
        <ChuyenTrang
          totalPages={totalPages}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          jumpPage={jumpPage}
          setJumpPage={setJumpPage}
        />      
      </div>

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
              <p><strong>Host:</strong> {selectedRoom.host}</p>
              <p><strong>Số thành viên:</strong> {selectedRoom.members}</p>
              <p><strong>Trạng thái:</strong> {selectedRoom.status === "active" ? "Hoạt động" : "Báo cáo"}</p>
              <p><strong>Ngày tạo:</strong> {selectedRoom.created}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuanLyPhong;
