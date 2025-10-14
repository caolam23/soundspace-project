// server/src/routes/quanLyPhong.routes.js
const express = require('express');
const router = express.Router();
const QuanLyPhongController = require('../controllers/QuanLyPhongController');
const { auth, isAdmin } = require('../middleware/auth');

// =============================================
// ROUTES QUẢN LÝ PHÒNG (CHỈ ADMIN)
// =============================================

// Lấy tất cả phòng (có phân trang, filter, search)
router.get('/rooms', auth, isAdmin, QuanLyPhongController.getAllRooms);

// Lấy thống kê tổng quan
router.get('/rooms/statistics', auth, isAdmin, QuanLyPhongController.getRoomStatistics);

// Lấy chi tiết một phòng
router.get('/rooms/:roomId', auth, isAdmin, QuanLyPhongController.getRoomById);

// Xóa phòng
router.delete('/rooms/:roomId', auth, isAdmin, QuanLyPhongController.deleteRoom);

// Cấm/Bỏ cấm phòng
router.patch('/rooms/:roomId/ban', auth, isAdmin, QuanLyPhongController.toggleBanRoom);

module.exports = router;
