// client/src/components/Audience/GiftPanel.jsx
// Slide-up panel for selecting and sending gifts
import React, { useState, useEffect } from 'react';
import { X } from 'react-feather';
import axios from 'axios';
import { toast } from 'react-toastify';
import styles from './GiftPanel.module.css';

const API = 'http://localhost:8800';

export default function GiftPanel({ isOpen, onClose, roomId }) {
  const [gifts, setGifts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/interact/gifts`)
      .then(({ data }) => setGifts(data.gifts || []))
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/interact/${roomId}/gift`,
        { giftId: selected.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Đã tặng ${selected.emoji} ${selected.name}!`);
      onClose();
      setSelected(null);
    } catch (err) {
      toast.error(err?.response?.data?.msg || 'Không thể tặng quà.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={`${styles.panel} ${isOpen ? styles.open : ''}`} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>🎁 Chọn quà tặng</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={17} /></button>
        </div>

        <div className={styles.grid}>
          {gifts.map(gift => (
            <button
              key={gift.id}
              className={`${styles.giftCard} ${selected?.id === gift.id ? styles.selectedCard : ''}`}
              onClick={() => setSelected(gift)}
            >
              <span className={styles.giftEmoji}>{gift.emoji}</span>
              <span className={styles.giftName}>{gift.name}</span>
              <span className={styles.giftPrice}>{gift.price} 🪙</span>
            </button>
          ))}
        </div>

        <div className={styles.footer}>
          {selected && (
            <span className={styles.selectedInfo}>{selected.emoji} {selected.name} — {selected.price} xu</span>
          )}
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!selected || sending}
          >
            {sending ? 'Đang gửi...' : 'Tặng ngay!'}
          </button>
        </div>
      </div>
    </div>
  );
}
