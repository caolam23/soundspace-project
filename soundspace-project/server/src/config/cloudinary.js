// server/src/config/cloudinary.js

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cấu hình Cloudinary bằng các biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình storage engine cho Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'soundspace-covers', // Tên thư mục trên Cloudinary để lưu ảnh
    allowed_formats: ['jpg', 'png', 'gif'],
    // public_id: (req, file) => 'computed-filename-using-request' // Có thể tùy chỉnh tên file
  }
});

// Tạo middleware upload
const upload = multer({ storage: storage });

module.exports = upload;