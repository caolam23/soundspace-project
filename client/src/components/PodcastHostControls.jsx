import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Square, Clock, Radio, UploadCloud, Info, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import styles from './PodcastHostControls.module.css';

/**
 * ✅ FEATURE: Strict Room Duration Management
 * Host recording controls with:
 * - Auto-stop when duration limit reached
 * - Real-time timer countdown
 * - Force-stop signal handling from server
 * - Audio chunk streaming & chunked upload
 * Implementation Date: April 2026
 */

export default function PodcastHostControls({ roomId, currentUser, podcastDuration }) {
  const socket = useSocket();
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [hasFinished, setHasFinished] = useState(false);

  const mediaStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const blobsRef = useRef([]);
  const timerRef = useRef(null);
  const chunkSeqRef = useRef(0); 

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const showAlert = (msg, type = 'info') => {
    setAlertMsg({ text: msg, type });
    setTimeout(() => setAlertMsg(null), 7000); // Tăng thời gian hiển thị lên 7s để đọc kịp cảnh báo
  };

  // Lắng nghe sự kiện ép dừng từ Server
  useEffect(() => {
    if (!socket) return;
    const handleForceStop = ({ roomId: stoppedRoomId }) => {
      if (stoppedRoomId === roomId) {
        showAlert('Đã hết thời lượng phát sóng! Đang tự động đóng luồng...', 'info');
        stopRecording();
      }
    };
    socket.on('podcast:force-stop', handleForceStop);
    return () => socket.off('podcast:force-stop', handleForceStop);
  }, [socket, roomId]);

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsMuted(false);
      blobsRef.current = [];

      const options = { mimeType: 'audio/webm;codecs=opus' };
      const recorder = new MediaRecorder(stream, options);
      recorderRef.current = recorder;

      recorder.ondataavailable = async (ev) => {
        if (ev.data && ev.data.size > 0) {
          blobsRef.current.push(ev.data);
          try {
            const arrayBuffer = await ev.data.arrayBuffer();
            if (socket && socket.connected) {
              socket.emit('podcast:audio-chunk', { 
                roomId, 
                chunk: arrayBuffer,
                seq: chunkSeqRef.current,
                timestamp: Date.now()
              });
              chunkSeqRef.current++;
            }
          } catch (err) {}
        }
      };

      recorder.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        chunkSeqRef.current = 0; 
        
        if (socket && socket.connected) {
          socket.emit('podcast:host-start', { 
            roomId, 
            meta: { duration: podcastDuration } 
          });
        }
        
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => {
            const nextTime = prev + 1;
            if (nextTime >= podcastDuration) {
              stopRecording(); 
            }
            return nextTime;
          });
        }, 1000);
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (socket && socket.connected) {
          socket.emit('podcast:host-stop', { roomId });
        }
        setTimeout(() => uploadRecording(), 500);
      };

      recorder.start(1000);
    } catch (err) {
      showAlert('Lỗi hệ thống: Không thể truy cập micro. Kiểm tra quyền trình duyệt.', 'error');
    }
  }

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
      }
      if (socket && socket.connected) {
        socket.emit('podcast:host-mute', { roomId, muted: next });
      }
    } catch (e) {}
  };

  async function uploadRecording() {
    if (blobsRef.current.length === 0) {
      showAlert('Không có dữ liệu âm thanh để lưu.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const blob = new Blob(blobsRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, `podcast_${roomId}_${Date.now()}.webm`);
      formData.append('roomId', roomId);
      formData.append('hostId', currentUser?._id || '');
      formData.append('title', `Live Podcast - ${new Date().toLocaleString('vi-VN')}`);
      formData.append('duration', Math.max(recordingTime, 1));

      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8800/api/podcasts/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      // Lấy dữ liệu parse từ Backend (Chứa thông báo lỗi nếu quá 5 lần)
      const data = await res.json();

      if (!res.ok) {
        // Nếu là lỗi 403 (Đạt giới hạn 5 bản ghi), báo lỗi cụ thể để User không hoang mang
        if (res.status === 403) {
          showAlert(data.message, 'error');
          return;
        }
        throw new Error(data.message || `Mã lỗi: ${res.status}`);
      }
      
      showAlert('Dữ liệu ghi âm đã được tải lên thành công.', 'success');
    } catch (err) {
      showAlert(`Quá trình tải lên thất bại: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
      blobsRef.current = [];
      setRecordingTime(0);
      setHasFinished(true);
    }
  }

  const progressPercent = podcastDuration > 0 ? (recordingTime / podcastDuration) * 100 : 0;

  if (hasFinished) {
    return (
      <div className={styles.postcard}>
        <div className={styles.finishedContainer}>
          <div className={styles.finishedIcon}>🎉</div>
          <h2 className={styles.finishedTitle}>Buổi Live Podcast đã kết thúc thành công!</h2>
          <p className={styles.finishedText}>
            Bản ghi âm đã được lưu vào hồ sơ của bạn. Bạn và khán giả vẫn có thể ở lại phòng để trò chuyện qua khung Chat. Nếu muốn Live tiếp, vui lòng tạo một phòng mới.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.postcard}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><Radio size={28} /></div>
        <div className={styles.headerText}>
          <h2>Studio Quản Trị</h2>
          <p>Điều khiển luồng phát thanh trực tiếp</p>
        </div>
      </div>

      <div className={styles.dashboard}>
        <div className={styles.statusSection}>
          <div className={styles.timeGroup}>
            <span className={styles.timeLabel}>Thời lượng phát sóng</span>
            <div className={styles.timeDisplay}>
              {formatTime(recordingTime)}
              <span className={styles.timeLimit}>/ {Math.floor(podcastDuration / 60)}:00</span>
            </div>
          </div>
          <div className={`${styles.statusBadge} ${isRecording ? styles.badgeLive : styles.badgeIdle}`}>
            <span className={styles.dot}></span>
            {isRecording ? 'ĐANG PHÁT SÓNG' : 'TRẠNG THÁI CHỜ'}
          </div>
        </div>

        {isRecording && (
          <div className={styles.progressWrapper}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {!isRecording ? (
        <div className={styles.setupSection}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <Clock size={16} /> Thời lượng thiết lập tĩnh
            </label>
            <div className={styles.fixedDurationDisplay}>
              <div className={styles.fixedDurationValue}>
                <Lock size={16} className={styles.lockIcon} />
                <span>{podcastDuration / 60} Phút</span>
              </div>
              <span className={styles.durationNote}>(Cấu hình lúc tạo phòng)</span>
            </div>
          </div>
          <button onClick={startRecording} disabled={isUploading} className={styles.btnStart}>
            <Mic size={20} />
            Bắt Đầu Truyền Phát
          </button>
        </div>
      ) : (
        <div className={styles.controlCenter}>
          <button 
            onClick={toggleMute}
            className={`${styles.btnMute} ${isMuted ? styles.muted : ''}`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            <span className={styles.btnText}>{isMuted ? 'Micro đang tắt' : 'Micro đang mở'}</span>
          </button>

          <button onClick={stopRecording} disabled={isUploading} className={styles.btnStop}>
            <Square size={20} />
            <span className={styles.btnText}>Kết Thúc Luồng</span>
          </button>
        </div>
      )}

      {isUploading && (
        <div className={styles.uploadState}>
          <UploadCloud className={styles.spinIcon} size={24} />
          <span>Đang đồng bộ dữ liệu âm thanh lên máy chủ...</span>
        </div>
      )}

      {alertMsg && (
        <div className={`${styles.alertBox} ${styles[alertMsg.type]}`}>
          {alertMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{alertMsg.text}</span>
        </div>
      )}

      <div className={styles.footerNote}>
        <Info size={16} />
        <span>Vui lòng kiểm tra kỹ thiết bị thu âm trước khi bắt đầu phiên trực tiếp. Tối đa 5 bản ghi âm mỗi phòng.</span>
      </div>
    </div>
  );
}