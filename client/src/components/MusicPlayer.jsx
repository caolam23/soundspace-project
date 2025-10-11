import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Upload, Link as LinkIcon, Play, Pause, SkipBack, SkipForward } from 'react-feather';
import 'react-toastify/dist/ReactToastify.css';
import './MusicPlayer.css';
import { toastConfig } from '../services/toastConfig';
import UploadModal from './UploadModal'; // <-- ĐÃ IMPORT MODAL

// ====================================================================
// ⚙️ CÁC HẰNG SỐ ĐỒNG BỘ
// ====================================================================
const SYNC_THRESHOLD = 1.5; // Ngưỡng lệch thời gian (giây)
const SYNC_INTERVAL = 3000; // Tần suất host gửi sync (ms)

// ====================================================================
// 🧩 HÀM HỖ TRỢ
// ====================================================================
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const parseJwt = (token) => {
  try {
    const base64 = token.split('.')[1];
    const json = JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
    return json;
  } catch (e) {
    return null;
  }
};

// ====================================================================
// 🎵 COMPONENT CHÍNH
// ====================================================================
const MusicPlayer = ({ roomData, isHost, roomId, socket }) => {
  // --- STATE CHÍNH ---
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [link, setLink] = useState('');
  const [activeInput, setActiveInput] = useState('link');
  const [playerUrl, setPlayerUrl] = useState(null);
  const [progress, setProgress] = useState({ playedSeconds: 0, duration: 0 });
  const [initialSeekTime, setInitialSeekTime] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false); // <-- ĐÃ THÊM STATE CHO MODAL

  // --- HIỆU ỨNG NHỊP ĐẬP THUMBNAIL ---
  const [thumbnailPulse, setThumbnailPulse] = useState(0);

  // --- REFs ---
  const playerRef = useRef(null);
  const progressBarRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  // ====================================================================
  // ✅ HÀM VISUALIZE ÂM THANH
  // ====================================================================
  const visualizeAudio = () => {
    if (!analyserRef.current || !audioContextRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength / 3; i++) {
        sum += dataArray[i];
      }
      const average = sum / (bufferLength / 3);
      const pulseStrength = Math.min(1, Math.max(0, (average - 40) / 120));
      setThumbnailPulse(pulseStrength);
    };
    animate();
  };

  // ====================================================================
  // ✅ KHỞI TẠO WEB AUDIO API
  // ====================================================================
  useEffect(() => {
    const audioEl = playerRef.current;
    if (!audioEl) return;

    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioCtx();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch {}
    }

    const source = audioContextRef.current.createMediaElementSource(audioEl);
    sourceNodeRef.current = source;
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [playerUrl]);

  const currentTrack = playlist[currentTrackIndex];

  // ====================================================================
  // ĐỒNG BỘ STATE KHI ROOMDATA TỪ SERVER THAY ĐỔI
  // ====================================================================
  useEffect(() => {
    if (!roomData) return;
    const rdPlaylistIds = (roomData.playlist || []).map(t => t._id || t.sourceId).join(',');
    const localPlaylistIds = (playlist || []).map(t => t._id || t.sourceId).join(',');

    if (rdPlaylistIds !== localPlaylistIds) setPlaylist(roomData.playlist || []);
    if ((roomData.currentTrackIndex ?? -1) !== currentTrackIndex)
      setCurrentTrackIndex(roomData.currentTrackIndex ?? -1);
    if ((roomData.isPlaying ?? false) !== isPlaying)
      setIsPlaying(roomData.isPlaying ?? false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomData]);

  // ====================================================================
  // CẬP NHẬT STREAM URL KHI BÀI NHẠC THAY ĐỔI
  // ====================================================================
  useEffect(() => {
    if (!currentTrack) {
      setPlayerUrl(null);
      return;
    }
    
    // ✅ LOGIC ĐÃ ĐƯỢC CẬP NHẬT
    if (currentTrack.source === 'upload') {
      // Nếu là bài hát upload, dùng trực tiếp URL từ Cloudinary
      setPlayerUrl(currentTrack.url);
    } else if (currentTrack.sourceId) {
      // Nếu từ YouTube/SoundCloud, dùng route stream như cũ
      const streamUrl = `http://localhost:8800/api/stream/${currentTrack.sourceId}`;
      setPlayerUrl(streamUrl);
    } else {
      setPlayerUrl(null);
    }
  }, [currentTrack]);

  // ====================================================================
  // XỬ LÝ PLAY/PAUSE KHI STATE THAY ĐỔI
  // ====================================================================
  useEffect(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.play().catch(error => console.error("Audio play failed:", error));
    } else {
      playerRef.current.pause();
    }
  }, [isPlaying, playerUrl]);

  // ====================================================================
  // SOCKET: JOIN ROOM & REGISTER USER
  // ====================================================================
  useEffect(() => {
    if (!socket) return;
    const doJoin = () => {
      try {
        socket.emit('join-room', roomId);
        const token = localStorage.getItem('token');
        const payload = token ? parseJwt(token) : null;
        const uid = payload?.id || payload?._id || payload?.userId;
        if (uid) socket.emit('register-user', uid);
      } catch (e) {
        console.warn('join-room/register-user failed', e);
      }
    };
    if (socket.connected) doJoin();
    socket.on('connect', doJoin);
    socket.on('reconnect', doJoin);
    return () => {
      socket.off('connect', doJoin);
      socket.off('reconnect', doJoin);
    };
  }, [socket, roomId]);

  // ====================================================================
  // SOCKET EVENTS: PLAYLIST, PLAYBACK, SYNC TIME
  // ====================================================================
  useEffect(() => {
    if (!socket) return;
    const handlePlaylistUpdate = (newPlaylist) => setPlaylist(newPlaylist || []);
    const handlePlaybackChange = (newState) => {
      if (newState?.playlist) setPlaylist(newState.playlist);
      if (typeof newState?.currentTrackIndex !== 'undefined')
        setCurrentTrackIndex(newState.currentTrackIndex);
      if (typeof newState?.isPlaying !== 'undefined')
        setIsPlaying(newState.isPlaying);

      if (newState?.isPlaying && newState.playbackStartTime) {
        const serverStart = new Date(newState.playbackStartTime).getTime();
        const elapsed = (Date.now() - serverStart) / 1000;
        const duration = newState.playlist?.[newState.currentTrackIndex]?.duration;
        if (elapsed > 0 && (!duration || elapsed < duration)) {
          setInitialSeekTime(elapsed);
        } else {
          setInitialSeekTime(null);
        }
      } else {
        setInitialSeekTime(null);
      }
    };
    const handleTimeUpdateFromServer = ({ currentTime }) => {
      if (isHost || !playerRef.current || !isPlaying) return;
      const delta = Math.abs(currentTime - playerRef.current.currentTime);
      if (delta > SYNC_THRESHOLD) {
        console.warn(`[SYNC] Drifted ${delta.toFixed(2)}s -> syncing`);
        playerRef.current.currentTime = currentTime;
      }
    };

    socket.on('playlist-updated', handlePlaylistUpdate);
    socket.on('playback-state-changed', handlePlaybackChange);
    socket.on('time-updated', handleTimeUpdateFromServer);

    return () => {
      socket.off('playlist-updated', handlePlaylistUpdate);
      socket.off('playback-state-changed', handlePlaybackChange);
      socket.off('time-updated', handleTimeUpdateFromServer);
    };
  }, [socket, isHost, isPlaying]);

  // ====================================================================
  // GỬI ĐỒNG BỘ TỪ HOST
  // ====================================================================
  useEffect(() => {
    if (!isHost || !isPlaying || !socket) return;
    const syncId = setInterval(() => {
      if (playerRef.current) {
        const currentTime = playerRef.current.currentTime;
        socket.emit('sync-time', { roomId, currentTime });
      }
    }, SYNC_INTERVAL);
    return () => clearInterval(syncId);
  }, [isHost, isPlaying, socket, roomId]);

  // ====================================================================
  // HÀM XỬ LÝ THÊM NHẠC TỪ LINK
  // ====================================================================   
  const handleAddFromLink = async (e) => {
    e.preventDefault();
    if (!link.trim()) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `http://localhost:8800/api/rooms/${roomId}/playlist`,
        { url: link },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.playlist) {
        setPlaylist(res.data.playlist);
        if (res.data.playlist.length === 1) {
          setCurrentTrackIndex(0);
          setIsPlaying(true);
        }
      }
      setLink("");
      toast.success("Đã thêm bài hát vào danh sách!", toastConfig);
    } catch (err) {
      console.error("Lỗi khi thêm bài hát:", err);
      const status = err.response?.status;
      const msg = err.response?.data?.msg || "Thêm bài hát thất bại";
      if (status === 409) {
        toast.info(msg, { ...toastConfig, icon: "🔁", style: { ...toastConfig.style, backgroundColor: "#2563eb", color: "white" } });
      } else {
        toast.error(msg, { ...toastConfig, style: { ...toastConfig.style, backgroundColor: "#dc2626", color: "white" } });
      }
    }
  };

  // ====================================================================
  // GỬI LỆNH ĐIỀU KHIỂN (PLAY, PAUSE, NEXT, PREV, SEEK)
  // ====================================================================
  const sendControlAction = (type, payload = {}) => {
    if (!socket || !isHost) return;
    socket.emit('music-control', { roomId, action: { type, payload } });
    
    // Optimistic UI updates
    if (type === 'PLAY') {
      const idx = typeof payload.trackIndex !== 'undefined' ? payload.trackIndex : (currentTrackIndex === -1 ? 0 : currentTrackIndex);
      if (idx >= 0 && idx < playlist.length) {
        setCurrentTrackIndex(idx);
        setIsPlaying(true);
      }
    } else if (type === 'PAUSE') {
      setIsPlaying(false);
    } else if (type === 'SKIP_NEXT') {
      if (playlist.length > 0) {
        const next = (currentTrackIndex + 1) % playlist.length;
        setCurrentTrackIndex(next);
        setIsPlaying(true);
      }
    } else if (type === 'SKIP_PREVIOUS') {
      if (playlist.length > 0) {
        const prev = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        setCurrentTrackIndex(prev);
        setIsPlaying(true);
      }
    } else if (type === 'SEEK_TO') {
      if (playerRef.current && typeof payload.time === 'number') {
        playerRef.current.currentTime = payload.time;
        setProgress(prev => ({ ...prev, playedSeconds: payload.time }));
      }
    }
  };

  const handleSelectTrack = (index) => {
    if (!isHost) return;
    sendControlAction('PLAY', { trackIndex: index });
  };

  const handleSeek = (e) => {
    if (!isHost || !playerRef.current || !progressBarRef.current || progress.duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const barWidth = progressBarRef.current.clientWidth;
    const clampedX = Math.max(0, Math.min(clickX, barWidth));
    const seekRatio = clampedX / barWidth;
    const newTime = progress.duration * seekRatio;
    sendControlAction('SEEK_TO', { time: newTime });
  };

  // ====================================================================
  // AUDIO EVENT HANDLERS
  // ====================================================================
  const handleOnPlay = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    visualizeAudio();
  };

  const handleOnPause = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    setThumbnailPulse(0);
  };

  const handleOnError = (e) => {
    console.error('[AudioPlayer] Error:', e);
    toast.error("Lỗi phát nhạc. Vui lòng thử bài khác!");
  };

  const handleTimeUpdate = (e) => {
    const audio = e.target;
    setProgress({ playedSeconds: audio.currentTime, duration: audio.duration });
  };

  const progressPercent = progress.duration > 0 ? (progress.playedSeconds / progress.duration) * 100 : 0;

  return (
    <div className="music-player-container">
      <div style={{ display: 'none' }}>
        {playerUrl && (
          <audio
            ref={playerRef}
            src={playerUrl}
            onPlay={handleOnPlay}
            onPause={handleOnPause}
            onEnded={() => sendControlAction('SKIP_NEXT')}
            onError={handleOnError}
            onTimeUpdate={handleTimeUpdate}
            crossOrigin="anonymous"
            onLoadedMetadata={(e) => {
              handleTimeUpdate(e);
              if (initialSeekTime !== null) {
                e.target.currentTime = initialSeekTime;
                setInitialSeekTime(null);
              }
            }}
            key={`${currentTrack?.sourceId || 'no'}-${currentTrack?._id || ''}`}
          />
        )}
      </div>

      {/* ✅ RENDER MODAL CÓ ĐIỀU KIỆN */}
      {isUploadModalOpen && <UploadModal roomId={roomId} onClose={() => setIsUploadModalOpen(false)} />}
      
      <aside className="roompage-left">
        <h2>Danh sách phát</h2>
        {isHost && (
          <div className="add-music-section">
            <div className="add-music-tabs">
              <button onClick={() => setActiveInput('upload')} className={activeInput === 'upload' ? 'active' : ''}>
                <Upload size={16} /> Tải lên
              </button>
              <button onClick={() => setActiveInput('link')} className={activeInput === 'link' ? 'active' : ''}>
                <LinkIcon size={16} /> Từ link
              </button>
            </div>

            {activeInput === 'link' && (
              <form onSubmit={handleAddFromLink} className="add-music-form">
                <input
                  type="text"
                  placeholder="Dán link YouTube hoặc SoundCloud..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
                <button type="submit">+</button>
              </form>
            )}

            {/* ✅ PHẦN TẢI LÊN ĐÃ ĐƯỢC CẬP NHẬT */}
            {activeInput === 'upload' && (
              <div className="add-music-form">
                <button
                  className="upload-trigger-button"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  Mở trình tải lên
                </button>
              </div>
            )}
          </div>
        )}

        <div className="roompage-queue">
          <ul className="roompage-queue-list">
            {playlist.length === 0 && <li className="empty-queue">Danh sách phát trống</li>}
            {playlist.map((track, index) => (
              <li
                key={track._id || track.sourceId || index}
                className={`roompage-queue-item ${index === currentTrackIndex ? "roompage-now-playing" : ""}`}
                onClick={() => handleSelectTrack(index)}
                style={{ cursor: isHost ? 'pointer' : 'default' }}
              >
                <div className="roompage-album-thumb">
                  <img src={track.thumbnail} alt={track.title} onError={(e) => e.target.style.display = 'none'} />
                </div>
                <div className="roompage-queue-info">
                  <h3>{track.title}</h3>
                  <p>{track.artist}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="music-player-main-content">
        {currentTrack?.thumbnail && (
          <div className="roompage-blur-bg" style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}></div>
        )}
        <div className="roompage-song-info-main">
          <h1>{currentTrack?.title || "Chưa có bài hát"}</h1>
          <p>{currentTrack?.artist || "Hãy thêm một bài hát vào danh sách"}</p>
        </div>
        <div
          className="roompage-progress-bar-container"
          ref={progressBarRef}
          onClick={handleSeek}
          style={{ cursor: isHost ? 'pointer' : 'default' }}
        >
          <div className="roompage-progress-bar" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <div className="roompage-time-info">
          <span>{formatTime(progress.playedSeconds)}</span>
          <span>{formatTime(progress.duration)}</span>
        </div>
        <div className="roompage-thumbnail-center">
          {currentTrack?.thumbnail ? (
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="roompage-thumbnail-img"
              onError={(e) => e.target.style.display = 'none'}
              style={{
                transform: `scale(${1 + thumbnailPulse * 0.07})`,
                boxShadow: `0 0 ${thumbnailPulse * 25}px rgba(255, 255, 255, ${thumbnailPulse * 0.6})`,
              }}
            />
          ) : (
            <div
              className="roompage-thumbnail-placeholder"
              style={{
                transform: `scale(${1 + thumbnailPulse * 0.07})`,
                boxShadow: `0 0 ${thumbnailPulse * 25}px rgba(90, 224, 255, ${thumbnailPulse * 0.6})`,
              }}
            >🎵</div>
          )}
        </div>
        <div className="roompage-player-controls-main">
          {isHost ? (
            <>
              <button className="roompage-btn-icon" onClick={() => sendControlAction('SKIP_PREVIOUS')}>
                <SkipBack size={28} />
              </button>
              <button className="roompage-btn-icon roompage-btn-play-main" onClick={() => sendControlAction(isPlaying ? 'PAUSE' : 'PLAY')}>
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </button>
              <button className="roompage-btn-icon" onClick={() => sendControlAction('SKIP_NEXT')}>
                <SkipForward size={28} />
              </button>
            </>
          ) : (
            <>
              <button className="roompage-btn-icon" disabled><SkipBack size={28} /></button>
              <button className="roompage-btn-icon roompage-btn-play-main" disabled>
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </button>
              <button className="roompage-btn-icon" disabled><SkipForward size={28} /></button>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default MusicPlayer;