// src/components/ChangePasswordModal.jsx
import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import './ChangePasswordModal.css';

const ChangePasswordModal = ({ isOpen, onClose, onSuccess, isRequired = false }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (formData.newPassword.length < 8 || formData.newPassword.length > 20) {
      setError('Mật khẩu mới phải có từ 8-20 ký tự');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8800/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Không thể đổi mật khẩu');
      }

      alert('Đổi mật khẩu thành công!');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="change-password-overlay" onClick={isRequired ? null : onClose}>
      <div className="change-password-modal" onClick={(e) => e.stopPropagation()}>
        {!isRequired && (
          <button className="change-password-close" onClick={onClose}>
            <X size={24} />
          </button>
        )}

        <div className="change-password-header">
          <h2>🔐 Đổi Mật Khẩu</h2>
          {isRequired && (
            <p className="change-password-required-notice">
              ⚠️ Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="change-password-field">
            <label>Mật khẩu hiện tại *</label>
            <div className="password-input-wrapper">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Nhập mật khẩu hiện tại"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('current')}
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="change-password-field">
            <label>Mật khẩu mới * (8-20 ký tự)</label>
            <div className="password-input-wrapper">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Nhập mật khẩu mới"
                minLength={8}
                maxLength={20}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('new')}
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="change-password-field">
            <label>Xác nhận mật khẩu mới *</label>
            <div className="password-input-wrapper">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu mới"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('confirm')}
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="change-password-error">{error}</p>}

          <div className="change-password-actions">
            {!isRequired && (
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;