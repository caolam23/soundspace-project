// src/pages/admin/Users.jsx
import React, { useState, useEffect, useContext } from "react";
import "./Users.css";
import { User, Edit, Lock, Unlock, Trash2, Ban } from "lucide-react";
import ChuyenTrang from "../../components/ChuyenTrang";
import { AuthContext } from "../../contexts/AuthContext";
import AddUserModal from "../../components/AddUserModal";
import EditUserModal from "../../components/EditUserModal"; // 🔥 Import EditUserModal

const Users = () => {
  const { socket } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState(1);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all'
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 🔥 State cho Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const usersPerPage = 5;

  // Fetch users từ API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8800/api/users');
      if (!response.ok) throw new Error('Không thể tải danh sách users');
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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Lắng nghe socket realtime
  useEffect(() => {
    if (!socket) return;

    const handleUserStatusChanged = ({ userId, status, lastActiveAt }) => {
      console.log(`🔄 Realtime update: User ${userId} status changed to ${status}`);
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId 
            ? { ...user, status, lastActiveAt }
            : user
        )
      );
    };

    socket.on('user-status-changed', handleUserStatusChanged);

    return () => {
      socket.off('user-status-changed', handleUserStatusChanged);
    };
  }, [socket]);

  // Handler khi thêm user thành công
  const handleUserAdded = () => {
    fetchUsers();
  };

  // 🔥 Handler khi edit user thành công
  const handleUserUpdated = () => {
    fetchUsers();
  };

  // 🔥 Handler mở modal edit
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  // Xử lý khóa/mở khóa user
  const handleLockUser = async (userId, isBlocked, role) => {
    if (role === 'admin') {
      alert('Không thể chặn tài khoản admin!');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn ${isBlocked ? 'mở khóa' : 'chặn'} user này?`)) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:8800/api/users/${userId}/toggle-lock`, {
        method: 'PUT',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể thay đổi trạng thái chặn');
      }
      await fetchUsers();
      alert(`User đã được ${isBlocked ? 'mở khóa' : 'chặn'} thành công!`);
    } catch (err) {
      alert('Lỗi khi thay đổi trạng thái chặn: ' + err.message);
    }
  };

  // Xử lý xóa user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa user này?')) return;
    try {
      const response = await fetch(`http://localhost:8800/api/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Không thể xóa user');
      await fetchUsers();
      alert('Xóa user thành công!');
    } catch (err) {
      alert('Lỗi khi xóa user: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getRoleDisplay = (role, currentRole) => {
    const displayRole = role || currentRole;
    switch (displayRole) {
      case 'admin': return 'Admin';
      case 'host': return 'Host';
      case 'listener': return 'Listener';
      case 'user': return 'User';
      default: return 'User';
    }
  };

  const getStatusDisplay = (status, isBlocked, reportCount) => {
    if (isBlocked) return 'locked';
    if (status === 'online') return 'active';
    if (status === 'offline') return 'offline';
    return 'active';
  };

  const filteredUsers = users.filter(user => {
    const userRole = (user.role || user.currentRole).toLowerCase();
    const roleMatch = filters.role === 'all' || filters.role === userRole;
    let statusMatch = true;
    if (filters.status !== 'all') {
      const userStatus = getStatusDisplay(user.status, user.isBlocked, user.reportCount);
      statusMatch = filters.status === userStatus;
    }
    return roleMatch && statusMatch;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  useEffect(() => {
    setCurrentPage(1);
    setJumpPage(1);
  }, [filters]);

  if (loading) {
    return <div className="users-wrapper"><h2 className="users-title">Đang tải...</h2></div>;
  }
  if (error) {
    return (
      <div className="users-wrapper">
        <h2 className="users-title">Lỗi: {error}</h2>
        <button onClick={fetchUsers} className="users-addBtn">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="users-wrapper">
      {/* Header */}
      <div className="users-header">
        <h2 className="users-title">Quản lý Users</h2>
        <button 
          className="users-addBtn"
          onClick={() => setIsModalOpen(true)}
        >
          Thêm User mới
        </button>
      </div>

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
              <option value="host">Host</option>
              <option value="listener">Listener</option>
              <option value="user">User</option>
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
                    <td>
                      <div className="users-userInfo">
                        <div className="users-avatar"><User className="users-avatarIcon" /></div>
                        <div className="users-userText">
                          <div className="users-name">{user.username || 'Không có tên'}</div>
                          <div className="users-email">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`users-role ${
                        displayRole === "Admin"
                          ? "users-roleAdmin"
                          : displayRole === "Host"
                          ? "users-roleHost"
                          : "users-roleListener"
                      }`}>
                        {displayRole}
                      </span>
                    </td>
                    <td>
                      <span className={`users-status ${
                        displayStatus === "active"
                          ? "users-statusActive"
                          : "users-statusBanned"
                      }`}>
                {displayStatus === "active" ? "Hoạt động" :
                 displayStatus === "offline" ? "Đã offline" :
                 displayStatus === "locked" ? "Bị khóa" :
                 "Không xác định"}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="users-actions">
                        {/* 🔥 Nút Edit - Mở modal */}
                        <button 
                          className="users-btn users-editBtn"
                          onClick={() => handleEditUser(user)}
                          title="Chỉnh sửa user"
                        >
                          <Edit className="users-icon" />
                        </button>
                         <button
                          className={`users-btn users-lockBtn ${displayStatus === "locked" ? "users-unlockBtn" : ""}`}
                          onClick={() => handleLockUser(user._id, user.isBlocked, user.role)}
                          disabled={user.role === 'admin'}
                          title={user.role === 'admin' ? 'Không thể chặn admin' : displayStatus === 'locked' ? 'Mở khóa user' : 'Chặn user'}
                        >
                          {displayStatus === "locked" ? (
                            <Ban className="users-icon" style={{ color: '#dc2626' }} />
                          ) : (
                            <Lock className="users-icon" />
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
        <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
          <ChuyenTrang
            totalPages={totalPages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            jumpPage={jumpPage}
            setJumpPage={setJumpPage}
          />
        </div>
      </div>

      {/* Modal thêm user */}
      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserAdded={handleUserAdded}
      />

      {/* 🔥 Modal edit user */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
};

export default Users;