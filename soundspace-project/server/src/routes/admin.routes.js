const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const Report = require('../models/Report');
const RoomReport = require('../models/RoomReport');
const adminController = require('../controllers/adminController');

/**
 * =====================================================
 * 🧭 DASHBOARD
 * GET /api/admin/dashboard
 * =====================================================
 */
router.get('/dashboard', auth, isAdmin, adminController.getDashboard);

/**
 * =====================================================
 * 💬 LẤY DANH SÁCH BÁO CÁO COMMENT (dùng cho QuanLyBinhLuan.jsx)
 * GET /api/admin/reports?status=pending
 * =====================================================
 */
router.get('/reports', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .populate('reporter', 'username')
      .populate('reportedUser', 'username');

    res.json(reports);
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách comment report:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách báo cáo comment' });
  }
});

/**
 * =====================================================
 * 🏠 LẤY DANH SÁCH BÁO CÁO PHÒNG (dùng cho Reports.jsx)
 * GET /api/admin/room-reports
 * =====================================================
 */
router.get('/room-reports', auth, isAdmin, adminController.listReports);

/**
 * =====================================================
 * ✏️ CẬP NHẬT TRẠNG THÁI REPORT
 * PATCH /api/admin/reports/:reportId
 * =====================================================
 */
router.patch('/reports/:reportId', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      { status },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ message: 'Không tìm thấy báo cáo' });
    }

    res.json(report);
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật report:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật báo cáo' });
  }
});

/**
 * =====================================================
 * 🔇 LẤY DANH SÁCH USER ĐANG BỊ GIỚI HẠN CHAT
 * GET /api/admin/muted-users
 * =====================================================
 */
router.get('/muted-users', auth, isAdmin, adminController.getMutedUsers);

/**
 * =====================================================
 * 🧱 QUẢN LÝ BÁO CÁO PHÒNG
 * =====================================================
 */

// Bỏ qua báo cáo phòng
router.post('/room-reports/:id/ignore', auth, isAdmin, adminController.ignoreReport);

// Cảnh báo chủ phòng
router.post('/room-reports/:id/warn', auth, isAdmin, adminController.warnOwner);

// Cấm phòng
router.post('/room-reports/:id/ban-room', auth, isAdmin, adminController.banRoom);

module.exports = router;