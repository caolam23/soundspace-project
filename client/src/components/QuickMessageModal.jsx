// client/src/components/QuickMessageModal.jsx
import React, { useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import './QuickMessageModal.css';

const QUICK_MESSAGES = [
  {
    id: 1,
    title: 'Cảnh báo vi phạm nội dung',
    content: '⚠️ Phòng của bạn đang có dấu hiệu vi phạm quy định về nội dung. Vui lòng kiểm tra và chỉnh sửa.'
  },
  {
    id: 2,
    title: 'Nhắc nhở bản quyền nhạc',
    content: '🎵 Vui lòng đảm bảo các bài hát trong phòng có bản quyền hợp lệ để tránh vi phạm.'
  },
  {
    id: 3,
    title: 'Cảnh báo spam/quảng cáo',
    content: '🚫 Phát hiện hành vi spam hoặc quảng cáo không phù hợp. Vui lòng dừng ngay.'
  },
  {
    id: 4,
    title: 'Kiểm tra hoạt động phòng',
    content: '👋 Admin đang kiểm tra hoạt động phòng. Cảm ơn bạn đã sử dụng dịch vụ!'
  },
  {
    id: 5,
    title: 'Cảnh báo cuối trước khi khóa',
    content: '⛔ Đây là cảnh báo cuối cùng. Nếu tiếp tục vi phạm, phòng sẽ bị khóa vĩnh viễn.'
  }
];

const QuickMessageModal = ({ isOpen, onClose, onSendMessage, roomName }) => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!selectedMessage) return;

    setIsSending(true);
    try {
      await onSendMessage(selectedMessage.content);
      // Đợi một chút để animation hiển thị rồi mới đóng modal
      setTimeout(() => {
        onClose();
        setSelectedMessage(null);
        setIsSending(false);
      }, 500);
    } catch (error) {
      console.error('Error sending quick message:', error);
      setIsSending(false);
    }
  };

  return (
    <div className="QuickMessage-overlay" onClick={onClose}>
      <div className="QuickMessage-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="QuickMessage-header">
          <div className="QuickMessage-header-content">
            <MessageSquare size={24} />
            <div>
              <h3>Tin nhắn nhanh cho phòng</h3>
              <p>{roomName}</p>
            </div>
          </div>
          <button className="QuickMessage-closeBtn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="QuickMessage-body">
          <p className="QuickMessage-instruction">
            Chọn một tin nhắn mẫu để gửi nhanh đến phòng này:
          </p>

          <div className="QuickMessage-list">
            {QUICK_MESSAGES.map((msg) => (
              <div
                key={msg.id}
                className={`QuickMessage-item ${
                  selectedMessage?.id === msg.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedMessage(msg)}
              >
                <div className="QuickMessage-item-header">
                  <div className="QuickMessage-radio">
                    {selectedMessage?.id === msg.id && (
                      <div className="QuickMessage-radio-dot" />
                    )}
                  </div>
                  <h4>{msg.title}</h4>
                </div>
                <p className="QuickMessage-item-content">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="QuickMessage-footer">
          <button
            className="QuickMessage-btn QuickMessage-btn-cancel"
            onClick={onClose}
            disabled={isSending}
          >
            Hủy
          </button>
          <button
            className="QuickMessage-btn QuickMessage-btn-send"
            onClick={handleSend}
            disabled={!selectedMessage || isSending}
          >
            <Send size={18} />
            <span>{isSending ? 'Đang gửi...' : 'Gửi tin nhắn'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickMessageModal;