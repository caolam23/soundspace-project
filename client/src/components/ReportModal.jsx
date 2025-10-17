// src/components/ReportModal.jsx
import React, { useState } from 'react';
import './ReportModal.css';

const reportReasons = [
  'Spam',
  'Nội dung không phù hợp',
  'Quấy rối hoặc bắt nạt',
  'Phát ngôn thù địch',
  'Thông tin sai lệch'
];

export default function ReportModal({ message, onClose, onSubmit }) {
  const [selectedReason, setSelectedReason] = useState('');

  if (!message) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedReason) {
      onSubmit(selectedReason);
    } else {
      alert('Vui lòng chọn một lý do báo cáo.');
    }
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Báo cáo bình luận</h3>
        <p className="report-modal-comment">"{message.text}"</p>
        <form onSubmit={handleSubmit}>
          <div className="report-modal-reasons">
            {reportReasons.map((reason) => (
              <label key={reason} className="reason-label">
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                />
                {reason}
              </label>
            ))}
          </div>
          <div className="report-modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="submit-btn" disabled={!selectedReason}>Gửi</button>
          </div>
        </form>
      </div>
    </div>
  );
}