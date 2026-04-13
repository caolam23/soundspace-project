/**
 * ✅ FEATURE: Audience Interaction Panel
 * Component for audience to send likes and gifts during podcast
 * Implementation Date: April 2026
 */

import React, { useState, useContext } from 'react';
import { Heart, Gift } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { AuthContext } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import styles from './AudienceInteractionPanel.module.css';

const GIFT_TYPES = [
  { id: 'flower', label: '🌸 Hoa', value: 10, color: '#FFB6C1' },
  { id: 'rose', label: '🌹 Hoa hồng', value: 25, color: '#FF1493' },
  { id: 'diamond', label: '💎 Kim cương', value: 100, color: '#00CED1' },
  { id: 'crown', label: '👑 Vương miện', value: 500, color: '#FFD700' }
];

export default function AudienceInteractionPanel({ roomId, isHost = false }) {
  const socket = useSocket();
  const { user } = useContext(AuthContext);
  const [isLiking, setIsLiking] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [showGiftMenu, setShowGiftMenu] = useState(false);

  const handleLike = async () => {
    if (!socket || !user) {
      console.warn('❌ Socket or user not available');
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    try {
      console.log('💭 Sending like to room:', roomId);
      socket.emit('audience:send-like', {
        roomId,
        userId: user._id,
        username: user.username,
        avatar: user.avatar
      });
      toast.success('Đã gửi tim! 💕', { autoClose: 2000 });
    } catch (err) {
      toast.error('Gửi tim thất bại');
    } finally {
      setTimeout(() => setIsLiking(false), 500);
    }
  };

  const handleGift = (giftType) => {
    if (!socket || !user) {
      console.warn('❌ Socket or user not available');
      return;
    }

    try {
      console.log('🎁 Sending gift to room:', roomId, 'giftType:', giftType);
      socket.emit('audience:send-gift', {
        roomId,
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        giftType
      });
      const gift = GIFT_TYPES.find(g => g.id === giftType);
      toast.success(`Đã gửi ${gift.label}! (${gift.value} points)`, { autoClose: 2000 });
      setShowGiftMenu(false);
    } catch (err) {
      toast.error('Gửi quà thất bại');
    }
  };

  if (isHost) return null; // Host không thể tương tác như khán giả

  return (
    <div className={styles.container}>
      {/* Like Button */}
      <button
        className={`${styles.button} ${styles.likeButton} ${isLiking ? styles.active : ''}`}
        onClick={handleLike}
        disabled={isLiking}
        title="Thả tim"
      >
        <Heart size={20} />
        <span>Tim</span>
      </button>

      {/* Gift Button */}
      <div className={styles.giftWrapper}>
        <button
          className={`${styles.button} ${styles.giftButton}`}
          onClick={() => setShowGiftMenu(!showGiftMenu)}
          title="Tặng quà"
        >
          <Gift size={20} />
          <span>Quà</span>
        </button>

        {/* Gift Menu */}
        {showGiftMenu && (
          <div className={styles.giftMenu}>
            {GIFT_TYPES.map(gift => (
              <button
                key={gift.id}
                className={styles.giftOption}
                onClick={() => handleGift(gift.id)}
                style={{ borderColor: gift.color }}
              >
                <span className={styles.giftLabel}>{gift.label}</span>
                <span className={styles.giftValue}>{gift.value}pt</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
