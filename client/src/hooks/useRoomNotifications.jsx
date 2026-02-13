import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import RoomToast from '../components/common/RoomToast';
import { toastConfig } from '../services/toastConfig'; // Reuse existing config

const useRoomNotifications = (socket) => {
    useEffect(() => {
        if (!socket) return;

        // 1. Manual Approve (Host duyệt)
        const handleRequestApproved = ({ track }) => {
            // track object might be nested or direct depending on payload
            // Payload: { requestId, track: newTrack }
            const title = track?.title || 'Bài hát mới';

            toast(<RoomToast
                type="manual"
                title="Đã duyệt"
                message={`"${title}" đã được thêm vào playlist!`}
            />, { ...toastConfig, icon: false }); // Disable default icon, use custom
        };

        // 2. Auto Approve (Đủ vote)
        const handleAutoApproved = ({ songTitle, votes }) => {
            toast(<RoomToast
                type="auto"
                title="Tự động duyệt"
                message={`"${songTitle}" đã đạt ${votes} votes!`}
            />, { ...toastConfig, icon: false });
        };

        // 3. Batch Auto Approve (Khi chuyển sang Auto)
        const handleBatchAutoApproved = ({ totalApproved }) => {
            toast(<RoomToast
                type="batch"
                title="Duyệt hàng loạt"
                message={`Đã tự động duyệt ${totalApproved} bài hát đủ điều kiện!`}
            />, { ...toastConfig, icon: false });
        };

        // 4. Settings Changed
        const handleSettingsChanged = ({ approvalMode }) => {
            const modeText = approvalMode === 'auto' ? 'Tự động duyệt' : 'Duyệt thủ công';
            toast(<RoomToast
                type="settings"
                title="Cài đặt phòng"
                message={`Chế độ phê duyệt đã chuyển sang: ${modeText}`}
            />, { ...toastConfig, icon: false });
        };

        socket.on('request-approved', handleRequestApproved);
        socket.on('request-auto-approved', handleAutoApproved);
        socket.on('request-batch-auto-approved', handleBatchAutoApproved);
        socket.on('request-settings-changed', handleSettingsChanged);

        return () => {
            socket.off('request-approved', handleRequestApproved);
            socket.off('request-auto-approved', handleAutoApproved);
            socket.off('request-batch-auto-approved', handleBatchAutoApproved);
            socket.off('request-settings-changed', handleSettingsChanged);
        };
    }, [socket]);
};

export default useRoomNotifications;
