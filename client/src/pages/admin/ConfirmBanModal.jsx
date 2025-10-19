import React, { useState, useEffect } from 'react';
import './Reports.css'; // Chúng ta sẽ dùng chung file CSS

export default function ConfirmBanModal({ isOpen, onClose, onConfirm }) {
  const [reason, setReason] = useState('Vi phạm chính sách');

  // Reset lý do mỗi khi modal được mở
  useEffect(() => {
    if (isOpen) {
      setReason('Vi phạm chính sách');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  // Ngăn việc click vào modal làm đóng nó
  const handleDialogClick = (e) => {
    e.stopPropagation();
  };
  
  const handleConfirm = () => {
    onConfirm(reason);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={handleDialogClick}>
        <h3 className="modal-title">Xác nhận cấm phòng</h3>
        <p className="modal-description">
          Hành động này sẽ xóa phòng vĩnh viễn và cấm chủ phòng. Vui lòng nhập lý do bên dưới.
        </p>
        <div className="modal-form-group">
          <label htmlFor="banReason">Lý do cấm phòng</label>
          <input
            id="banReason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="modal-input"
            placeholder="VD: Vi phạm chính sách cộng đồng"
          />
        </div>
        <div className="modal-actions">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="modal-btn modal-btn-danger" onClick={handleConfirm}>
            Xác nhận cấm
          </button>
        </div>
      </div>
    </div>
  );
}