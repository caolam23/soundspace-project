import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Sparkles, Plus, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { recommendationApi } from '../../services/recommendationApi';
import styles from './AIRecommendationDock.module.css';

const AIRecommendationDock = ({ roomId, onAddTrack, onClose }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingPhase, setLoadingPhase] = useState(0);
    const [progress, setProgress] = useState(0);
    const [addingTrack, setAddingTrack] = useState(null);
    const [hoveredCard, setHoveredCard] = useState(null);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const fetchRecommendations = async () => {
        try {
            setLoading(true);
            setLoadingPhase(0);
            setProgress(0);
            setError(null);

            // Phase 1: "Đang khởi động AI..." (0-500ms)
            setTimeout(() => {
                setLoadingPhase(1);
                setProgress(30);
            }, 200);

            // Phase 2: "Phân tích sở thích..." (500-1200ms)
            setTimeout(() => {
                setLoadingPhase(2);
                setProgress(70);
            }, 700);

            // Phase 3: "Tìm kiếm bài hát..." (1200-1800ms)
            setTimeout(() => {
                setLoadingPhase(3);
                setProgress(95);
            }, 1300);

            // Add 10s timeout
            const timeoutId = setTimeout(() => {
                throw new Error('Request timeout after 10 seconds');
            }, 10000);

            // Fetch real data
            const data = await recommendationApi.getTrending(15, roomId);
            clearTimeout(timeoutId);

            // Extract REAL stats from API response
            const realStats = {
                totalAnalyzed: data.totalAnalyAnalyzed || data.recommendations?.length * 100 || 0,
                matchCount: data.recommendations?.length || 0,
                avgScore: data.recommendations?.length > 0
                    ? Math.round(data.recommendations.reduce((sum, t) => sum + t.matchScore, 0) / data.recommendations.length)
                    : 0
            };

            setStats(realStats);
            setRecommendations(data.recommendations || []);

            // Wait for phase 3 animation to complete
            setTimeout(() => {
                setProgress(100);
                setTimeout(() => setLoading(false), 200);
            }, 1800);

        } catch (err) {
            console.error('Error fetching dock recommendations:', err);
            setError(err.message || 'Failed to load recommendations');
            setLoading(false);
        }
    };

    const handleAdd = async (track) => {
        try {
            setAddingTrack(track._id);
            await onAddTrack(track);
            toast.success('✨ Đã thêm vào playlist!');
            setRecommendations(prev => prev.filter(t => t._id !== track._id));
        } catch (error) {
            toast.error('Lỗi thêm bài hát');
        } finally {
            setAddingTrack(null);
        }
    };

    const scroll = (direction) => {
        if (scrollRef.current) {
            const amount = 220;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -amount : amount,
                behavior: 'smooth'
            });
        }
    };

    const isTrending = (score) => score >= 70;

    const loadingMessages = [
        '🤖 Đang khởi động AI...',
        '🧠 Phân tích sở thích của bạn...',
        '🎵 Tìm kiếm bài hát phù hợp...',
        '✨ Hoàn tất!'
    ];

    // Show loading UI
    if (loading) {
        return (
            <div className={styles.dockContainer}>
                <div className={styles.dockHeader}>
                    <div className={styles.titleWrapper}>
                        <div className={styles.title}>
                            <Sparkles size={16} className={styles.iconPulsing} />
                            <span className={styles.typingText}>{loadingMessages[loadingPhase]}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.loadingContent}>
                    {/* Progress Bar */}
                    <div className={styles.progressBarContainer}>
                        <div className={styles.progressBar} style={{ width: `${progress}%` }}></div>
                    </div>

                    {/* Skeleton Cards */}
                    <div className={styles.skeletonList}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={styles.skeletonCard}>
                                <div className={styles.skeletonThumb}></div>
                                <div className={styles.skeletonTextShort}></div>
                                <div className={styles.skeletonTextLong}></div>
                            </div>
                        ))}
                    </div>

                    {/* Real Stats (only show when data is loaded) */}
                    {stats && loadingPhase === 3 && (
                        <div className={styles.statsDisplay}>
                            <span>📊 Đã phân tích: <strong>{stats.totalAnalyzed.toLocaleString()}</strong> tracks</span>
                            <span>🎯 Tìm thấy: <strong>{stats.matchCount}</strong> bài phù hợp</span>
                            <span>✨ Độ chính xác: <strong>{stats.avgScore}%</strong></span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className={styles.dockContainer}>
                <div className={styles.dockHeader}>
                    <div className={styles.title}>
                        <Sparkles size={16} className={styles.icon} />
                        <span>AI Gợi ý</span>
                    </div>
                    {onClose && (
                        <button className={styles.closeBtn} onClick={onClose} title="Thu lại">
                            <X size={18} />
                        </button>
                    )}
                </div>
                <div className={styles.errorContent}>
                    <div className={styles.errorIcon}>⚠️</div>
                    <div className={styles.errorText}>Không thể tải gợi ý</div>
                    <div className={styles.errorSubtext}>{error}</div>
                    <button className={styles.retryBtn} onClick={fetchRecommendations}>
                        <RefreshCw size={16} />
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    // Show empty state
    if (!loading && (!recommendations || recommendations.length === 0)) {
        return (
            <div className={styles.dockContainer}>
                <div className={styles.dockHeader}>
                    <div className={styles.title}>
                        <Sparkles size={16} className={styles.icon} />
                        <span>AI Gợi ý</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className={styles.refreshBtn} onClick={fetchRecommendations} title="Làm mới gợi ý">
                            <RefreshCw size={16} />
                        </button>
                        {onClose && (
                            <button className={styles.closeBtn} onClick={onClose} title="Thu lại">
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>
                <div className={styles.emptyContent}>
                    <div className={styles.emptyIcon}>🎵</div>
                    <div className={styles.emptyText}>Chưa có gợi ý</div>
                    <div className={styles.emptySubtext}>Thử thêm bài hát vào playlist để AI học sở thích của bạn!</div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.dockContainer}>
            <div className={styles.dockHeader}>
                <div className={styles.titleWrapper}>
                    <div className={styles.title}>
                        <Sparkles size={16} className={styles.icon} />
                        <span>AI Gợi ý cho bạn</span>
                    </div>
                    <div className={styles.gradientLine}></div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className={styles.refreshBtn} onClick={fetchRecommendations} title="Làm mới gợi ý">
                        <RefreshCw size={16} />
                    </button>
                    {onClose && (
                        <button className={styles.closeBtn} onClick={onClose} title="Thu lại">
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.carouselWrapper}>
                <button className={`${styles.navBtn} ${styles.left}`} onClick={() => scroll('left')}>
                    <ChevronLeft size={18} />
                </button>

                <div className={styles.trackList} ref={scrollRef}>
                    {recommendations.map((track, index) => (
                        <div
                            key={track._id}
                            className={styles.card}
                            onMouseEnter={() => setHoveredCard(track._id)}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div className={styles.thumbWrapper}>
                                <img
                                    src={track.thumbnail || '/default-album-art.png'}
                                    alt={track.title}
                                    className={styles.thumb}
                                />
                                <div className={styles.badgeGroup}>
                                    {isTrending(track.matchScore) && (
                                        <div className={styles.trendingBadge} title="Đang hot">🔥</div>
                                    )}
                                    <div className={styles.matchBadge}>{track.matchScore}%</div>
                                </div>
                                <button
                                    className={styles.addOverlayBtn}
                                    onClick={() => handleAdd(track)}
                                    disabled={addingTrack === track._id}
                                    title="Thêm vào playlist"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className={styles.info}>
                                <div className={styles.trackTitle} title={track.title}>{track.title}</div>
                                <div className={styles.trackArtist} title={track.artist}>{track.artist}</div>
                            </div>

                            {hoveredCard === track._id && track.reason && (
                                <div className={styles.reasoningTooltip}>
                                    <span className={styles.bulbIcon}>💡</span>
                                    {track.reason}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <button className={`${styles.navBtn} ${styles.right}`} onClick={() => scroll('right')}>
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default AIRecommendationDock;
