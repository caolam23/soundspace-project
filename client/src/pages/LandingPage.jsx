import React from "react";
import "./LandingPage.css";
import { useNavigate } from "react-router-dom";
// Import icon từ lucide-react
import { Music, MessageCircle, Smartphone, Twitter, Instagram, Facebook } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGuestRoom = () => {
    navigate("/guest-room");
  };

  return (
    <div id="landing-page" className="landing-page">
      <header className="landing-header container">
        <div className="header__logo">soundspace</div>
        <nav className="header__nav">
          <a href="#features">Tính năng</a>
          <button onClick={handleGuestRoom} className="btn btn-secondary">
            Xem thử
          </button>
          <a href="/auth" className="btn btn-secondary" style={{ marginLeft: 25 }}>
            Đăng nhập
          </a>
        </nav>
      </header>

      <main>
        <section className="hero-section container">
          <h1 className="hero-section__title">
            Cùng Lắng Nghe,
            <br />
            Cùng Cảm Nhận.
          </h1>
          <p className="hero-section__subtitle">
            Tạo một phòng nghe nhạc riêng tư, chia sẻ những giai điệu yêu thích và trò chuyện cùng bạn bè trong thời gian thực.
          </p>
          <a href="#" className="btn btn-primary hero-section__cta">
            + Tạo phòng nghe nhạc miễn phí
          </a>
        </section>

        <section id="features" className="features-section container">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-card__icon">
                <Music size={40} strokeWidth={1.6} />
              </div>
              <h3 className="feature-card__title">Nghe Nhạc Đồng Bộ</h3>
              <p className="feature-card__description">
                Mọi người trong phòng đều nghe cùng một đoạn nhạc tại cùng một thời điểm.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">
                <MessageCircle size={40} strokeWidth={1.6} />
              </div>
              <h3 className="feature-card__title">Trò Chuyện Real-time</h3>
              <p className="feature-card__description">
                Bình luận, chia sẻ cảm xúc và tương tác ngay lập tức về bài hát đang phát.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-card__icon">
                <Smartphone size={40} strokeWidth={1.6} />
              </div>
              <h3 className="feature-card__title">Hỗ Trợ Đa Nền Tảng</h3>
              <p className="feature-card__description">
                Sử dụng link nhạc từ YouTube, Spotify, SoundCloud hoặc tải lên file nhạc.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p className="footer__copyright">
          &copy; 2025 soundspace. Mọi quyền được bảo lưu.
        </p>
        <div className="footer__social-links">
          <a href="#"><Twitter size={20} /></a>
          <a href="#"><Instagram size={20} /></a>
          <a href="#"><Facebook size={20} /></a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
