// server/src/config/uploadConfig.js

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình storage cho file âm thanh
const audioStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'soundspace-tracks', // Thư mục lưu file audio
    resource_type: 'video', // Cloudinary coi file âm thanh là 'video'
    allowed_formats: ['mp3', 'wav', 'm4a', 'ogg'],
  },
});

// Cấu hình storage cho ảnh thumbnail
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'soundspace-thumbnails', // Thư mục lưu ảnh thumbnail
    allowed_formats: ['jpg', 'png', 'gif', 'jpeg'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }] // Tùy chọn resize ảnh
  },
});

// Middleware Multer để xử lý upload đồng thời
// 'audio' và 'thumbnail' là tên các field trong FormData từ client
const uploadTrackAndThumbnail = multer({
  storage: multer.diskStorage({}), // Tạm thời lưu vào đĩa để xử lý
  limits: { fileSize: 10 * 1024 * 1024 } // Giới hạn 10MB mỗi file
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

module.exports = {
    cloudinary,
    uploadTrackAndThumbnail
};