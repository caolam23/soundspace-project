const express = require("express");
const router = express.Router({ mergeParams: true }); // ✅ Dùng mergeParams để lấy roomId từ URL nếu có

const playlistController = require("../controllers/playlist.controller");
const { auth } = require("../middleware/auth"); // ✅ Giữ nguyên cách import như code 1
const { uploadTrackAndThumbnail } = require("../config/uploadConfig"); // ✅ Middleware upload Cloudinary (audio + thumbnail)

// ======================================================
// 🎵 Route: Thêm bài hát từ link (YouTube, Spotify, SoundCloud)
// ======================================================
router.post("/:roomId/playlist", auth, playlistController.addTrack); // ✅ Giữ nguyên logic code 1

// ======================================================
// 🎧 Route: Upload bài hát thủ công (file audio từ Cloudinary)
// ======================================================
router.post(
  "/:roomId/playlist/upload",
  auth, // ✅ xác thực người dùng
  uploadTrackAndThumbnail, // ✅ middleware xử lý upload file (audio + ảnh)
  playlistController.addTrackByUpload // ✅ controller mới cho upload
);

// ======================================================
// Xuất module router
// ======================================================
module.exports = router;
