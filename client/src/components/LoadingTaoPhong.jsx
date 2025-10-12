import React, { useEffect, useState } from 'react';
import './LoadingTaoPhong.css';

function LoadingTaoPhong({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Tăng progress từ 0 đến 100 trong khoảng 2-3 giây
    const duration = 2500; // 2.5 giây
    const intervalTime = 20; // Update mỗi 20ms
    const increment = (100 / duration) * intervalTime;

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete?.();
          }, 300); // Delay một chút trước khi hoàn thành
          return 100;
        }
        return newProgress;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  const circumference = 2 * Math.PI * 54; // radius = 54
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="LoadingTaoPhong-overlay">
      <div className="LoadingTaoPhong-container">
        <div className="LoadingTaoPhong-circle-wrapper">
          <svg className="LoadingTaoPhong-svg" width="140" height="140">
            {/* Background circle */}
            <circle
              className="LoadingTaoPhong-circle-bg"
              cx="70"
              cy="70"
              r="54"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              className="LoadingTaoPhong-circle-progress"
              cx="70"
              cy="70"
              r="54"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 70 70)"
            />
          </svg>
          
          <div className="LoadingTaoPhong-percentage">
            {Math.floor(progress)}%
          </div>
        </div>

        <div className="LoadingTaoPhong-text-wrapper">
          <h3 className="LoadingTaoPhong-title">Đang tạo phòng...</h3>
          <p className="LoadingTaoPhong-subtitle">
            {progress < 30 && "Đang khởi tạo phòng"}
            {progress >= 30 && progress < 60 && "Đang cấu hình âm thanh"}
            {progress >= 60 && progress < 90 && "Đang chuẩn bị giao diện"}
            {progress >= 90 && "Sắp xong rồi!"}
          </p>
        </div>

        <div className="LoadingTaoPhong-dots">
          <span className="LoadingTaoPhong-dot"></span>
          <span className="LoadingTaoPhong-dot"></span>
          <span className="LoadingTaoPhong-dot"></span>
        </div>
      </div>
    </div>
  );
}

export default LoadingTaoPhong;