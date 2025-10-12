// src/components/TrackOptions.jsx

import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Trash2 } from 'react-feather';
import './TrackOptions.css';

const TrackOptions = ({ onOpen, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = (e) => {
    e.stopPropagation(); // Ngăn sự kiện click vào thẻ <li> cha
    setIsOpen(!isOpen);
    if (onOpen) onOpen(); // Gọi hàm callback nếu có
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
    setIsOpen(false);
  };

  return (
    <div className="track-options-container" ref={menuRef}>
      <button className="options-button" onClick={handleToggle}>
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <div className="options-menu">
          <button onClick={handleDelete}>
            <Trash2 size={16} />
            <span>Xóa</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TrackOptions;