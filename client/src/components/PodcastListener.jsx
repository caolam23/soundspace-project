import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Headphones, Activity, MicOff } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import styles from './PodcastListener.module.css';

export default function PodcastListener({ roomId }) {
  const socket = useSocket();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isHostMuted, setIsHostMuted] = useState(false); // State quản lý Mic của Host
  const [volume, setVolume] = useState(1);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  
  const audioElRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const audioQueueRef = useRef([]);

  useEffect(() => {
    if (!socket) return;

    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    
    if (audioElRef.current) {
      audioElRef.current.src = URL.createObjectURL(mediaSource);
    }

    mediaSource.addEventListener('sourceopen', () => {
      try {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
        sourceBuffer.mode = 'sequence'; 
        sourceBufferRef.current = sourceBuffer;

        sourceBuffer.addEventListener('updateend', () => {
          if (audioQueueRef.current.length > 0 && !sourceBuffer.updating) {
            const nextChunk = audioQueueRef.current.shift();
            sourceBuffer.appendBuffer(nextChunk);
          }
        });
      } catch (err) {
        console.error('Lỗi khởi tạo MediaSource', err);
      }
    });

    const onChunk = ({ chunk }) => {
      try {
        const ab = chunk instanceof ArrayBuffer ? chunk : (chunk?.data || chunk);
        audioQueueRef.current.push(ab);

        if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
          const nextChunk = audioQueueRef.current.shift();
          sourceBufferRef.current.appendBuffer(nextChunk);
        }

        if (audioElRef.current && audioElRef.current.paused) {
          audioElRef.current.play()
            .then(() => {
              setIsPlaying(true);
              setNeedsUserInteraction(false);
            })
            .catch(() => {
              setNeedsUserInteraction(true);
            });
        }
      } catch (err) {}
    };

    socket.on('podcast:audio-chunk', onChunk);
    
    // Xử lý khi Host tắt/mở mic
    socket.on('podcast:host-mute', ({ muted }) => {
      setIsHostMuted(muted);
    });

    socket.on('podcast:started', ({ isMuted }) => {
      setIsLive(true);
      setIsHostMuted(isMuted || false);
      audioQueueRef.current = []; 
    });

    socket.on('podcast:stopped', () => {
      setIsLive(false);
      setIsPlaying(false);
      setIsHostMuted(false);
      if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
        mediaSourceRef.current.endOfStream();
      }
    });

    socket.on('podcast:force-stop', () => {
      setIsLive(false);
      setIsPlaying(false);
      setIsHostMuted(false);
    });

    socket.emit('podcast:join', { roomId, role: 'listener' });

    return () => {
      socket.off('podcast:audio-chunk', onChunk);
      socket.off('podcast:host-mute');
      socket.off('podcast:started');
      socket.off('podcast:stopped');
      socket.off('podcast:force-stop');
      socket.emit('podcast:leave', { roomId });
    };
  }, [socket, roomId]);

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioElRef.current) {
      audioElRef.current.volume = val;
    }
  };

  const forcePlay = () => {
    if (audioElRef.current) {
      audioElRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setNeedsUserInteraction(false);
        })
        .catch(err => console.error("Không thể tự động phát:", err));
    }
  };

  return (
    <div className={styles.postcard}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><Headphones size={28} /></div>
        <div className={styles.headerText}>
          <h2>Kênh Khán Giả</h2>
          <p>Luồng âm thanh trực tiếp từ hệ thống</p>
        </div>
      </div>

      <div className={styles.visualCard}>
        {isLive ? (
          isHostMuted ? (
            /* UI KHI HOST TẮT MIC */
            <div className={styles.mutedIndicator}>
              <MicOff size={44} className={styles.mutedIcon} />
              <p className={styles.mutedText}>Chủ phòng đang tạm tắt Micro</p>
            </div>
          ) : (
            /* UI KHI ĐANG PHÁT BÌNH THƯỜNG */
            <div className={styles.liveIndicator}>
              <div className={styles.waves}>
                <span className={isPlaying ? styles.animate : ''}></span>
                <span className={isPlaying ? styles.animate : ''}></span>
                <span className={isPlaying ? styles.animate : ''}></span>
                <span className={isPlaying ? styles.animate : ''}></span>
                <span className={isPlaying ? styles.animate : ''}></span>
              </div>
              <p className={styles.liveText}>
                <Activity size={16} /> TRUYỀN PHÁT TRỰC TIẾP
              </p>
            </div>
          )
        ) : (
          /* UI KHI KHÔNG CÓ LIVE */
          <div className={styles.offlineIndicator}>
            <Headphones size={48} className={styles.offlineIcon} />
            <p>Hệ thống âm thanh hiện đang tạm ngưng</p>
          </div>
        )}
      </div>

      {needsUserInteraction && isLive && !isHostMuted && (
        <button className={styles.btnForcePlay} onClick={forcePlay}>
          <Play size={20} fill="currentColor" />
          Kích Hoạt Âm Thanh
        </button>
      )}

      {/* Thẻ audio ẩn tuyệt đối để khán giả không thể thao tác */}
      <audio ref={audioElRef} style={{ display: 'none' }} />

      <div className={styles.volumeCard}>
        <div className={styles.volumeHeader}>
          {volume === 0 ? <VolumeX size={20} color="#64748b" /> : <Volume2 size={20} color="#e2e8f0" />}
          <span>Bộ Điều Chỉnh Âm Lượng</span>
        </div>
        
        <div className={styles.sliderContainer}>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume} 
            onChange={handleVolumeChange}
            className={styles.volumeSlider}
            disabled={!isLive}
          />
        </div>
      </div>
    </div>
  );
}