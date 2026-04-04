const mongoose = require("mongoose");

// =============================================
// Import schemas từ các model riêng biệt
// =============================================
const GenreTag = require("./GenreTag");
const { TrackSchema } = require("./Track");
const { SongRequestSchema } = require("./SongRequest");
const { ChatMessageSchema } = require("./ChatMessage");
const { RoomActivitySchema } = require("./RoomActivity");
const { RoomSettingSchema } = require("./RoomSetting");

const GENRE_TAGS = GenreTag.GENRE_TAGS;
const MOOD_TAGS = GenreTag.MOOD_TAGS;

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
    uniqueJoiners: {
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
      type: [RoomActivitySchema],
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
    reportCount: { type: Number, default: 0 },

    // =============================================
    // Trình phát nhạc
    // =============================================
    playlist: [TrackSchema], // Danh sách bài hát

    // =============================================
    // Song Requests
    // =============================================
    songRequests: [SongRequestSchema],
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

    // =============================================
    // Request Settings (Auto-approve mode)
    // =============================================
    requestSettings: {
      approvalMode: {
        type: String,
        enum: ['manual', 'auto'],
        default: 'manual'
      },
      autoApproveThreshold: {
        type: Number,
        default: 30,  // 30% of members
        min: 10,
        max: 80
      }
    },

    // =============================================
    // Chat messages (realtime + persisted)
    // =============================================
    chat: {
      type: [ChatMessageSchema],
      default: [],
    },
    // =============================================
    // Podcast / Live Podcast fields
    // =============================================
    podcastActive: { type: Boolean, default: false },
    podcastMode: { type: Boolean, default: false }, // true = this room is a Live Podcast room
    podcastDuration: { type: Number, default: 0 }, // seconds
    podcastRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PodcastRecord' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },   // ✅ Cho phép xuất virtual khi chuyển sang JSON
    toObject: { virtuals: true }  // ✅ Cho phép xuất virtual khi chuyển sang Object
  }
);

// =======================================================
// ✅ THÊM MỚI: Virtual property đếm số lượng thành viên
// =======================================================
roomSchema.virtual("memberCount").get(function () {
  return this.members ? this.members.length : 0;
});

// =======================================================
// Index hỗ trợ tìm kiếm & quản lý nhanh
roomSchema.index({ status: 1 });
roomSchema.index({ privacy: 1 });
roomSchema.index({ owner: 1 });
roomSchema.index({ isBanned: 1 });
roomSchema.index({ createdAt: -1 });
// Index chat timestamps for faster retrieval of recent messages
roomSchema.index({ 'chat.createdAt': -1 });

// =======================================================
// Luôn hiển thị đầy đủ các trường khi trả JSON
roomSchema.set("toJSON", { virtuals: true });
roomSchema.set("toObject", { virtuals: true });
roomSchema.options.minimize = false; // Không ẩn object rỗng

const Room = mongoose.model("Room", roomSchema);
Room.GENRE_TAGS = GENRE_TAGS;
Room.MOOD_TAGS = MOOD_TAGS;

module.exports = Room;
