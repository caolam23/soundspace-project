import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './AudioPreview.module.css';
import { LuPlay, LuPause, LuExternalLink } from 'react-icons/lu';

// =============================================
// 🔊 Singleton: chỉ cho phép 1 Audio instance phát cùng lúc
// =============================================
let globalAudioInstance = null;
let globalStopCallback = null;

const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioPreview = ({ source, audioUrl, youtubeId, youtubeUrl, duration, requestId }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration || 0);
    const [isLoading, setIsLoading] = useState(false);
    const progressRef = useRef(null);
    const audioRef = useRef(null);
    const requestIdRef = useRef(requestId);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current = null;
            }
            // Clear global nếu đang là instance hiện tại
            if (globalStopCallback === stopPlayback) {
                globalAudioInstance = null;
                globalStopCallback = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stopPlayback = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        setIsPlaying(false);
        setCurrentTime(0);
    }, []);

    const handlePlayPause = useCallback(() => {
        if (source !== 'upload' || !audioUrl) return;

        // Đang phát → Pause
        if (isPlaying) {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setIsPlaying(false);
            return;
        }

        // Singleton: dừng bài khác nếu đang phát
        if (globalAudioInstance && globalStopCallback && globalAudioInstance !== audioRef.current) {
            globalStopCallback();
        }

        setIsLoading(true);

        // Tạo Audio instance nếu chưa có hoặc URL đã thay đổi
        if (!audioRef.current || audioRef.current.src !== audioUrl) {
            const audio = new Audio(audioUrl);
            audio.crossOrigin = 'anonymous';
            audio.preload = 'auto';

            audio.addEventListener('loadedmetadata', () => {
                if (audio.duration && !isNaN(audio.duration)) {
                    setAudioDuration(audio.duration);
                }
            });

            audio.addEventListener('timeupdate', () => {
                setCurrentTime(audio.currentTime);
            });

            audio.addEventListener('ended', () => {
                setIsPlaying(false);
                setCurrentTime(0);
            });

            audio.addEventListener('canplay', () => {
                setIsLoading(false);
            });

            audio.addEventListener('error', () => {
                setIsLoading(false);
                setIsPlaying(false);
            });

            audioRef.current = audio;
        }

        // Play
        audioRef.current.play()
            .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
                // Đăng ký singleton
                globalAudioInstance = audioRef.current;
                globalStopCallback = stopPlayback;
            })
            .catch(() => {
                setIsLoading(false);
                setIsPlaying(false);
            });
    }, [source, audioUrl, isPlaying, stopPlayback]);

    // Seek: click trên progress bar
    const handleProgressClick = useCallback((e) => {
        if (!audioRef.current || !progressRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
        const seekTime = ratio * (audioDuration || audioRef.current.duration || 0);
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    }, [audioDuration]);

    const progressPercent = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    // =============================================
    // 📺 YouTube: hiển thị nút mở YouTube
    // =============================================
    if (source === 'youtube') {
        const ytUrl = youtubeUrl || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null);
        if (!ytUrl) return null;

        return (
            <div className={styles.container}>
                <a
                    href={ytUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.youtubeLink}
                    title="Nghe trước trên YouTube"
                >
                    <LuExternalLink size={14} />
                    <span>Nghe trên YouTube</span>
                </a>
                {duration > 0 && (
                    <span className={styles.duration}>{formatTime(duration)}</span>
                )}
            </div>
        );
    }

    // =============================================
    // 🎵 Upload: inline audio player
    // =============================================
    if (source === 'upload' && audioUrl) {
        return (
            <div className={styles.container}>
                {/* Play/Pause Button */}
                <button
                    className={`${styles.playBtn} ${isPlaying ? styles.playing : ''}`}
                    onClick={handlePlayPause}
                    disabled={isLoading}
                    title={isPlaying ? 'Tạm dừng' : 'Nghe trước'}
                >
                    {isLoading ? (
                        <div className={styles.spinner} />
                    ) : isPlaying ? (
                        <LuPause size={14} />
                    ) : (
                        <LuPlay size={14} />
                    )}
                </button>

                {/* Progress Bar */}
                <div
                    className={styles.progressBar}
                    ref={progressRef}
                    onClick={handleProgressClick}
                >
                    <div
                        className={styles.progressFill}
                        style={{ width: `${progressPercent}%` }}
                    />
                    {/* Seek Knob */}
                    {isPlaying && (
                        <div
                            className={styles.seekKnob}
                            style={{ left: `${progressPercent}%` }}
                        />
                    )}
                </div>

                {/* Time */}
                <span className={styles.time}>
                    {formatTime(currentTime)} / {formatTime(audioDuration)}
                </span>
            </div>
        );
    }

    return null;
};

export default AudioPreview;
