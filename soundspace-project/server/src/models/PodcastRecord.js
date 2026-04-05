const mongoose = require('mongoose');

const PodcastRecordSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  title: { type: String, trim: true, maxlength: 200, default: 'Untitled Podcast' },
  duration: { type: Number, default: 0 }, // Thời lượng tính bằng giây (seconds)
  format: { type: String, trim: true },
  
  // Lưu trữ Cloudinary
  cloudinary_url: { type: String, required: true },
  cloudinary_public_id: { type: String },
  fileSize: { type: Number }, // Tính bằng Bytes
  
  // Trạng thái và Thống kê (Nâng cấp mở rộng)
  status: { type: String, enum: ['public', 'private', 'archived'], default: 'public' },
  listens: { type: Number, default: 0 }, // Lượt nghe lại
  
  meta: { type: Object, default: {} }
}, {
  timestamps: true // Tự động sinh ra createdAt và updatedAt
});

// Tối ưu tốc độ query khi tìm file ghi âm theo Phòng hoặc theo User host hoặc khi sort theo thời gian mới nhất
PodcastRecordSchema.index({ room: 1 });
PodcastRecordSchema.index({ host: 1 });
PodcastRecordSchema.index({ createdAt: -1 }); // Index thêm thời gian để sort mới nhất cho lẹ

module.exports = mongoose.model('PodcastRecord', PodcastRecordSchema);