// client/src/components/Stage/StageControls.jsx
// Mic / Camera toggle control bar for stage participants
import React from 'react';
import { Mic, MicOff, Video, VideoOff, LogOut } from 'react-feather';
import styles from './StageControls.module.css';

export default function StageControls({ micOn, camOn, onToggleMic, onToggleCam, onLeave }) {
  return (
    <div className={styles.controlBar}>
      <button
        className={`${styles.ctrlBtn} ${!micOn ? styles.inactive : ''}`}
        onClick={onToggleMic}
        title={micOn ? 'Tắt mic' : 'Bật mic'}
      >
        {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        <span>{micOn ? 'Mic' : 'Muted'}</span>
      </button>

      <button
        className={`${styles.ctrlBtn} ${!camOn ? styles.inactive : ''}`}
        onClick={onToggleCam}
        title={camOn ? 'Tắt camera' : 'Bật camera'}
      >
        {camOn ? <Video size={18} /> : <VideoOff size={18} />}
        <span>{camOn ? 'Cam' : 'Off'}</span>
      </button>

      <button className={`${styles.ctrlBtn} ${styles.leaveBtn}`} onClick={onLeave} title="Rời sân khấu">
        <LogOut size={18} />
        <span>Rời stage</span>
      </button>
    </div>
  );
}
