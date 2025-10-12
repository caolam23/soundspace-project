// server/src/routes/room.js 
const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController.js');
const { verifyToken } = require('../middleware/auth.js'); // Middleware xác thực
const upload = require('../config/cloudinary.js');        // Middleware upload file Cloudinary

// ==============================
// TẠO PHÒNG MỚI
// ==============================
// POST /api/rooms/create
router.post(
    '/create',
    verifyToken,                   // 1. Xác thực user
    upload.single('coverImage'),   // 2. Upload 1 file (field name = coverImage)
    roomController.createRoom      // 3. Controller
);

// ==============================
// LẤY CÁC PHÒNG ĐANG HOẠT ĐỘNG
// ==============================
// GET /api/rooms/active
router.get('/active', roomController.getActiveRooms);

// ==============================
// BẮT ĐẦU PHIÊN LIVE
// ==============================
// POST /api/rooms/:roomId/start
router.post('/:roomId/start', verifyToken, roomController.startSession);

// ==============================
// KẾT THÚC PHIÊN LIVE (PUT cho host)
// ==============================
// PUT /api/rooms/:roomId/end
router.put('/:roomId/end', verifyToken, roomController.endSession);

// ==============================
// LẤY CHI TIẾT PHÒNG
// ==============================
// GET /api/rooms/:roomId
router.get('/:roomId', verifyToken, roomController.getRoomDetails);

// ==============================
// THAM GIA PHÒNG (public, private)
// ==============================
// POST /api/rooms/:roomId/join
router.post('/:roomId/join', verifyToken, roomController.joinRoom);

// ==============================
// GỬI YÊU CẦU THAM GIA (manual)
// ==============================
// POST /api/rooms/:roomId/request-join
router.post('/:roomId/request-join', verifyToken, roomController.requestJoinRoom);
// ==============================
// TÌM PHÒNG THEO MÃ
// ==============================
// GET /api/rooms/search-by-code/:roomCode
router.get('/search-by-code/:roomCode', verifyToken, roomController.searchRoomByCode);
module.exports = router;