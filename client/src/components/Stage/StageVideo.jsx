// client/src/components/Stage/StageVideo.jsx
// Single participant tile inside the stage grid
import React from 'react';
import { Mic, MicOff, Video, VideoOff } from 'react-feather';
import styles from './StageVideo.module.css';

export default function StageVideo({ user, isLocal = false, onKick, isHost }) {
  const { username, avatar, micEnabled = true, camEnabled = true } = user;

  return (
    <div className={`${styles.tile} ${isLocal ? styles.localTile : ''}`}>
      {/* Video / Avatar placeholder */}
      <div className={styles.videoArea}>
        {!camEnabled ? (
          <div className={styles.avatarFallback}>
            <img src={avatar || '/default-avatar.png'} alt={username} className={styles.avatar} />
          </div>
        ) : (
          <div className={styles.cameraPlaceholder}>
            <Video size={32} color="#6b7280" />
            <span className={styles.cameraHint}>Cam bật</span>
          </div>
        )}
      </div>

      {/* Overlay info bar */}
      <div className={styles.infoBar}>
        <span className={styles.username}>{username}{isLocal && ' (bạn)'}</span>
        <div className={styles.mediaIcons}>
          {micEnabled ? <Mic size={13} color="#4ade80" /> : <MicOff size={13} color="#ef4444" />}
          {camEnabled ? <Video size={13} color="#4ade80" /> : <VideoOff size={13} color="#ef4444" />}
        </div>
        {isHost && !isLocal && (
          <button className={styles.kickBtn} onClick={onKick} title="Kick khỏi sân khấu">✕</button>
        )}
      </div>
    </div>
  );
}
