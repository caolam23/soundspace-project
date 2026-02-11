import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { voteRequest } from '../../store/requestSlice';
import { toast } from 'react-toastify';
import styles from './VoteButton.module.css';

const VoteButton = ({ roomId, requestId, votes, currentUserId, onVoted }) => {
    const dispatch = useDispatch();
    const { voteLoading } = useSelector(state => state.requests);

    const isArrayVotes = Array.isArray(votes); // Kiểm tra xem có phải là mảng không
    const hasVoted = isArrayVotes ? votes.includes(currentUserId) : false; // Nếu là số thì tạm tính là chưa vote (để không crash)
    const voteCount = isArrayVotes ? votes.length : (typeof votes === 'number' ? votes : 0); // Lấy số lượng vote
    const isLoading = voteLoading === requestId;

    // Use local state for optimistic update if needed, but here we rely on props or parent refresh
    // Actually, let's just trigger the action and let Redux handle it.

    const handleVote = async (e) => {
        e.stopPropagation(); // Prevent card click

        if (isLoading) return;

        try {
            const resultAction = await dispatch(voteRequest({ roomId, requestId })).unwrap();
            // resultAction.data contains the response from backend
            // { msg: 'Đã bỏ vote' | 'Đã vote', votes: number }

            if (onVoted) onVoted();
            toast.success(resultAction.data.msg);
        } catch (err) {
            toast.error('Không thể thực hiện thao tác');
        }
    };

    return (
        <button
            className={`${styles.button} ${hasVoted ? styles.voted : ''}`}
            onClick={handleVote}
            disabled={isLoading}
            title={hasVoted ? 'Bỏ vote' : 'Vote cho bài này'}
        >
            <span className={styles.icon}>{hasVoted ? '✅' : '⬆️'}</span>
            <span className={styles.text}>{hasVoted ? 'Đã vote' : 'Vote'}</span>
            <span className={styles.count}>({voteCount})</span>
        </button>
    );
};

export default VoteButton;
