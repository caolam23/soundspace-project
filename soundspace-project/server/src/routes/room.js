const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController.js');
const upload = require('../config/cloudinary.js');

// ✅ Import đúng & gọn
const { verifyToken, auth, isAdmin } = require('../middleware/auth.js');

// ==============================
// TẠO PHÒNG MỚI
// ==============================
router.post(
    '/create',
    verifyToken,
    upload.single('coverImage'),
    roomController.createRoom
);

// ==============================
// LẤY CÁC PHÒNG ĐANG HOẠT ĐỘNG
// ==============================
router.get('/active', roomController.getActiveRooms);

// ==============================
// BẮT ĐẦU PHIÊN LIVE
// ==============================
router.post('/:roomId/start', verifyToken, roomController.startSession);

// ==============================
// KẾT THÚC PHIÊN LIVE (PUT cho host)
// ==============================
router.put('/:roomId/end', verifyToken, roomController.endSession);

// ==============================
// LẤY CHI TIẾT PHÒNG
// ==============================
router.get('/:roomId', verifyToken, roomController.getRoomDetails);

// ==============================
// THAM GIA PHÒNG
// ==============================
router.post('/:roomId/join', verifyToken, roomController.joinRoom);

// ==============================
// GỬI YÊU CẦU THAM GIA
// ==============================
router.post('/:roomId/request-join', verifyToken, roomController.requestJoinRoom);

// ==============================
// TÌM PHÒNG THEO MÃ
// ==============================
router.get('/search-by-code/:roomCode', verifyToken, roomController.searchRoomByCode);

// 👻 Route mới cho admin ghost join
router.post('/:roomId/ghost-join', auth, isAdmin, roomController.joinRoomAsGhost);

module.exports = router;
