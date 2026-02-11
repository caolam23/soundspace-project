import React, { useState } from 'react';
import { requestApi } from '../../services/requestApi';
import { toast } from 'react-toastify';
import styles from './HostActions.module.css';

// Tối ưu UI: Sử dụng SVG Icons thay cho Emoji để nét thanh mảnh, chuyên nghiệp hơn
const CheckIcon = () => (
    <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const XIcon = () => (
    <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const HostActions = ({ roomId, requestId, status, onAction }) => {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        if (!window.confirm('Bạn có chắc muốn thêm bài này vào playlist không?')) return;

        setLoading(true);
        try {
            await requestApi.approve(roomId, requestId);
            toast.success('Đã thêm vào playlist!');
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

    if (status !== 'pending' && status !== undefined) return null;

    return (
        <div className={styles.container}>
            <button
                className={`${styles.button} ${styles.approve}`}
                onClick={handleApprove}
                disabled={loading}
                title="Thêm vào playlist"
            >
                <CheckIcon />
                {loading ? 'Đang xử lý...' : 'Duyệt'}
            </button>
            <button
                className={`${styles.button} ${styles.reject}`}
                onClick={handleReject}
                disabled={loading}
                title="Từ chối yêu cầu"
            >
                <XIcon />
                Xóa
            </button>
        </div>
    );
};

export default HostActions;