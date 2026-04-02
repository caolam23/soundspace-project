// client/src/components/Audience/AudienceToolbar.jsx
// Bottom interaction toolbar for audience members
import React, { useCallback, useRef } from 'react';
import { Gift } from 'react-feather';
import styles from './AudienceToolbar.module.css';

const REACTIONS = [
  { type: 'heart', emoji: '❤️', label: 'Tim' },
  { type: 'fire',  emoji: '🔥', label: 'Lửa' },
  { type: 'star',  emoji: '⭐', label: 'Hay' },
  { type: 'clap',  emoji: '👏', label: 'Vỗ tay' },
  { type: 'wow',   emoji: '😮', label: 'WOW' },
];

// Client-side throttle: max 3 per 1000ms
function useThrottle(ms = 333) {
  const lastRef = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - lastRef.current < ms) return false;
    lastRef.current = now;
    return true;
  }, [ms]);
}

export default function AudienceToolbar({ socket, roomId, heartsRef, onOpenGifts }) {
  const canFire = useThrottle(333); // max 3 per second

  const sendReaction = useCallback((type) => {
    if (!canFire()) return;
    // Spawn local hearts immediately for instant feedback
    heartsRef?.current?.spawn(type);
    // Emit via socket for broadcast to others
    socket?.emit('interact:reaction', { roomId, type });
  }, [canFire, heartsRef, socket, roomId]);

  return (
    <div className={styles.toolbar}>
      <div className={styles.reactions}>
        {REACTIONS.map(r => (
          <button
            key={r.type}
            className={styles.reactionBtn}
            onClick={() => sendReaction(r.type)}
            title={r.label}
            aria-label={r.label}
          >
            <span className={styles.emoji}>{r.emoji}</span>
          </button>
        ))}
      </div>

      <button className={styles.giftBtn} onClick={onOpenGifts} title="Tặng quà">
        <Gift size={18} />
        <span>Quà</span>
      </button>
    </div>
  );
}
