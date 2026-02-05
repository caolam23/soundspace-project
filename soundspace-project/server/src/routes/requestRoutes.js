const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

// ==================================================================
// 🔐 IMPORT MIDDLEWARE AUTH (Đã sửa cho khớp với file auth.js của bạn)
// File auth.js export object { verifyToken, auth, isAdmin, ... }
// Nên ta phải dùng destructuring { auth } để lấy hàm ra.
// ==================================================================
const { auth } = require('../middleware/auth');

// ==================================================================
// 📁 IMPORT UPLOAD CONFIG
// ==================================================================
const { uploadTrackAndThumbnail } = require('../config/uploadConfig');

// ==================================================================
// 🔍 DEBUG LOGS (Giúp kiểm tra xem biến có bị undefined không)
// ==================================================================
console.log('--- [REQUEST ROUTES DEBUG] ---');
console.log('1. Auth Middleware:', typeof auth === 'function' ? '✅ OK (Function)' : '❌ LỖI (Undefined/Not a function)');
console.log('2. Upload Middleware:', typeof uploadTrackAndThumbnail === 'function' ? '✅ OK (Function)' : '⚠️ Cảnh báo (Có thể lỗi nếu uploadConfig sai)');
console.log('3. Controller (Youtube):', typeof requestController.addRequestFromYouTube === 'function' ? '✅ OK' : '❌ LỖI');
console.log('------------------------------');

// ==================================================================
// 🚦 DEFINING ROUTES
// ==================================================================

// 1. YouTube request
router.post(
    '/:roomId/requests/youtube',
    auth, // Middleware xác thực
    requestController.addRequestFromYouTube
);

// 2. Upload request
// Lưu ý: uploadTrackAndThumbnail phải là function middleware của Multer
router.post(
    '/:roomId/requests/upload',
    auth,
    uploadTrackAndThumbnail,
    requestController.addRequestFromUpload
);

// 3. Vote cho bài hát
router.post(
    '/:roomId/requests/:requestId/vote',
    auth,
    requestController.voteRequest
);

// 4. Host duyệt bài hát
router.post(
    '/:roomId/requests/:requestId/approve',
    auth,
    requestController.approveRequest
);

// 5. Host từ chối bài hát
router.post(
    '/:roomId/requests/:requestId/reject',
    auth,
    requestController.rejectRequest
);

// 6. Lấy danh sách yêu cầu
router.get(
    '/:roomId/requests',
    auth,
    requestController.getRequests
);

module.exports = router;