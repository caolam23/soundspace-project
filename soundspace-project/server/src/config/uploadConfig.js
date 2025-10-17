// server/src/config/uploadConfig.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// =======================
// ☁️ Cấu hình Cloudinary
// =======================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =======================
// 🔊 Storage cho file âm thanh
// =======================
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "soundspace-tracks", // Thư mục lưu file audio
    resource_type: "video", // Cloudinary coi file audio là video
    allowed_formats: ["mp3", "wav", "m4a", "ogg"],
    public_id: `track_${Date.now()}_${file.originalname.split(".")[0]}`,
  }),
});

// =======================
// 🖼️ Storage cho ảnh thumbnail
// =======================
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "soundspace-thumbnails",
    allowed_formats: ["jpg", "png", "jpeg", "gif"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
    public_id: `thumb_${Date.now()}_${file.originalname.split(".")[0]}`,
  }),
});

// =======================
// ⚙️ Middleware Multer upload đồng thời audio + thumbnail
// =======================
const uploadTrackAndThumbnail = multer({
  storage: multer.diskStorage({}), // tạm thời lưu trên ổ đĩa
  limits: { fileSize: 20 * 1024 * 1024 }, // giới hạn 20MB mỗi file
}).fields([
  { name: "audio", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// =======================
// ✅ Xuất module
// =======================
module.exports = {
  cloudinary,
  audioStorage,
  imageStorage,
  uploadTrackAndThumbnail,
};






















