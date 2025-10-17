const User = require('../models/User');
const Report = require('../models/Report');

/**
 * ==========================================================
 * Lấy thông tin cơ bản cho trang Dashboard của Admin
 * GET /api/admin/dashboard
 * ==========================================================
 */
exports.getDashboard = (req, res) => {
  // req.user được auth middleware gắn vào từ token
  res.json({
    msg: `Chào mừng Admin ${req.user.username || req.user.email}`,
    userId: req.user._id,
    role: req.user.role
  });
};

/**
 * ==========================================================
 * Lấy danh sách những người dùng đang bị giới hạn chat
 * GET /api/admin/muted-users
 * ==========================================================
 */
exports.getMutedUsers = async (req, res) => {
  try {
    // 1. Tìm tất cả người dùng có thời gian mute trong tương lai
    const mutedUsers = await User.find({
      muteExpiresAt: { $gt: new Date() },
    }).select('username muteExpiresAt avatar').lean(); // .lean() để tăng tốc độ truy vấn

    // 2. Với mỗi người dùng, tìm báo cáo gần nhất dẫn đến việc bị mute để lấy lý do
    const detailedMutedUsers = await Promise.all(
      mutedUsers.map(async (user) => {
        const lastMuteReport = await Report.findOne({
          reportedUser: user._id,
          status: 'resolved_muted',
        }).sort({ createdAt: -1 }) // Sắp xếp để lấy report mới nhất
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
    console.error("❌ Lỗi khi lấy danh sách người dùng bị giới hạn:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};