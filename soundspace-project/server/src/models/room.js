const mongoose = require("mongoose");

/**
 * =============================================
 * TrackSchema - Mô tả chi tiết một bài hát trong phòng
 * =============================================
 */
const TrackSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tên bài hát là bắt buộc"],
      trim: true,
      maxlength: [200, "Tên bài hát không được vượt quá 200 ký tự"],
    },
    artist: {
      type: String,
      trim: true,
      maxlength: [100, "Tên nghệ sĩ không được vượt quá 100 ký tự"],
    },
    thumbnail: {
      type: String, // URL ảnh bìa bài hát
      trim: true,
    },
    duration: {
      type: Number, // thời lượng (tính bằng giây)
    },
    source: {
      type: String,
      enum: ["youtube", "spotify", "soundcloud", "upload"], // ✅ Thêm 'upload'
      required: [true, "Nguồn bài hát là bắt buộc"],
    },
    url: {
      type: String, // ✅ Nếu là 'upload' thì đây là URL Cloudinary audio
      required: [true, "URL bài hát là bắt buộc"],
    },
    sourceId: {
      type: String, // ✅ Nếu là 'upload', đây có thể là public_id Cloudinary
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

/**
 * =============================================
 * RoomSchema - Mô tả cấu trúc dữ liệu của phòng
 * =============================================
 */
const roomSchema = new mongoose.Schema(
  {
    // =============================================
    // Thông tin cơ bản
    // =============================================
    name: {
      type: String,
      required: [true, "Tên phòng là bắt buộc"],
      trim: true,
      maxlength: [100, "Tên phòng không được quá 100 ký tự"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Mô tả không được quá 500 ký tự"],
      default: "",
    },
    coverImage: {
      type: String, // URL ảnh bìa từ Cloudinary
      required: [true, "Ảnh bìa là bắt buộc"],
    },

    // =============================================
    // Quyền riêng tư của phòng
    // =============================================
    privacy: {
      type: String,
      enum: ["public", "manual", "private"],
      default: "public",
    },
    roomCode: {
      type: String, // Mã phòng cho private room
      unique: true,
      sparse: true,
    },

    // =============================================
    // Quản lý trạng thái phòng
    // =============================================
    status: {
      type: String,
      enum: ["waiting", "live", "ended"],
      default: "waiting",
    },

    // =============================================
    // Chủ phòng & thành viên
    // =============================================
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    // =============================================
    // Thống kê
    // =============================================
    statistics: {
      totalJoins: { type: Number, default: 0 },
      peakMembers: { type: Number, default: 0 },
      totalMessages: { type: Number, default: 0 },
      totalDuration: { type: Number, default: 0 },
    },

    // =============================================
    // Lịch sử & nhật ký hoạt động
    // =============================================
    joinHistory: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          action: { type: String, enum: ["join", "leave"] },
          timestamp: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },

    rejectedUsers: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          rejectedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    metadata: {
      avgSessionTime: { type: Number, default: 0 },
    },

    // =============================================
    // Quản lý Admin
    // =============================================
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, trim: true, default: "" },

    // =============================================
    // Trình phát nhạc
    // =============================================
    playlist: [TrackSchema], // Danh sách bài hát
    currentTrackIndex: {
      type: Number,
      default: -1, // -1 = chưa chọn bài nào
    },
    isPlaying: {
      type: Boolean,
      default: false,
    },
    playbackStartTime: {
      type: Date, // thời điểm bắt đầu phát bài hiện tại
    },
  },
  { timestamps: true }
);

// =======================================================
// Index hỗ trợ tìm kiếm & quản lý nhanh
roomSchema.index({ status: 1 });
roomSchema.index({ privacy: 1 });
roomSchema.index({ owner: 1 });
roomSchema.index({ isBanned: 1 });
roomSchema.index({ createdAt: -1 });

// =======================================================
// Luôn hiển thị đầy đủ các trường khi trả JSON
roomSchema.set("toJSON", { virtuals: true });
roomSchema.set("toObject", { virtuals: true });
roomSchema.options.minimize = false; // Không ẩn object rỗng

module.exports = mongoose.model("Room", roomSchema);
