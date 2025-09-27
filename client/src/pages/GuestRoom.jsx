import React from "react";
import "./GuestRoom.css";

const GuestRoom = () => {
  return (
    <div className="guest-room">
      {/* Header */}
      <header className="guest-room__header">
        <div className="guest-room__room-info">
          <h1 className="guest-room__title">Đêm nhạc Lofi & Chill</h1>
        </div>
        <div className="guest-room__auth-buttons">
          <a href="/auth" className="guest-room__btn guest-room__btn--secondary">
            Đăng nhập
          </a>
          <a href="/auth" className="guest-room__btn guest-room__btn--primary">
            Đăng ký
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="guest-room__main">
        {/* Left column */}
        <aside className="guest-room__left">
          <div className="guest-room__queue">
            <h2 className="guest-room__queue-title">Danh sách phát</h2>
            <ul className="guest-room__queue-list">
              <li className="guest-room__queue-item guest-room__queue-item--now-playing">
                <img
                  src="https://i1.sndcdn.com/avatars-CfKHgY7WpJKy8rA4-EOtUWQ-t500x500.jpg"
                  alt="art"
                  className="guest-room__queue-art"
                />
                <div className="guest-room__queue-info">
                  <h3 className="guest-room__song-title">Bước Qua Nhau</h3>
                  <p className="guest-room__song-artist">Vũ.</p>
                </div>
              </li>
            </ul>
          </div>
        </aside>

        {/* Center column */}
        <section className="guest-room__center">
          <img
            className="guest-room__album-art"
            src="https://i1.sndcdn.com/artworks-RQLugOELnFx12PCA-Zo3yNA-t1080x1080.jpg"
            alt="Album Art"
          />
          <div className="guest-room__song-info">
            <h1 className="guest-room__song-title">Bước Qua Nhau</h1>
            <p className="guest-room__song-artist">Vũ.</p>
          </div>
          <div className="guest-room__player">
            <div className="guest-room__progress-bar">
              <div className="guest-room__progress"></div>
            </div>
            <div className="guest-room__timestamps">
              <span>0:35</span>
              <span>1:00 (Preview)</span>
            </div>
          </div>
        </section>

        {/* Right column */}
        <aside className="guest-room__right">
          <div className="guest-room__tabs">
            <div className="guest-room__tab guest-room__tab--active">
              Trò chuyện
            </div>
            <div className="guest-room__tab">Thành viên (15)</div>
          </div>

          <div className="guest-room__chat-box">
            <div className="guest-room__chat-message">
              <img
                src="https://i.pravatar.cc/150?u=host"
                alt="avatar"
                className="guest-room__avatar"
              />
              <div className="guest-room__message-body">
                <div className="guest-room__username">Minh An (Host)</div>
                <div className="guest-room__message-text">
                  Chào mừng mọi người nhé!
                </div>
              </div>
            </div>
          </div>

          <div className="guest-room__chat-input-area">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              disabled
              className="guest-room__chat-input"
            />
            <div className="guest-room__chat-overlay">
              <p>Đăng nhập để tham gia trò chuyện</p>
              <a href="/auth" className="guest-room__btn guest-room__btn--primary">
                Đăng nhập / Đăng ký
              </a>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default GuestRoom;
