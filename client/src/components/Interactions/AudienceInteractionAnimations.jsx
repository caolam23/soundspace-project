/**
 * ✅ FEATURE: Audience Interaction Animations
 * Component to display floating like and gift animations
 * Implementation Date: April 2026
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import styles from './AudienceInteractionAnimations.module.css';

const GIFT_EMOJIS = {
  flower: '🌸',
  rose: '🌹',
  diamond: '💎',
  crown: '👑'
};

export default function AudienceInteractionAnimations({ roomId }) {
  const socket = useSocket();
  const [animations, setAnimations] = useState([]);

  const addAnimation = useCallback((interaction) => {
    const id = `animation-${Date.now()}-${Math.random()}`;
    
    setAnimations(prev => [...prev, {
      id,
      ...interaction,
      startTime: Date.now()
    }]);

    // Remove animation after 3 seconds
    setTimeout(() => {
      setAnimations(prev => prev.filter(anim => anim.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    if (!socket) {
      console.warn('❌ Socket not available in AudienceInteractionAnimations');
      return;
    }

    // Listen for like animations
    const handleLikeReceived = (data) => {
      addAnimation({
        type: 'like',
        username: data.user.username,
        emoji: '❤️',
        color: '#FF69B4'
      });
    };

    // Listen for gift animations
    const handleGiftReceived = (data) => {
      addAnimation({
        type: 'gift',
        username: data.user.username,
        emoji: GIFT_EMOJIS[data.giftType] || '🎁',
        giftType: data.giftType,
        giftValue: data.giftValue,
        color: getGiftColor(data.giftType)
      });
    };

    socket.on('audience:like-received', handleLikeReceived);
    socket.on('audience:gift-received', handleGiftReceived);

    return () => {
      socket.off('audience:like-received', handleLikeReceived);
      socket.off('audience:gift-received', handleGiftReceived);
    };
  }, [socket, addAnimation]);

  const getGiftColor = (giftType) => {
    const colors = {
      flower: '#FFB6C1',
      rose: '#FF1493',
      diamond: '#00CED1',
      crown: '#FFD700'
    };
    return colors[giftType] || '#fff';
  };

  return (
    <div className={styles.container}>
      {animations.map((anim, idx) => {
        return (
        <div
          key={anim.id}
          className={`${styles.animation} ${styles[anim.type]}`}
          style={{
            '--animation-delay': `${idx * 50}ms`,
            '--gift-color': anim.color
          }}
        >
          <div className={styles.emoji}>{anim.emoji}</div>
          <div className={styles.text}>
            <span className={styles.username}>{anim.username}</span>
            {anim.type === 'like' && <span className={styles.label}>gửi tim</span>}
            {anim.type === 'gift' && (
              <span className={styles.label}>tặng quà ({anim.giftValue}pt)</span>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
