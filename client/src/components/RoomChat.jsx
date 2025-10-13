import React, { useEffect, useState, useRef, useContext } from 'react';
import './RoomChat.css';
import { AuthContext } from '../contexts/AuthContext';
import { Send, Flag } from 'react-feather';

// Simple chat box component with class prefix "roomchat-" to avoid collisions
export default function RoomChat({ roomId, initialMessages = [], onNewMessage }) {
  const { user, socket } = useContext(AuthContext);
  const [messages, setMessages] = useState(initialMessages || []);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, username, text }
  const listRef = useRef(null);
  const msgRefs = useRef({}); // map id -> dom node

  useEffect(() => {
    setMessages(initialMessages || []);
  }, [initialMessages]);

  useEffect(() => {
    if (!socket) return;

    // Ensure socket is part of the room so it will receive broadcasts
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
      // When server sends the saved message, try to replace optimistic temp message
      setMessages((prev) => {
        // Try to find a temp message that matches by text and username and recent timestamp
        const tempIndex = prev.findIndex((m) => m.id && String(m.id).startsWith('temp-') && m.text === msg.text && m.username === msg.username);
        if (tempIndex !== -1) {
          const next = [...prev];
          next[tempIndex] = { ...msg, id: msg.id || msg._id };
          return next;
        }
        // Otherwise append
        return [...prev, { ...msg, id: msg.id || msg._id }];
      });

      // Inform parent so it can persist to its room state
      try {
        if (typeof onNewMessage === 'function') onNewMessage(msg);
      } catch (e) {
        // ignore
      }
      // Optionally scroll
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

    const payload = { roomId, text: text.trim(), meta: {} };
    if (replyTo && replyTo.id) {
      payload.meta.replyTo = { id: replyTo.id, username: replyTo.username, text: replyTo.text };
    }
    // Optimistic UI: push a local temp message
    const tempMsg = {
      id: `temp-${Date.now()}`,
      userId: user?._id || null,
      username: user?.username || 'You',
      avatar: user?.avatar || '/default-avatar.png',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      meta: {},
    };
    setMessages((prev) => [...prev, tempMsg]);
    setText('');
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;

    socket.emit('send-chat-message', payload);
    setReplyTo(null);
  };

  return (
    <div className="roomchat-container">
      <div className="roomchat-panel">
        <div className="roomchat-list" ref={listRef} aria-live="polite">
        {messages.map((m) => {
          const msgId = String(m.id || m._id);
          return (
          <div id={`msg-${msgId}`} key={msgId} ref={(el) => { if (el) msgRefs.current[msgId] = el; }} className={`roomchat-msg ${m.userId === (user?._id) ? 'is-me' : ''}`}>
            <img className="roomchat-avatar" src={m.avatar || '/default-avatar.png'} alt={m.username} />
            <div className="roomchat-body">
              <div className="roomchat-meta">
                <span className="roomchat-username" title={m.username}>{m.username}</span>
                <span className="roomchat-time">{new Date(m.createdAt).toLocaleTimeString()}</span>
              </div>
              {/* reply snippet */}
              {m.meta && m.meta.replyTo && (
                <div className="roomchat-reply-snippet compact" onClick={() => {
                  // try to scroll to the original message if available
                  const targetId = String(m.meta.replyTo.id);
                  const node = msgRefs.current[targetId];
                  if (node && node.scrollIntoView) {
                    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // add highlight
                    node.classList.add('roomchat-highlight');
                    setTimeout(() => node.classList.remove('roomchat-highlight'), 2200);
                  } else {
                    // fallback: try to find by DOM id
                    const fallback = document.getElementById(`msg-${targetId}`);
                    if (fallback) {
                      fallback.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      fallback.classList.add('roomchat-highlight');
                      setTimeout(() => fallback.classList.remove('roomchat-highlight'), 2200);
                    }
                  }
                }}>
                  <span className="roomchat-reply-compact" title={`${m.meta.replyTo.username}: ${m.meta.replyTo.text}`}>@{m.meta.replyTo.username} {m.meta.replyTo.text}</span>
                </div>
              )}
              <div className="roomchat-text">{m.text}</div>
            </div>
            <div className="roomchat-actions">
              <button aria-label="reply" className="roomchat-action-btn" onClick={() => setReplyTo({ id: m.id || m._id, username: m.username, text: m.text, avatar: m.avatar || '/default-avatar.png' })}>Reply</button>
              <button aria-label="report" className="roomchat-action-btn"><Flag size={14} /></button>
            </div>
          </div>
        );
        })}
        </div>

        <form className="roomchat-input" onSubmit={sendMessage}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          {replyTo && (
            <div className="roomchat-reply-preview compact-preview">
              <span className="roomchat-reply-compact" title={`${replyTo.username}: ${replyTo.text}`}>@{replyTo.username} {replyTo.text}</span>
              <button className="roomchat-reply-cancel" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button>
            </div>
          )}

          <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Nhập tin nhắn..."
          aria-label="Nhập tin nhắn"
        />
        <button type="submit" className="roomchat-send-btn" aria-label="Gửi">
          <Send size={16} />
        </button>
        </div>
        </form>
      </div>
    </div>
  );
}
