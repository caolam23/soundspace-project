import React, { useState, useEffect } from "react";
import "./Users.css";
import { User, Edit, Lock, Unlock, Trash2 } from "lucide-react";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState(1);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all'
  });
  
  const usersPerPage = 5;

  // Fetch users từ API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8800/api/users');
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách users');
      }
      
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load users khi component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Xử lý xóa user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa user này?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8800/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Không thể xóa user');
      }
      
      // Refresh danh sách sau khi xóa
      await fetchUsers();
      alert('Xóa user thành công!');
    } catch (err) {
      alert('Lỗi khi xóa user: ' + err.message);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  // Convert role để hiển thị
  const getRoleDisplay = (role, currentRole) => {
    // Ưu tiên role (vai trò chính) thay vì currentRole
    const displayRole = role || currentRole;
    switch (displayRole) {
      case 'admin': return 'Admin';
      case 'host': return 'Host';        // Chủ phòng
      case 'listener': return 'Listener'; // Người nghe trong phòng
      case 'user': return 'User';         // Người dùng đã tạo tài khoản
      default: return 'User';
    }
  };

  // Convert status để hiển thị  
  const getStatusDisplay = (status, isBlocked, reportCount) => {
    if (isBlocked) return 'locked';              // Bị khóa
    if (reportCount > 0) return 'reported';      // Bị báo cáo
    if (status === 'online') return 'active';    // Hoạt động
    if (status === 'offline') return 'offline';  // Đã off
    return 'active';
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    // Ưu tiên role (vai trò chính) cho filter
    const userRole = (user.role || user.currentRole).toLowerCase();
    const roleMatch = filters.role === 'all' || 
                     (filters.role === 'admin' && userRole === 'admin') ||
                     (filters.role === 'host' && userRole === 'host') ||
                     (filters.role === 'listener' && userRole === 'listener') ||
                     (filters.role === 'user' && userRole === 'user');
    
    let statusMatch = true;
    if (filters.status !== 'all') {
      const userStatus = getStatusDisplay(user.status, user.isBlocked, user.reportCount);
      statusMatch = filters.status === 'active' ? userStatus === 'active' : 
                   filters.status === 'offline' ? userStatus === 'offline' :
                   filters.status === 'locked' ? userStatus === 'locked' :
                   filters.status === 'reported' ? userStatus === 'reported' :
                   true;
    }
    
    return roleMatch && statusMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  // Reset về trang 1 khi filter thay đổi
  useEffect(() => {
    setCurrentPage(1);
    setJumpPage(1);
  }, [filters]);

  if (loading) {
    return (
      <div className="users-wrapper">
        <div className="users-header">
          <h2 className="users-title">Đang tải...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="users-wrapper">
        <div className="users-header">
          <h2 className="users-title">Lỗi: {error}</h2>
          <button onClick={fetchUsers} className="users-addBtn">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

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
            <select 
              className="users-select"
              value={filters.role}
              onChange={(e) => setFilters(prev => ({...prev, role: e.target.value}))}
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Admin</option>
              <option value="host">Host (Chủ phòng)</option>
              <option value="listener">Listener (Người nghe)</option>
              <option value="user">User (Người dùng)</option>
            </select>
            <select 
              className="users-select"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="offline">Đã offline</option>
              <option value="locked">Bị khóa</option>
              <option value="reported">Bị báo cáo</option>
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
              {currentUsers.map(user => {
                const displayRole = getRoleDisplay(user.role, user.currentRole);
                const displayStatus = getStatusDisplay(user.status, user.isBlocked, user.reportCount);
                
                return (
                  <tr key={user._id}>
                    {/* User info */}
                    <td>
                      <div className="users-userInfo">
                        <div className="users-avatar">
                          <User className="users-avatarIcon" />
                        </div>
                        <div className="users-userText">
                          <div className="users-name">{user.username || 'Không có tên'}</div>
                          <div className="users-email">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <span
                        className={`users-role ${
                          displayRole === "Admin"
                            ? "users-roleAdmin"
                            : displayRole === "Host"
                            ? "users-roleHost"
                            : "users-roleListener"
                        }`}
                      >
                        {displayRole}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={`users-status ${
                          displayStatus === "active"
                            ? "users-statusActive"
                            : "users-statusBanned"
                        }`}
                      >
                        {displayStatus === "active" ? "Hoạt động" :
                         displayStatus === "offline" ? "Đã offline" :
                         displayStatus === "locked" ? "Bị khóa" :
                         displayStatus === "reported" ? "Bị báo cáo" : "Không xác định"}
                      </span>
                    </td>

                    {/* Join date */}
                    <td>{formatDate(user.createdAt)}</td>

                    {/* Actions */}
                    <td>
                      <div className="users-actions">
                        <button className="users-btn users-editBtn">
                          <Edit className="users-icon" />
                        </button>
                        <button className="users-btn users-lockBtn">
                          {displayStatus === "active" || displayStatus === "offline" ? (
                            <Lock className="users-icon" />
                          ) : (
                            <Unlock className="users-icon" />
                          )}
                        </button>
                        <button 
                          className="users-btn users-deleteBtn"
                          onClick={() => handleDeleteUser(user._id)}
                        >
                          <Trash2 className="users-icon" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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