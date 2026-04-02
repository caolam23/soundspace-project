// client/src/components/Audience/GiftToast.jsx
// Animated popup showing sender avatar + gift when a gift is received
import React, { useState, useEffect } from 'react';
import styles from './GiftToast.module.css';

export default function GiftToast({ gifts }) {
  // gifts: array of { id, sender: { username, avatar }, gift: { name, emoji } }
  return (
    <div className={styles.container} aria-live="polite">
      {gifts.map(g => (
        <GiftToastItem key={g.id} data={g} />
      ))}
    </div>
  );
}

function GiftToastItem({ data }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.toast}>
      <img src={data.sender?.avatar || '/default-avatar.png'} alt={data.sender?.username} className={styles.avatar} />
      <div className={styles.info}>
        <span className={styles.username}>{data.sender?.username || 'Ẩn danh'}</span>
        <span className={styles.action}>đã tặng</span>
      </div>
      <div className={styles.giftBadge}>
        <span className={styles.giftEmoji}>{data.gift?.emoji}</span>
        <span className={styles.giftName}>{data.gift?.name}</span>
      </div>
    </div>
  );
}
