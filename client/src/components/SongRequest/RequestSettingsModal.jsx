import React, { useState, useEffect } from 'react';
import { LuSettings2, LuX, LuUsers, LuInfo } from 'react-icons/lu';
import { requestApi } from '../../services/requestApi';
import { toast } from 'react-toastify';
import styles from './RequestSettingsModal.module.css';

const RequestSettingsModal = ({ isOpen, onClose, roomId, currentSettings, memberCount }) => {
    const [approvalMode, setApprovalMode] = useState('manual');
    const [threshold, setThreshold] = useState(30);
    const [saving, setSaving] = useState(false);

    // Sync state khi mở modal hoặc settings thay đổi
    useEffect(() => {
        if (currentSettings) {
            setApprovalMode(currentSettings.approvalMode || 'manual');
            setThreshold(currentSettings.autoApproveThreshold || 30);
        }
    }, [currentSettings, isOpen]);

    // Tính số vote cần thiết
    const requiredVotes = Math.ceil((memberCount || 1) * threshold / 100);

    // Xử lý lưu
    const handleSave = async () => {
        try {
            setSaving(true);
            await requestApi.updateSettings(roomId, {
                approvalMode,
                autoApproveThreshold: threshold
            });
            toast.success(
                approvalMode === 'auto'
                    ? `Đã bật chế độ Tự động (${threshold}% votes)`
                    : 'Đã chuyển sang chế độ Duyệt thủ công'
            );
            onClose();
        } catch (error) {
            const msg = error.response?.data?.msg || 'Không thể cập nhật cài đặt';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    // Kiểm tra có thay đổi không
    const hasChanges =
        approvalMode !== (currentSettings?.approvalMode || 'manual') ||
        threshold !== (currentSettings?.autoApproveThreshold || 30);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={`${styles.modal} ${saving ? styles.saving : ''}`} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        <LuSettings2 size={20} />
                        Cài đặt duyệt bài
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
                        <LuX size={18} />
                    </button>
                </div>

                {/* Toggle chế độ */}
                <div className={styles.section}>
                    <div className={styles.sectionLabel}>Chế độ phê duyệt</div>

                    <div className={styles.toggleRow}>
                        <div className={styles.toggleInfo}>
                            <span className={styles.toggleLabel}>Tự động duyệt</span>
                            <span className={styles.toggleDesc}>
                                Bài hát sẽ tự động vào playlist khi đủ vote
                            </span>
                        </div>
                        <label className={styles.toggle}>
                            <input
                                type="checkbox"
                                checked={approvalMode === 'auto'}
                                onChange={(e) => setApprovalMode(e.target.checked ? 'auto' : 'manual')}
                            />
                            <span className={styles.toggleTrack}></span>
                        </label>
                    </div>

                    {/* Badge chế độ hiện tại */}
                    <div className={`${styles.modeBadge} ${styles[approvalMode]}`}>
                        {approvalMode === 'auto' ? '🤖 Tự động duyệt' : '✋ Duyệt thủ công'}
                    </div>
                </div>

                {/* Thanh trượt ngưỡng (chỉ hiện khi Auto) */}
                {approvalMode === 'auto' && (
                    <div className={styles.section}>
                        <div className={styles.sectionLabel}>Ngưỡng vote</div>

                        <div className={styles.thresholdSection}>
                            <div className={styles.thresholdHeader}>
                                <span className={styles.thresholdLabel}>Phần trăm thành viên</span>
                                <span className={styles.thresholdValue}>{threshold}%</span>
                            </div>

                            <div className={styles.sliderContainer}>
                                <input
                                    type="range"
                                    className={styles.slider}
                                    min="10"
                                    max="80"
                                    step="5"
                                    value={threshold}
                                    onChange={(e) => setThreshold(parseInt(e.target.value))}
                                />
                                <div className={styles.sliderLabels}>
                                    <span>10%</span>
                                    <span>80%</span>
                                </div>
                            </div>

                            {/* Số vote cần thiết */}
                            <div className={styles.votesInfo}>
                                <LuUsers size={16} />
                                <span>
                                    Cần <span className={styles.votesHighlight}>{requiredVotes} vote</span> từ {memberCount || 0} thành viên
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.btnCancel} onClick={onClose}>
                        Hủy
                    </button>
                    <button
                        className={styles.btnSave}
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                    >
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RequestSettingsModal;
