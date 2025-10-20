const User = require('../models/User');
const CommentReport = require('../models/Report'); // 🧩 Báo cáo bình luận (giữ nguyên)
const RoomReport = require('../models/RoomReport');   // 🏠 Báo cáo phòng (giữ nguyên)
const Room = require('../models/room');

/**
 * ==========================================================
 * Lấy thông tin cơ bản cho trang Dashboard của Admin
 * GET /api/admin/dashboard
 * ==========================================================
 */
exports.getDashboard = (req, res) => {
    res.json({
        msg: `Chào mừng Admin ${req.user.username || req.user.email}`,
        userId: req.user._id,
        role: req.user.role
    });
};

// ==========================
// Reports management for Admin
// ==========================
exports.listReports = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1'));
        const limit = Math.min(50, parseInt(req.query.limit || '20'));
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.category) filter.category = req.query.category;

        // ✨ SỬA 1: Đổi `Report` thành `RoomReport`
        // Logic của bạn populate 'room' nên hàm này dùng để lấy báo cáo phòng.
        const [items, total] = await Promise.all([
            RoomReport.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('room', 'name owner')
                .populate('reporter', 'username'),
            RoomReport.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: items,
            pagination: { page, limit, totalPages: Math.ceil(total / limit), total }
        });
    } catch (err) {
        console.error('❌ listReports error:', err);
        res.status(500).json({ success: false, msg: 'Lỗi server', error: err.message });
    }
};

// ==========================
// Bỏ qua báo cáo
// ==========================
exports.ignoreReport = async (req, res) => {
    try {
        // ✨ SỬA 2: Đổi `Report` thành `RoomReport`
        // Hàm này nằm trong chuỗi logic xử lý báo cáo phòng.
        const report = await RoomReport.findById(req.params.id);
        if (!report)
            return res.status(404).json({ success: false, msg: 'Không tìm thấy báo cáo.' });

        report.status = 'dismissed';
        await report.save();

        return res.json({ success: true, msg: 'Báo cáo đã được bỏ qua.' });
    } catch (err) {
        console.error('❌ ignoreReport error:', err);
        res.status(500).json({ success: false, msg: 'Lỗi server', error: err.message });
    }
};

// ==========================
// Cảnh báo chủ phòng
// ==========================
exports.warnOwner = async (req, res) => {
    try {
        // ✨ SỬA 3: Đổi `Report` thành `RoomReport`
        // Chức năng "Cảnh báo chủ phòng" phải dựa trên báo cáo về phòng.
        const report = await RoomReport.findById(req.params.id).populate('room', 'owner');
        if (!report)
            return res.status(404).json({ success: false, msg: 'Không tìm thấy báo cáo.' });

        const ownerId = report.room?.owner;
        if (!ownerId)
            return res.status(400).json({ success: false, msg: 'Không có chủ phòng.' });

        // Tăng số lần bị báo cáo và gắn trạng thái
        const updatedUser = await User.findByIdAndUpdate(
            ownerId,
            { $inc: { reportCount: 1 } },
            { new: true }
        );

        // Đánh dấu đã xử lý báo cáo
        report.status = 'reviewed';
        await report.save();

        // Gửi cảnh báo qua socket nếu chủ phòng đang online (giữ nguyên logic)
        try {
            const userSockets = req.app.get('userSockets');
            if (userSockets && userSockets.has(String(ownerId))) {
                const sockets = userSockets.get(String(ownerId));
                const io = req.app.get('io');
                sockets.forEach((sockId) => {
                    try {
                        io.to(sockId).emit('user-warned', {
                            msg: 'Tài khoản của bạn đã bị cảnh báo. Vui lòng không tái phạm quá nhiều lần.',
                            reportId: report._id
                        });
                    } catch (e) { }
                });
            }
        } catch (e) {
            console.warn('[warnOwner] Could not emit socket to owner:', e.message);
        }

        return res.json({ success: true, msg: 'Đã cảnh báo chủ phòng.', user: updatedUser });
    } catch (err) {
        console.error('❌ warnOwner error:', err);
        res.status(500).json({ success: false, msg: 'Lỗi server', error: err.message });
    }
};

// ==========================
// Cấm phòng (ban room)
// ==========================
exports.banRoom = async (req, res) => {
    try {
        // ✨ SỬA 4: Đổi `Report` thành `RoomReport`
        // Chức năng "Cấm phòng" phải dựa trên báo cáo về phòng.
        const report = await RoomReport.findById(req.params.id).populate('room');
        if (!report)
            return res.status(404).json({ success: false, msg: 'Không tìm thấy báo cáo.' });

        const room = await Room.findById(report.room._id);
        if (!room)
            return res.status(404).json({ success: false, msg: 'Không tìm thấy phòng.' });

        room.isBanned = true;
        room.banReason = req.body.reason || 'Bị cấm bởi admin vì báo cáo';

        // Nếu phòng đang live → kết thúc và ngắt kết nối người xem (giữ nguyên logic)
        const io = req.app.get('io');
        if (room.status === 'live') {
            room.status = 'ended';
            room.endedAt = new Date();

            try {
                const roomSockets = await io.in(String(room._id)).fetchSockets();
                roomSockets.forEach((s) => {
                    try {
                        s.emit('room-ended', {
                            message: 'Phòng đã bị cấm bởi quản trị viên.',
                            reason: 'admin-banned'
                        });
                        s.leave(String(room._id));
                        s.disconnect(true);
                    } catch (e) { }
                });
            } catch (e) {
                console.warn('[banRoom] Error notifying/disconnecting room sockets:', e.message);
            }
        }

        await room.save();

        report.status = 'reviewed';
        await report.save();

        // Nếu admin yêu cầu xóa report ngay
        if (req.body && req.body.removeReports === true) {
            try {
                // ✨ SỬA 5: Đổi `Report` thành `RoomReport` để xóa đúng loại báo cáo.
                await RoomReport.deleteMany({ room: room._id });
                console.log(`[ADMIN] Deleted reports for room ${room._id} by admin action`);
            } catch (e) {
                console.warn(`[ADMIN] Failed to delete reports for room ${room._id}:`, e.message);
            }
        }

        // Lên lịch dọn dẹp tài nguyên phòng (giữ nguyên)
        // try {
        //     scheduleRoomCleanup(String(room._id));
        // } catch (e) {
        //     console.warn('[banRoom] scheduleRoomCleanup failed:', e.message);
        // }

        // Phát sự kiện global thông báo phòng bị cấm (giữ nguyên)
        try {
            if (io) io.emit('room-banned', { roomId: room._id.toString(), reason: room.banReason });
        } catch (e) { }

        return res.json({ success: true, msg: 'Phòng đã bị cấm.' });
    } catch (err) {
        console.error('❌ banRoom error:', err);
        res.status(500).json({ success: false, msg: 'Lỗi server', error: err.message });
    }
};

// ==========================
// Lấy danh sách người bị giới hạn chat
// ==========================
exports.getMutedUsers = async (req, res) => {
    try {
        const mutedUsers = await User.find({
            muteExpiresAt: { $gt: new Date() },
        })
            .select('username muteExpiresAt avatar')
            .lean();

        const detailedMutedUsers = await Promise.all(
            mutedUsers.map(async (user) => {
                // ✨ SỬA 6: Đổi `Report` thành `CommentReport`
                // Việc mute user là do báo cáo bình luận (message), nên cần tìm trong model này.
                const lastMuteReport = await CommentReport.findOne({
                    reportedUser: user._id,
                    status: 'resolved_muted',
                })
                    .sort({ createdAt: -1 })
                    .select('reason')
                    .lean();

                return {
                    ...user,
                    reason: lastMuteReport ? lastMuteReport.reason : 'Không có lý do cụ thể',
                };
            })
        );

        res.status(200).json(detailedMutedUsers);
    } catch (error) {
        console.error('❌ Lỗi khi lấy danh sách người dùng bị giới hạn:', error);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};