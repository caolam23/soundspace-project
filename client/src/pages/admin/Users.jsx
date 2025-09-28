import React, { useState } from "react";
import "./Users.css";
import { User, Edit, Lock, Unlock, Trash2 } from "lucide-react";

// Mock data
const recentUsers = [
  { id: 1, name: "Alice", email: "alice@example.com", role: "Admin", status: "active", joinDate: "20/09/2025" },
  { id: 2, name: "Bob", email: "bob@example.com", role: "Host", status: "active", joinDate: "18/09/2025" },
  { id: 3, name: "Charlie", email: "charlie@example.com", role: "Listener", status: "banned", joinDate: "15/09/2025" },
  { id: 4, name: "David", email: "david@example.com", role: "Listener", status: "active", joinDate: "10/09/2025" },
  { id: 5, name: "Eva", email: "eva@example.com", role: "Host", status: "active", joinDate: "08/09/2025" },
  { id: 6, name: "Frank", email: "frank@example.com", role: "Admin", status: "banned", joinDate: "05/09/2025" },
  { id: 7, name: "Grace", email: "grace@example.com", role: "Listener", status: "active", joinDate: "01/09/2025" },
  { id: 8, name: "Henry", email: "henry@example.com", role: "Host", status: "active", joinDate: "25/08/2025" },
  { id: 9, name: "Ivy", email: "ivy@example.com", role: "Listener", status: "banned", joinDate: "22/08/2025" },
  { id: 10, name: "Jack", email: "jack@example.com", role: "Admin", status: "active", joinDate: "20/08/2025" },
  { id: 11, name: "Kate", email: "kate@example.com", role: "Host", status: "active", joinDate: "15/08/2025" },
  { id: 12, name: "Leo", email: "leo@example.com", role: "Listener", status: "active", joinDate: "12/08/2025" },
  { id: 13, name: "Mia", email: "mia@example.com", role: "Admin", status: "banned", joinDate: "10/08/2025" },
  { id: 14, name: "Noah", email: "noah@example.com", role: "Listener", status: "active", joinDate: "07/08/2025" },
  { id: 15, name: "Olivia", email: "olivia@example.com", role: "Host", status: "active", joinDate: "05/08/2025" },
  { id: 16, name: "Paul", email: "paul@example.com", role: "Admin", status: "active", joinDate: "01/08/2025" },
  { id: 17, name: "Quinn", email: "quinn@example.com", role: "Listener", status: "banned", joinDate: "28/07/2025" },
  { id: 18, name: "Rachel", email: "rachel@example.com", role: "Host", status: "active", joinDate: "25/07/2025" },
  { id: 19, name: "Sam", email: "sam@example.com", role: "Listener", status: "active", joinDate: "22/07/2025" },
  { id: 20, name: "Tina", email: "tina@example.com", role: "Admin", status: "active", joinDate: "20/07/2025" },
];

const Users = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState(1);
  const usersPerPage = 5;
  const totalPages = Math.ceil(recentUsers.length / usersPerPage);

  // Lấy user theo trang
  const startIndex = (currentPage - 1) * usersPerPage;
  const currentUsers = recentUsers.slice(startIndex, startIndex + usersPerPage);

  return (
    <div className="users-wrapper">
      {/* Header */}
      <div className="users-header">
        <h2 className="users-title">Quản lý Users</h2>
        <button className="users-addBtn">Thêm User mới</button>
      </div>

      {/* Card */}
      <div className="users-card">
        {/* Filters */}
        <div className="users-filterBar">
          <div className="users-filters">
            <select className="users-select">
              <option>Tất cả vai trò</option>
              <option>Admin</option>
              <option>Host</option>
              <option>Listener</option>
            </select>
            <select className="users-select">
              <option>Tất cả trạng thái</option>
              <option>Hoạt động</option>
              <option>Bị khóa</option>
              <option>Bị cấm</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="users-tableWrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tham gia</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map(user => (
                <tr key={user.id}>
                  {/* User info */}
                  <td>
                    <div className="users-userInfo">
                      <div className="users-avatar">
                        <User className="users-avatarIcon" />
                      </div>
                      <div className="users-userText">
                        <div className="users-name">{user.name}</div>
                        <div className="users-email">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td>
                    <span
                      className={`users-role ${
                        user.role === "Admin"
                          ? "users-roleAdmin"
                          : user.role === "Host"
                          ? "users-roleHost"
                          : "users-roleListener"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <span
                      className={`users-status ${
                        user.status === "active"
                          ? "users-statusActive"
                          : "users-statusBanned"
                      }`}
                    >
                      {user.status === "active" ? "Hoạt động" : "Bị cấm"}
                    </span>
                  </td>

                  {/* Join date */}
                  <td>{user.joinDate}</td>

                  {/* Actions */}
                  <td>
                    <div className="users-actions">
                      <button className="users-btn users-editBtn">
                        <Edit className="users-icon" />
                      </button>
                      <button className="users-btn users-lockBtn">
                        {user.status === "active" ? (
                          <Lock className="users-icon" />
                        ) : (
                          <Unlock className="users-icon" />
                        )}
                      </button>
                      <button className="users-btn users-deleteBtn">
                        <Trash2 className="users-icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="users-pagination">
            <button
              onClick={() => {
                const newPage = Math.max(currentPage - 1, 1);
                setCurrentPage(newPage);
                setJumpPage(newPage);
              }}
              disabled={currentPage === 1}
              className="users-pageBtn"
            >
              &lt; Trước
            </button>

            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => {
                      setCurrentPage(page);
                      setJumpPage(page);
                    }}
                    className={`users-pageBtn ${
                      currentPage === page ? "users-activePage" : ""
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (
                (page === 2 && currentPage > 3) ||
                (page === totalPages - 1 && currentPage < totalPages - 2)
              ) {
                return <span key={page}>...</span>;
              }
              return null;
            })}

            <button
              onClick={() => {
                const newPage = Math.min(currentPage + 1, totalPages);
                setCurrentPage(newPage);
                setJumpPage(newPage);
              }}
              disabled={currentPage === totalPages}
              className="users-pageBtn"
            >
              Sau &gt;
            </button>

            <div className="users-quickJump">
              Chuyển đến trang:
              <input
                type="number"
                min="1"
                max={totalPages}
                value={jumpPage}
                onChange={(e) => {
                  let page = parseInt(e.target.value);
                  if (isNaN(page)) page = "";
                  setJumpPage(page);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    let page = parseInt(jumpPage);
                    if (isNaN(page)) page = 1;
                    page = Math.max(1, Math.min(totalPages, page));
                    setCurrentPage(page);
                    setJumpPage(page);
                  }
                }}
              />
              of {totalPages}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;
