import React, { useEffect, useState, useRef, useContext } from 'react';
import './RoomChat.css';
import { AuthContext } from '../contexts/AuthContext';
import { Send, Flag, MoreVertical } from 'react-feather';

export default function RoomChat({ roomId, ownerId = null, initialMessages = [], onNewMessage, canReport = false, onOpenReport = null }) {
  const { user, socket } = useContext(AuthContext);
  const [messages, setMessages] = useState(initialMessages || []);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const listRef = useRef(null);
  const msgRefs = useRef({});
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  useEffect(() => {
    // Ensure initial messages from the room owner are marked with isHost
    const normalized = (initialMessages || []).map((m) => ({
      ...m,
      id: m.id || m._id,
      isHost: Boolean(ownerId) && (
        String(m.userId) === String(ownerId) ||
        String(m._id) === String(ownerId) ||
        String(m.username) === String(ownerId)
      ),
    }));
    setMessages(normalized);
  }, [initialMessages, ownerId]);

  useEffect(() => {
    if (!socket) return;
    const tryJoin = () => {
      try {
        socket.emit('join-room', roomId);
      } catch (e) {
        // ignore
      }
    };

    tryJoin();
    socket.on('connect', tryJoin);

    const handleNew = (msg) => {
      setMessages((prev) => {
        const tempIndex = prev.findIndex((m) => m.id && String(m.id).startsWith('temp-') && m.text === msg.text && m.username === msg.username);
        const normalizedMsg = { ...msg, id: msg.id || msg._id };
        if (ownerId && (
          String(normalizedMsg.userId) === String(ownerId) ||
          String(normalizedMsg._id) === String(ownerId) ||
          String(normalizedMsg.username) === String(ownerId)
        )) {
          normalizedMsg.isHost = true;
        }
        if (tempIndex !== -1) {
          const next = [...prev];
          next[tempIndex] = normalizedMsg;
          return next;
        }
        return [...prev, normalizedMsg];
      });

      try {
        if (typeof onNewMessage === 'function') onNewMessage(msg);
      } catch (e) {
        // ignore
      }
      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, 50);
    };

    socket.on('new-chat-message', handleNew);
    return () => {
      socket.off('new-chat-message', handleNew);
      socket.off('connect', tryJoin);
    };
  }, [socket]);

  const sendMessage = (e) => {
    e && e.preventDefault();
    if (!text || !text.trim()) return;
    if (!socket) return;

    const payload = { 
      roomId, 
      text: text.trim(),
      // Gửi thông tin replyTo nếu có
      meta: replyTo ? { replyTo: { id: replyTo.id, username: replyTo.username } } : {}
    };

    const tempMsg = {
      id: `temp-${Date.now()}`,
      userId: user?._id || null,
      username: user?.username || 'You',
      avatar: user?.avatar || '/default-avatar.png',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      meta: payload.meta,
    };
    // mark temp message as host if current user is owner
    if (ownerId && user && String(user._id) === String(ownerId)) {
      tempMsg.isHost = true;
    }
    setMessages((prev) => [...prev, tempMsg]);
    setText('');
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;

    socket.emit('send-chat-message', payload);
    setReplyTo(null);
  };

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
  
  // =============================================================
  // ▼▼▼ HÀM MỚI ĐỂ HIỂN THỊ MÀU CHO TÊN NGƯỜI DÙNG ▼▼▼
  // =============================================================
  const renderMessageText = (text) => {
    if (text && text.startsWith('@')) {
      const firstSpaceIndex = text.indexOf(' ');
      // Chỉ xử lý nếu có khoảng trắng sau @username và username có ít nhất 1 ký tự
      if (firstSpaceIndex > 1) { 
        const mention = text.substring(0, firstSpaceIndex);
        const restOfText = text.substring(firstSpaceIndex);
        return (
          <>
            <span className="roomchat-mention">{mention}</span>
            {/* Thêm một khoảng trắng để đảm bảo phần còn lại của văn bản không dính liền */}
            {' '} 
            {restOfText.trim()}
          </>
        );
      }
    }
    return text; // Trả về văn bản gốc nếu không phải là mention
  };


  return (
    <div className="roomchat-container">
      <div className="roomchat-panel">
        <div className="roomchat-list" ref={listRef} aria-live="polite">
          {messages.map((m) => {
            const msgId = String(m.id || m._id);
            return (
              <div id={`msg-${msgId}`} key={msgId} ref={(el) => { if (el) msgRefs.current[msgId] = el; }} className={`roomchat-msg`}>
                <img className="roomchat-avatar" src={m.avatar || '/default-avatar.png'} alt={m.username} />
                <div className="roomchat-body">
                  <div className="roomchat-meta">
                      <span className="roomchat-username" title={m.username}>{m.username}</span>
                      {m.isHost && (
                        <span className="roomchat-host-badge">HOST</span>
                      )}
                      
                      <span className="roomchat-time">{new Date(m.createdAt).toLocaleTimeString()}</span>
                    </div>
                  {m.meta && m.meta.replyTo && (
                    <div className="roomchat-reply-snippet compact" onClick={() => {
                      const targetId = String(m.meta.replyTo.id);
                      const node = msgRefs.current[targetId];
                      if (node && node.scrollIntoView) {
                        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        node.classList.add('roomchat-highlight');
                        setTimeout(() => node.classList.remove('roomchat-highlight'), 2200);
                      } else {
                        const fallback = document.getElementById(`msg-${targetId}`);
                        if (fallback) {
                          fallback.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          fallback.classList.add('roomchat-highlight');
                          setTimeout(() => fallback.classList.remove('roomchat-highlight'), 2200);
                        }
                      }
                    }}>
                      <span className="roomchat-reply-compact" title={`Replying to @${m.meta.replyTo.username}`}>Replying to @{m.meta.replyTo.username}</span>
                    </div>
                  )}

                  {/* ============================================================= */}
                  {/* ▼▼▼ ÁP DỤNG HÀM MỚI VÀO ĐÂY ▼▼▼ */}
                  {/* ============================================================= */}
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
                      <button 
                        className="roomchat-action-btn" 
                        onClick={() => handleReplyClick(m)}
                      >
                        Reply
                      </button>
                      {canReport ? (
                        <button className="roomchat-action-btn" onClick={() => {
                          setActiveMenuId(null);
                          try { if (typeof onOpenReport === 'function') onOpenReport(); } catch (e) {}
                        }}>
                          <Flag size={14} /> Báo cáo
                        </button>
                      ) : (
                        <button className="roomchat-action-btn disabled" title="Chỉ có thể báo cáo khi phòng đang phát nhạc" disabled>
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
    </div>
  );
}