// src/components/RoomChat.jsx
import React, { useEffect, useState, useRef, useContext } from 'react';
import './RoomChat.css';
import { AuthContext } from '../contexts/AuthContext';
import { Send, Flag, MoreVertical, Shield } from 'react-feather'; // Thêm Shield icon
import ReportModal from './ReportModal'; // Import Modal báo cáo từ code 1
import { toast } from 'react-toastify'; // Import toastify để hiển thị thông báo
import 'react-toastify/dist/ReactToastify.css';

export default function RoomChat({
  roomId,
  ownerId = null,
  initialMessages = [],
  onNewMessage,
  isGhostMode = false, // Thêm prop từ code 2
}) {
  const { user, socket } = useContext(AuthContext);
  const [messages, setMessages] = useState(initialMessages || []);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [reportingMessage, setReportingMessage] = useState(null); // State cho modal báo cáo từ code 1

  const listRef = useRef(null);
  const msgRefs = useRef({});
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  // ==========================
  // Ẩn menu khi click ra ngoài
  // ==========================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================
  // Tự co giãn chiều cao textarea
  // ==========================
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 100;

      if (scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [text]);

  // ==========================
  // Normalize tin nhắn ban đầu
  // ==========================
  useEffect(() => {
    const normalized = (initialMessages || []).map((m) => ({
      ...m,
      id: m.id || m._id,
      isHost:
        Boolean(ownerId) &&
        (String(m.userId) === String(ownerId) ||
          String(m._id) === String(ownerId) ||
          String(m.username) === String(ownerId)),
    }));
    setMessages(normalized);
  }, [initialMessages, ownerId]);

  // ==========================
  // Lắng nghe socket events
  // ==========================
  useEffect(() => {
    if (!socket) return;
    const tryJoin = () => {
      try {
        socket.emit('join-room', roomId);
      } catch (e) {}
    };

    tryJoin();
    socket.on('connect', tryJoin);

    // Khi có tin nhắn mới (kết hợp logic từ cả 2 file)
    const handleNew = (msg) => {
      // Logic từ code 2: Xử lý tin nhắn ghost mode
      if (msg.isGhost) {
        msg.avatar = '/images/admin-ghost-avatar.png';
        msg.username = 'Admin';
      }

      setMessages((prev) => {
        const tempIndex = prev.findIndex(
          (m) =>
            m.id &&
            String(m.id).startsWith('temp-') &&
            m.text === msg.text &&
            m.username === msg.username
        );
        const normalizedMsg = { ...msg, id: msg.id || msg._id };

        if (ownerId && String(normalizedMsg.userId) === String(ownerId)) {
          normalizedMsg.isHost = true;
        }

        if (tempIndex !== -1) {
          const next = [...prev];
          next[tempIndex] = normalizedMsg;
          return next;
        }
        return [...prev, normalizedMsg];
      });

      if (typeof onNewMessage === 'function') onNewMessage(msg);
      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, 50);
    };

    // Các listener từ code 1
    const handleUserMuted = ({ message }) => {
      toast.warn(message, { position: 'bottom-center', autoClose: 5000 });
    };

    const handleChatError = ({ message }) => {
      toast.error(message);
    };

    socket.on('new-chat-message', handleNew);
    socket.on('user-muted', handleUserMuted);
    socket.on('chat-error', handleChatError);

    return () => {
      socket.off('new-chat-message', handleNew);
      socket.off('user-muted', handleUserMuted);
      socket.off('chat-error', handleChatError);
      socket.off('connect', tryJoin);
    };
  }, [socket, roomId, ownerId, onNewMessage]); // ✅ Dependencies added - prevents stale closures
  // 🚀 OPTIMIZATION: Consider virtualizing message list for 500+ messages

  // ==========================
  // Gửi tin nhắn (kết hợp logic từ cả 2 file)
  // ==========================
  const sendMessage = (e) => {
    e && e.preventDefault();
    if (!text || !text.trim()) return;
    if (!socket) return;

    const payload = {
      roomId,
      text: text.trim(),
      isGhostMode: isGhostMode, // Thêm flag từ code 2
      meta: replyTo ? { replyTo: { id: replyTo.id, username: replyTo.username } } : {},
    };

    const tempMsg = {
      id: `temp-${Date.now()}`,
      userId: user?._id || null,
      username: isGhostMode ? 'Admin' : user?.username || 'You', // Thay đổi nếu là ghost
      avatar: isGhostMode ? '/images/admin-ghost-avatar.png' : user?.avatar || '/default-avatar.png',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      meta: payload.meta,
      isGhost: isGhostMode, // Đánh dấu là ghost
    };

    if (ownerId && user && String(user._id) === String(ownerId)) {
      tempMsg.isHost = true;
    }

    setMessages((prev) => [...prev, tempMsg]);
    setText('');
    setReplyTo(null);
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;

    socket.emit('send-chat-message', payload);
  };

  // ==========================
  // Xử lý trả lời tin nhắn
  // ==========================
  const handleReplyClick = (m) => {
    const at = `@${m.username} `;
    setText(at);
    setReplyTo({ id: m.id || m._id, username: m.username });
    setActiveMenuId(null);

    setTimeout(() => {
      const textarea = inputRef.current;
      if (textarea) {
        textarea.focus();
        const len = textarea.value.length;
        textarea.selectionStart = len;
        textarea.selectionEnd = len;
      }
    }, 40);
  };

  // ==========================
  // Xử lý gửi báo cáo (từ code 1)
  // ==========================
  const handleReportSubmit = (reason) => {
    if (!socket || !reportingMessage) return;
    socket.emit('report-comment', {
      roomId,
      commentId: reportingMessage._id || reportingMessage.id,
      reason,
    });
    toast.success('Báo cáo của bạn đã được gửi đi. Cảm ơn bạn!');
    setReportingMessage(null);
  };

  // ==========================
  // Hiển thị text có mention màu
  // ==========================
  const renderMessageText = (text) => {
    if (text && text.startsWith('@')) {
      const firstSpaceIndex = text.indexOf(' ');
      if (firstSpaceIndex > 1) {
        const mention = text.substring(0, firstSpaceIndex);
        const rest = text.substring(firstSpaceIndex);
        return (
          <>
            <span className="roomchat-mention">{mention}</span> {rest.trim()}
          </>
        );
      }
    }
    return text;
  };

  // ==========================
  // JSX chính
  // ==========================
  return (
    <div className="roomchat-container">
      <div className="roomchat-panel">
        <div className="roomchat-list" ref={listRef}>
          {messages.map((m) => {
            const msgId = String(m.id || m._id);
            const isMyMessage = user && String(user._id) === String(m.userId);
            return (
              <div
                id={`msg-${msgId}`}
                key={msgId}
                className={`roomchat-msg ${m.isGhost ? 'roomchat-msg-ghost' : ''}`} // Thêm class ghost
                ref={(el) => (msgRefs.current[msgId] = el)}
              >
                <img className="roomchat-avatar" src={m.avatar || '/default-avatar.png'} alt={m.username} />
                <div className="roomchat-body">
                  <div className="roomchat-meta">
                    <span className={`roomchat-username ${m.isGhost ? 'roomchat-username-ghost' : ''}`} title={m.username}>
                      {m.username}
                    </span>
                    {m.isHost && <span className="roomchat-host-badge">HOST</span>}
                    {m.isGhost && ( // Thêm badge ghost từ code 2
                      <span className="roomchat-ghost-badge" title="Admin (Ghost Mode)">
                        <Shield size={12} />
                      </span>
                    )}
                    <span className="roomchat-time">{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>

                  {/* === KHỐI CODE ĐÃ BỊ XÓA === 
                  Tôi đã xóa bỏ hoàn toàn khối `m.meta?.replyTo` ở đây
                  để loại bỏ dòng "Replying to @Username"
                  */}
                  
                  <div className="roomchat-text">{renderMessageText(m.text)}</div>
                </div>

                <div className="roomchat-actions">
                  <button
                    aria-label="Tùy chọn"
                    className="roomchat-action-menu-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === msgId ? null : msgId);
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {activeMenuId === msgId && (
                    <div className="roomchat-action-menu" ref={menuRef}>
                      <button className="roomchat-action-btn" onClick={() => handleReplyClick(m)}>
                        Reply
                      </button>

                      {/* Logic báo cáo từ code 1 */}
                      {!isMyMessage && (
                        <button
                          className="roomchat-action-btn"
                          onClick={() => {
                            setReportingMessage(m);
                            setActiveMenuId(null);
                          }}
                        >
                          <Flag size={14} /> Báo cáo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Form nhập tin nhắn */}
        <form className="roomchat-input" onSubmit={sendMessage}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <textarea
              value={text}
              maxLength={200}
              rows="1"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Nhập tin nhắn..."
              aria-label="Nhập tin nhắn"
              ref={inputRef}
            />
          </div>
          <button type="submit" className="roomchat-send-btn" aria-label="Gửi">
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Modal báo cáo từ code 1 */}
      {reportingMessage && (
        <ReportModal
          message={reportingMessage}
          onClose={() => setReportingMessage(null)}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
}