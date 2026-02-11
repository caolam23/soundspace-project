import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { voteRequest } from '../../store/requestSlice';
import { toast } from 'react-toastify';
import { ArrowUp, Check } from 'lucide-react'; // Dùng icon SVG chuyên nghiệp
import styles from './VoteButton.module.css';

const VoteButton = ({ roomId, requestId, votes, currentUserId, onVoted }) => {
    const dispatch = useDispatch();
    const { voteLoading } = useSelector(state => state.requests);

    const isArrayVotes = Array.isArray(votes);
    const hasVoted = isArrayVotes ? votes.includes(currentUserId) : false;
    const voteCount = isArrayVotes ? votes.length : (typeof votes === 'number' ? votes : 0);
    const isLoading = voteLoading === requestId;

    const handleVote = async (e) => {
        e.stopPropagation();

        if (isLoading) return;

        try {
            const resultAction = await dispatch(voteRequest({ roomId, requestId })).unwrap();
            if (onVoted) onVoted();
            toast.success(resultAction.data.msg);
        } catch (err) {
            toast.error('Không thể thực hiện thao tác');
        }
    };

    return (
        <button
            className={`${styles.button} ${hasVoted ? styles.voted : ''} ${isLoading ? styles.loading : ''}`}
            onClick={handleVote}
            disabled={isLoading}
            title={hasVoted ? 'Bỏ vote' : 'Vote cho bài này'}
        >
            <span className={styles.iconWrapper}>
                {hasVoted ? <Check size={16} strokeWidth={2.5} /> : <ArrowUp size={16} strokeWidth={2.5} />}
            </span>
            <span className={styles.text}>{hasVoted ? 'Đã vote' : 'Vote'}</span>
            <span className={styles.count}>{voteCount}</span>
        </button>
    );
};

export default VoteButton;