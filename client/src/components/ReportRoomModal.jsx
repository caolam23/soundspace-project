import React, { useState } from 'react';
import './ReportRoomModal.css';
import { XCircle } from 'react-feather';

export default function ReportRoomModal({ open, onClose, onSubmit, roomName }) {
  const [category, setCategory] = useState('inappropriate-content');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const categories = [
    { value: 'inappropriate-content', label: 'Nội dung không phù hợp' },
    { value: 'harassment', label: 'Quấy rối / Lăng mạ' },
    { value: 'copyright', label: 'Vi phạm bản quyền' },
    { value: 'spam', label: 'Spam / Quảng cáo' },
    { value: 'other', label: 'Khác' },
  ];

  const submit = async (e) => {
    e && e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ category, details });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-modal-backdrop" role="dialog" aria-modal="true">
      <div className="report-modal">
        <div className="report-modal-header">
          <h3>Báo cáo phòng {roomName ? `- ${roomName}` : ''}</h3>
          <button className="report-modal-close" onClick={onClose} aria-label="Đóng">
            <XCircle />
          </button>
        </div>

        <form className="report-modal-body" onSubmit={submit}>
          <label className="report-label">Chọn lý do</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <label className="report-label">Mô tả (tuỳ chọn)</label>
          <textarea
            maxLength={500}
            placeholder="Mô tả thêm về lý do bạn báo cáo (ví dụ: thời điểm, người, link...)"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />

          <div className="report-modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}