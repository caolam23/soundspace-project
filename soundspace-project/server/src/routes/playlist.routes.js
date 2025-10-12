const express = require("express");
const router = express.Router({ mergeParams: true }); // ✅ Dùng mergeParams để lấy roomId từ URL nếu có

const playlistController = require("../controllers/playlist.controller");
const { auth } = require("../middleware/auth"); 
const { uploadTrackAndThumbnail } = require("../config/uploadConfig");

// ======================================================
// 🎵 THÊM BÀI HÁT TỪ LINK (YouTube, Spotify, SoundCloud)
// ======================================================
router.post(
  "/:roomId/playlist",
  auth, 
  playlistController.addTrack // ✅ Controller xử lý thêm bài hát từ link
);

// ======================================================
// 🎧 UPLOAD BÀI HÁT THỦ CÔNG (File audio + thumbnail)
// ======================================================
router.post(
  "/:roomId/playlist/upload",
  auth, 
  uploadTrackAndThumbnail, // ✅ Middleware upload Cloudinary (audio + ảnh)
  playlistController.addTrackByUpload // ✅ Controller xử lý upload
);

// ======================================================
// ❌ XOÁ MỘT BÀI HÁT KHỎI PLAYLIST
// ======================================================
router.delete(
  "/:roomId/playlist/:trackId",
  auth,
  playlistController.removeTrackFromPlaylist // ✅ Controller mới để xoá bài hát
);

// ======================================================
// 📦 EXPORT MODULE ROUTER
// ======================================================
module.exports = router;
