import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRequests, setRequests, updateRequestVotes } from '../../store/requestSlice';
import VoteButton from './VoteButton';
import HostActions from './HostActions';
import styles from './RequestsList.module.css';

// Import Icons hiện đại
import {
    LuMusic,
    LuUser,
    LuClock,
    LuTag,
    LuSmile,
    LuListMusic
} from "react-icons/lu";

const RequestsList = ({ roomId, isHost, currentUserId, socket }) => {
    const dispatch = useDispatch();
    const { items: requests, loading, error } = useSelector(state => state.requests);

    useEffect(() => {
        if (roomId) {
            dispatch(fetchRequests(roomId));
        }
    }, [dispatch, roomId]);

    // ✅ Socket listener for realtime updates
    useEffect(() => {
        if (!socket) return;

        const handleNewRequest = () => {
            console.log('[RequestsList] New request received, reloading...');
            dispatch(fetchRequests(roomId));
        };

        const handleRequestApproved = ({ requestId }) => {
            console.log('[RequestsList] Request approved, reloading...', requestId);
            dispatch(fetchRequests(roomId));
        };

        const handleRequestRejected = ({ requestId }) => {
            console.log('[RequestsList] Request rejected, reloading...', requestId);
            dispatch(fetchRequests(roomId));
        };

        const handleVoteUpdated = ({ requestId, votes }) => {
            console.log('[RequestsList] Vote updated, refreshing list...', requestId, votes);
            dispatch(updateRequestVotes({ requestId, votes }));
        };

        socket.on('new-song-request', handleNewRequest);
        socket.on('request-approved', handleRequestApproved);
        socket.on('request-rejected', handleRequestRejected);
        socket.on('request-vote-updated', handleVoteUpdated);

        return () => {
            socket.off('new-song-request', handleNewRequest);
            socket.off('request-approved', handleRequestApproved);
            socket.off('request-rejected', handleRequestRejected);
            socket.off('request-vote-updated', handleVoteUpdated);
        };
    }, [socket, roomId, dispatch]);

    const reloadRequests = () => {
        dispatch(fetchRequests(roomId));
    };

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return 'Vừa xong';

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Vừa xong';

        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return 'Vừa xong';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}p trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    };

    const getUserName = (req) => {
        // 1. Nếu backend trả về thông tin đầy đủ
        if (req.user && req.user.username) return req.user.username;
        if (req.requestedBy && req.requestedBy.username) return req.requestedBy.username;

        // 2. Nếu backend chỉ trả về ID (lúc vừa thêm bài hát xong)
        const userId = (typeof req.user === 'string') ? req.user : req.user?._id;
        const requestedById = (typeof req.requestedBy === 'string') ? req.requestedBy : req.requestedBy?._id;

        // Nếu ID bài hát trùng với ID của mình -> Hiện tên mình
        if (userId === currentUserId || requestedById === currentUserId) {
            try {
                const storedUser = JSON.parse(localStorage.getItem('user'));
                return storedUser?.username || "Bạn";
            } catch {
                return "Bạn";
            }
        }
        return 'Ẩn danh';
    };

    if (loading && requests.length === 0) {
        return (
            <div className={styles.loading}>
                <div className="spinner"></div> {/* CSS spinner của bạn hoặc text */}
                <span>Đang tải danh sách...</span>
            </div>
        );
    }

    if (error) {
        return <div className={styles.empty}>⚠️ Lỗi: {typeof error === 'string' ? error : 'Không thể tải'}</div>;
    }

    if (!requests || requests.length === 0) {
        return (
            <div className={styles.empty}>
                <LuListMusic size={32} opacity={0.5} />
                <p>Chưa có bài nào. Mở bát đi! 🎵</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* 1. Header (Đứng yên) */}
            <div className={styles.header}>
                <h3>
                    <LuListMusic color="#8638e9" />
                    Danh sách chờ
                </h3>
                <span className={styles.countBadge}>{requests.length}</span>
            </div>

            {/* 2. Danh sách bài hát (Cuộn ở đây) */}
            <div className={styles.listWrapper}>
                {(!requests || requests.length === 0) ? (
                    // Trường hợp danh sách trống
                    <div className={styles.empty}>
                        <LuListMusic size={32} opacity={0.5} />
                        <p>Chưa có bài nào. Mở bát đi! 🎵</p>
                    </div>
                ) : (
                    // Trường hợp có bài hát -> Map danh sách
                    requests.map(request => (
                        <div key={request._id} className={styles.card}>

                            {/* Thông tin bài hát */}
                            <div className={styles.info}>
                                <h4 className={styles.songTitle}>
                                    {request.title}
                                    <span className={styles.artistName}> - {request.artist}</span>
                                </h4>

                                {/* Metadata */}
                                <div className={styles.metaRow}>
                                    <div className={styles.metaItem}>
                                        <LuUser size={14} />
                                        <span className={styles.requesterName}>
                                            {getUserName(request)}
                                        </span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <LuClock size={14} />
                                        <span>{formatTimeAgo(request.createdAt)}</span>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className={styles.tags}>
                                    {request.tags?.map((tag, idx) => (
                                        <span key={idx} className={`${styles.tag} ${styles.genreTag}`}>
                                            <LuTag size={10} /> {tag}
                                        </span>
                                    ))}
                                    {request.mood?.map((mood, idx) => (
                                        <span key={idx} className={`${styles.tag} ${styles.moodTag}`}>
                                            <LuSmile size={10} /> {mood}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Nút bấm (Vote/Host) */}
                            <div className={styles.actions}>
                                <VoteButton
                                    roomId={roomId}
                                    requestId={request._id}
                                    votes={request.votes || []}
                                    currentUserId={currentUserId}
                                    onVoted={reloadRequests}
                                />

                                {isHost && (
                                    <HostActions
                                        roomId={roomId}
                                        requestId={request._id}
                                        status={request.status || 'pending'}
                                        onAction={reloadRequests}
                                    />
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RequestsList;