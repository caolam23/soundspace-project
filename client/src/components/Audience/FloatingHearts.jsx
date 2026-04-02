// client/src/components/Audience/FloatingHearts.jsx
// Animated hearts that fly up from the bottom of the screen
import React, { useState, useCallback, useImperativeHandle, forwardRef, useRef } from 'react';
import styles from './FloatingHearts.module.css';

const EMOJIS = {
  heart: '❤️',
  fire: '🔥',
  star: '⭐',
  clap: '👏',
  wow: '😮',
};

let heartCounter = 0;

const FloatingHearts = forwardRef(function FloatingHearts(props, ref) {
  const [hearts, setHearts] = useState([]);

  const spawnHeart = useCallback((type = 'heart') => {
    const id = heartCounter++;
    const left = 10 + Math.random() * 75; // 10% – 85%
    const duration = 2.2 + Math.random() * 1.4; // 2.2s – 3.6s
    const delay = Math.random() * 0.3;
    const scale = 0.85 + Math.random() * 0.45;
    const drift = (Math.random() - 0.5) * 60; // ±30px horizontal drift

    const heart = { id, emoji: EMOJIS[type] || '❤️', left, duration, delay, scale, drift };
    setHearts(prev => [...prev, heart]);

    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== id));
    }, (duration + delay + 0.3) * 1000);
  }, []);

  // Expose spawnHeart to parent via ref
  useImperativeHandle(ref, () => ({ spawn: spawnHeart }), [spawnHeart]);

  return (
    <div className={styles.container} aria-hidden="true">
      {hearts.map(h => (
        <div
          key={h.id}
          className={styles.heart}
          style={{
            left: `${h.left}%`,
            animationDuration: `${h.duration}s`,
            animationDelay: `${h.delay}s`,
            fontSize: `${1.2 * h.scale}rem`,
            '--drift': `${h.drift}px`,
          }}
        >
          {h.emoji}
        </div>
      ))}
    </div>
  );
});

export default FloatingHearts;
