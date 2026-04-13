import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import PodcastHostControls from './PodcastHostControls';
import PodcastListener from './PodcastListener';
import AudienceInteractionPanel from './Interactions/AudienceInteractionPanel';
import AudienceInteractionAnimations from './Interactions/AudienceInteractionAnimations';
import styles from './PodcastRoom.module.css';

export default function PodcastRoom({ roomId, role = 'listener', currentUser, podcastDuration = 900 }) {
  const socket = useSocket();
  const [isLive, setIsLive] = useState(false);
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const onStarted = ({ meta }) => {
      setIsLive(true);
      if (meta && meta.duration) setRemaining(Number(meta.duration));
    };

    const onStopped = () => {
      setIsLive(false);
      setRemaining(null);
    };

    socket.on('podcast:started', onStarted);
    socket.on('podcast:stopped', onStopped);
    socket.on('podcast:force-stop', onStopped);

    return () => {
      socket.off('podcast:started', onStarted);
      socket.off('podcast:stopped', onStopped);
      socket.off('podcast:force-stop', onStopped);
    };
  }, [socket]);

  useEffect(() => {
    if (!remaining) return;
    const timer = setInterval(() => {
      setRemaining((c) => {
        if (!c || c <= 1) {
          clearInterval(timer);
          return null;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const formatTime = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      {/* Animations overlay */}
      <AudienceInteractionAnimations roomId={roomId} />

      <div className={`${styles.statusBar} ${isLive ? styles.statusLive : ''}`}>
        <div className={styles.statusContent}>
          <div className={styles.statusBadge}>
            <span className={isLive ? styles.liveDot : styles.idleDot} />
            <span className={styles.statusText}>{isLive ? 'ON AIR' : 'STANDBY'}</span>
          </div>

          <div className={styles.statusInfoGroup}>
            {remaining !== null && isLive && (
              <div className={styles.countdownDisplay}>
                <span className={styles.countdownLabel}>Thời gian còn lại</span>
                <span className={styles.countdownValue}>{formatTime(remaining)}</span>
              </div>
            )}
            <div className={styles.roomInfo}>
              <span className={styles.roomLabel}>Phòng:</span>
              <span className={styles.roomValue}>{roomId}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.main}>
        {role === 'host' ? (
          <PodcastHostControls 
            roomId={roomId} 
            currentUser={currentUser} 
            podcastDuration={podcastDuration} 
          />
        ) : (
          <>
            <PodcastListener roomId={roomId} />
            {/* ✅ Audience interaction panel for listeners only */}
            <AudienceInteractionPanel roomId={roomId} isHost={false} />
          </>
        )}
      </div>
    </div>
  );
}