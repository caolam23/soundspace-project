const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên phòng là bắt buộc'],
    trim: true,
    maxlength: [100, 'Tên phòng không được quá 100 ký tự']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Mô tả không được quá 500 ký tự'],
    default: ''
  },
  coverImage: {
    type: String, // URL ảnh bìa từ Cloudinary
    required: [true, 'Ảnh bìa là bắt buộc']
  },
  privacy: {
    type: String,
    enum: ['public', 'manual', 'private'],
    default: 'public'
  },
  roomCode: {
    type: String, // Mã phòng cho private room
    unique: true,
    sparse: true,
    default: null
  },

  // =======================================================
  // Quản lý trạng thái phòng
  status: {
    type: String,
    enum: ['waiting', 'live', 'ended'],
    default: 'waiting'
  },

  // =======================================================
  // Chủ phòng & thành viên
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },

  // =======================================================
  // Thống kê
  statistics: {
    totalJoins: { type: Number, default: 0 },
    peakMembers: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 }
  },

  // =======================================================
  // Lịch sử & nhật ký hoạt động
  joinHistory: {
    type: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        action: { type: String, enum: ['join', 'leave'] },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    default: []
  },

  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },

  rejectedUsers: {
    type: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rejectedAt: { type: Date, default: Date.now }
      }
    ],
    default: []
  },

  metadata: {
    avgSessionTime: { type: Number, default: 0 }
  },

  // =======================================================
  // Quản lý Admin
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, trim: true, default: '' }

}, { timestamps: true });


// =======================================================
// Index hỗ trợ admin lọc nhanh
roomSchema.index({ status: 1 });
roomSchema.index({ privacy: 1 });
roomSchema.index({ owner: 1 });
roomSchema.index({ isBanned: 1 });
roomSchema.index({ createdAt: -1 });


// =======================================================
// Luôn hiển thị đầy đủ các trường trong JSON (cách 1)
roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

roomSchema.options.minimize = false; // Không ẩn object rỗng

module.exports = mongoose.model('Room', roomSchema);
