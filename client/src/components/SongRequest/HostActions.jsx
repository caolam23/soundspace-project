import React, { useState } from 'react';
import { requestApi } from '../../services/requestApi';
import { toast } from 'react-toastify';
import styles from './HostActions.module.css';

const HostActions = ({ roomId, requestId, status, onAction }) => {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        // In a real app, maybe use a nicer modal than window.confirm
        if (!window.confirm('Bạn có chắc muốn thêm bài này vào playlist không?')) return;

        setLoading(true);
        try {
            await requestApi.approve(roomId, requestId);
            toast.success('✅ Đã thêm vào playlist!');
            if (onAction) onAction();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Lỗi khi duyệt bài');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!window.confirm('Bạn có chắc muốn từ chối bài này không?')) return;

        setLoading(true);
        try {
            await requestApi.reject(roomId, requestId);
            toast.success('Đã từ chối yêu cầu');
            if (onAction) onAction();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Lỗi khi từ chối');
        } finally {
            setLoading(false);
        }
    };

    // Only show actions for pending requests
    if (status !== 'pending' && status !== undefined) return null;

    return (
        <div className={styles.container}>
            <button
                className={`${styles.button} ${styles.approve}`}
                onClick={handleApprove}
                disabled={loading}
                title="Thêm vào playlist"
            >
                <span className={styles.icon}>✅</span>
                Duyệt
            </button>
            <button
                className={`${styles.button} ${styles.reject}`}
                onClick={handleReject}
                disabled={loading}
                title="Từ chối yêu cầu"
            >
                <span className={styles.icon}>❌</span>
                Xóa
            </button>
        </div>
    );
};

export default HostActions;
