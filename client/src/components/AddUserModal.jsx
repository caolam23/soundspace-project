// src/components/AddUserModal.jsx
import React, { useState } from 'react';
import './AddUserModal.css';
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
    sendWelcomeEmail: false,
    requirePasswordChange: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.username.length < 3 || formData.username.length > 20) {
      setError('Username phải có từ 3-20 ký tự');
      return;
    }
    if (formData.email.length > 60) {
      setError('Email không được vượt quá 60 ký tự');
      return;
    }
    if (formData.password.length < 8 || formData.password.length > 20) {
      setError('Mật khẩu phải có từ 8-20 ký tự');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8800/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          sendWelcomeEmail: formData.sendWelcomeEmail,
          requirePasswordChange: formData.requirePasswordChange
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể tạo user');
      }

      const data = await response.json();
      toast.success(`${formData.role === 'admin' ? 'Admin' : 'User'} đã được tạo thành công!`);

      // Reset form
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'user',
        sendWelcomeEmail: false,
        requirePasswordChange: true
      });
      
      onUserAdded(); // Callback để refresh danh sách
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="add-user-modal-overlay" onClick={onClose}>
      <div className="add-user-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="add-user-modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <h2 className="add-user-modal-title">Thêm User Mới</h2>
        <p className="add-user-modal-subtitle">Tạo tài khoản mới cho người dùng</p>

        <form onSubmit={handleSubmit} className="add-user-modal-form">
          <div className="add-user-form-group">
            <label className="add-user-label">Username *</label>
            <input
              type="text"
              name="username"
              className="add-user-input"
              placeholder="Nhập username (3-20 ký tự)"
              value={formData.username}
              onChange={handleChange}
              minLength={3}
              maxLength={20}
              required
            />
          </div>

          <div className="add-user-form-group">
            <label className="add-user-label">Email *</label>
            <input
              type="email"
              name="email"
              className="add-user-input"
              placeholder="Nhập email"
              value={formData.email}
              onChange={handleChange}
              maxLength={60}
              required
            />
          </div>

          <div className="add-user-form-group">
            <label className="add-user-label">Mật khẩu *</label>
            <div className="add-user-password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="add-user-input"
                placeholder="Nhập mật khẩu (8-20 ký tự)"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                maxLength={20}
                required
              />
              <button
                type="button"
                className="add-user-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button
                type="button"
                className="add-user-password-generate"
                onClick={generatePassword}
                title="Tạo mật khẩu ngẫu nhiên"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          <div className="add-user-form-group">
            <label className="add-user-label">Vai trò *</label>
            <select
              name="role"
              className="add-user-select"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="add-user-form-group">
            <label className="add-user-checkbox-wrapper">
              <input
                type="checkbox"
                name="sendWelcomeEmail"
                checked={formData.sendWelcomeEmail}
                onChange={handleChange}
              />
              <span>Gửi email chào mừng</span>
            </label>
          </div>

          <div className="add-user-form-group">
            <label className="add-user-checkbox-wrapper">
              <input
                type="checkbox"
                name="requirePasswordChange"
                checked={formData.requirePasswordChange}
                onChange={handleChange}
              />
              <span>Yêu cầu đổi mật khẩu lần đầu đăng nhập</span>
            </label>
          </div>

          {error && <p className="add-user-error">{error}</p>}

          <div className="add-user-actions">
            <button
              type="button"
              className="add-user-btn add-user-btn-cancel"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="add-user-btn add-user-btn-submit"
              disabled={loading}
            >
              {loading ? 'Đang tạo...' : 'Tạo User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;