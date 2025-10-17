// server/src/routes/stats.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getMusicSources,
  getTopContributorsController,
  getSongsAdded,
  getUserGrowthController,
  getStatsOverview,
  getTotalVisitsController
} = require('../controllers/statsController');

// Middleware: Chỉ admin mới có thể truy cập stats
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    message: 'Chỉ admin mới có thể truy cập thống kê'
  });
};

// Apply authentication to all routes
router.use(auth);

// Apply admin check to all routes  
router.use((req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    message: 'Chỉ admin mới có thể truy cập thống kê'
  });
});

/**
 * @route GET /api/admin/stats/music-sources
 * @desc Lấy thống kê tỷ lệ nguồn nhạc (Upload vs YouTube vs Spotify vs SoundCloud)
 * @access Private (Admin only)
 */
router.get('/music-sources', getMusicSources);

/**
 * @route GET /api/admin/stats/top-contributors
 * @desc Lấy top 5 người dùng đóng góp nhiều bài hát nhất
 * @access Private (Admin only)
 */
router.get('/top-contributors', getTopContributorsController);

/**
 * @route GET /api/admin/stats/songs-added
 * @desc Lấy thống kê bài hát được thêm theo ngày (7 ngày gần nhất)
 * @access Private (Admin only)
 */
router.get('/songs-added', getSongsAdded);

/**
 * @route GET /api/admin/stats/user-growth
 * @desc Lấy thống kê tăng trưởng người dùng theo tháng (12 tháng gần nhất)
 * @access Private (Admin only)
 */
router.get('/user-growth', getUserGrowthController);

/**
 * @route GET /api/admin/stats/overview
 * @desc Lấy tất cả thống kê cùng lúc cho dashboard overview
 * @access Private (Admin only)
 */
router.get('/overview', getStatsOverview);

/**
 * @route GET /api/admin/stats/total-visits?range=all|1d|7d|1m
 * @desc Lấy tổng số lượt truy cập theo range
 * @access Private (Admin only)
 */
router.get('/total-visits', getTotalVisitsController);

module.exports = router;