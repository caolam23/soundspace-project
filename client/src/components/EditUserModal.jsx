// src/components/EditUserModal.jsx
import React, { useState, useEffect } from 'react';
import './EditUserModal.css';
import { X, User, Shield, Lock, Eye, EyeOff, Mail, AlertCircle } from 'lucide-react';

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'user',
    currentRole: 'user',
    newPassword: '',
    requirePasswordChange: false,
    sendResetEmail: false
  });

  const [showPassword, setShowPassword] = useState(false);

  // Reset form khi modal mở/đóng
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'user',
        currentRole: user.currentRole || 'user',
        newPassword: '',
        requirePasswordChange: user.requirePasswordChange || false,
        sendResetEmail: false
      });
      setActiveTab('info');
      setError('');
      setSuccess('');
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, newPassword: password }));
    setShowPassword(true);
  };

  const validateForm = () => {
    if (activeTab === 'info') {
      if (!formData.username.trim()) {
        setError('Username không được để trống');
        return false;
      }
      if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
        setError('Email không hợp lệ');
        return false;
      }
    }

    if (activeTab === 'security') {
      if (formData.newPassword && (formData.newPassword.length < 8 || formData.newPassword.length > 20)) {
        setError('Password phải có từ 8-20 ký tự');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let endpoint = '';
      let method = 'PUT';
      let body = {};

      // Xác định endpoint và payload dựa trên tab hiện tại
      if (activeTab === 'info') {
        endpoint = `http://localhost:8800/api/users/${user._id}/update-info`;
        body = {
          username: formData.username,
          email: formData.email
        };
      } else if (activeTab === 'permissions') {
        endpoint = `http://localhost:8800/api/users/${user._id}/update-role`;
        body = {
          role: formData.role,
          currentRole: formData.currentRole
        };
      } else if (activeTab === 'security') {
        endpoint = `http://localhost:8800/api/users/${user._id}/reset-password`;
        body = {
          newPassword: formData.newPassword,
          requirePasswordChange: formData.requirePasswordChange,
          sendResetEmail: formData.sendResetEmail
        };
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Cập nhật thất bại');
      }

      setSuccess(data.message || 'Cập nhật thành công!');

      // Gọi callback để refresh danh sách
      setTimeout(() => {
        onUserUpdated();
        onClose();
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="editUserModal-overlay" onClick={onClose}>
      <div className="editUserModal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="editUserModal-header">
          <div className="editUserModal-headerLeft">
            <div className="editUserModal-userAvatar">
              <img
                src={user.avatar || '/images/default-avatar.png'}
                alt="User avatar"
                className="editUserModal-avatarImg"
                onError={(e) => (e.target.src = '/images/default-avatar.png')}
              />
            </div>
            <div>
              <h2 className="editUserModal-title">Chỉnh sửa User</h2>
              <p className="editUserModal-subtitle">{user.email}</p>
            </div>
          </div>
          <button className="editUserModal-closeBtn" onClick={onClose}>
            <X className="editUserModal-closeIcon" />
          </button>
        </div>

        {/* Tabs */}
        <div className="editUserModal-tabs">
          <button
            className={`editUserModal-tab ${activeTab === 'info' ? 'editUserModal-tabActive' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <User className="editUserModal-tabIcon" />
            Thông tin
          </button>
          <button
            className={`editUserModal-tab ${activeTab === 'permissions' ? 'editUserModal-tabActive' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            <Shield className="editUserModal-tabIcon" />
            Phân quyền
          </button>
          <button
            className={`editUserModal-tab ${activeTab === 'security' ? 'editUserModal-tabActive' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock className="editUserModal-tabIcon" />
            Bảo mật
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="editUserModal-alert editUserModal-alertError">
            <AlertCircle className="editUserModal-alertIcon" />
            {error}
          </div>
        )}

        {success && (
          <div className="editUserModal-alert editUserModal-alertSuccess">
            <AlertCircle className="editUserModal-alertIcon" />
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="editUserModal-form">
          {/* Tab 1: Thông tin cơ bản */}
          {activeTab === 'info' && (
            <div className="editUserModal-tabContent">
              <div className="editUserModal-formGroup">
                <label className="editUserModal-label">
                  Username <span className="editUserModal-required">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="editUserModal-input"
                  placeholder="Nhập username"
                  required
                />
              </div>

              <div className="editUserModal-formGroup">
                <label className="editUserModal-label">
                  Email <span className="editUserModal-required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="editUserModal-input"
                  placeholder="example@email.com"
                  required
                />
              </div>
            </div>
          )}

          {/* Tab 2: Phân quyền */}
          {activeTab === 'permissions' && (
            <div className="editUserModal-tabContent">
              <div className="editUserModal-infoBox editUserModal-infoBoxWarning">
                <AlertCircle className="editUserModal-infoIcon" />
                <div>
                  <strong>Lưu ý:</strong> Thay đổi vai trò sẽ ảnh hưởng đến quyền truy cập của user
                </div>
              </div>

              <div className="editUserModal-formGroup">
                <label className="editUserModal-label">
                  Role (Quyền hệ thống) <span className="editUserModal-required">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="editUserModal-select"
                >
                  <option value="user">👤 User - Người dùng thường</option>
                  <option value="admin">👑 Admin - Quản trị viên</option>
                </select>
              </div>

              <div className="editUserModal-formGroup">
                <label className="editUserModal-label">
                  Current Role (Vai trò hiện tại) <span className="editUserModal-required">*</span>
                </label>
                <select
                  name="currentRole"
                  value={formData.currentRole}
                  onChange={handleInputChange}
                  className="editUserModal-select"
                >
                  <option value="user">👤 User - Thành viên</option>
                  <option value="host">🎙️ Host - Người tạo phòng</option>
                  <option value="listener">🎧 Listener - Người nghe</option>
                </select>
              </div>
            </div>
          )}

          {/* Tab 3: Bảo mật */}
          {activeTab === 'security' && (
            <div className="editUserModal-tabContent">
              <div className="editUserModal-infoBox editUserModal-infoBoxDanger">
                <AlertCircle className="editUserModal-infoIcon" />
                <div>
                  <strong>Cảnh báo:</strong> Reset password sẽ thay đổi mật khẩu hiện tại của user
                </div>
              </div>

              <div className="editUserModal-formGroup">
                <label className="editUserModal-label">Mật khẩu mới</label>
                <div className="editUserModal-passwordGroup">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="editUserModal-input"
                    placeholder="Nhập mật khẩu mới (8-20 ký tự)"
                  />
                  <button
                    type="button"
                    className="editUserModal-passwordToggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="editUserModal-eyeIcon" /> : <Eye className="editUserModal-eyeIcon" />}
                  </button>
                </div>
                <button
                  type="button"
                  className="editUserModal-generateBtn"
                  onClick={generateRandomPassword}
                >
                  🎲 Tạo mật khẩu ngẫu nhiên
                </button>
              </div>

              <div className="editUserModal-checkboxGroup">
                <label className="editUserModal-checkbox">
                  <input
                    type="checkbox"
                    name="requirePasswordChange"
                    checked={formData.requirePasswordChange}
                    onChange={handleInputChange}
                  />
                  <span className="editUserModal-checkboxLabel">
                    🔒 Yêu cầu đổi password lần đầu đăng nhập
                  </span>
                </label>
              </div>

              <div className="editUserModal-checkboxGroup">
                <label className="editUserModal-checkbox">
                  <input
                    type="checkbox"
                    name="sendResetEmail"
                    checked={formData.sendResetEmail}
                    onChange={handleInputChange}
                  />
                  <span className="editUserModal-checkboxLabel">
                    <Mail className="editUserModal-mailIcon" />
                    Gửi email thông báo cho user
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="editUserModal-footer">
            <button
              type="button"
              className="editUserModal-btnCancel"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="editUserModal-btnSubmit"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;