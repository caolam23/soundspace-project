const mongoose = require("mongoose");

// =============================================
// Tags cho Song Request System + AI Learning
// =============================================
const GENRE_TAGS = [
  'vpop', 'indie', 'ballad', 'pop', 'rock', 'edm',
  'hiphop', 'rnb', 'lofi', 'acoustic', 'dance', 'kpop'
];

const MOOD_TAGS = [
  'happy', 'sad', 'romantic', 'energetic', 'chill', 'focus'
];

// =============================================
// Song Request Sub-schema
// =============================================
const SongRequestSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  artist: { type: String, required: true, trim: true },
  thumbnail: { type: String, required: true },
  duration: { type: Number, required: true },

  source: {
    type: String,
    enum: ['youtube', 'upload'],
    required: true
  },

  // YouTube specific
  youtube_id: { type: String, sparse: true },
  url: { type: String },

  // Upload specific
  cloudinary_url: { type: String },
  cloudinary_public_id: { type: String },
  fileSize: { type: Number },

  // Tags (BẮT BUỘC - cho AI sau này)
  tags: {
    type: [String],
    required: true,
    validate: {
      validator: (tags) => tags.length >= 1 && tags.length <= 3,
      message: 'Phải chọn từ 1-3 tags'
    },
    enum: GENRE_TAGS
  },

  // Mood (Optional)
  mood: { type: [String], enum: MOOD_TAGS },

  // Request metadata
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: { type: String, maxlength: 200 },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

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

    // =============================================
    // NEW: Tags cho AI learning (Phase 2)
    // =============================================
    tags: {
      type: [String],
      enum: GENRE_TAGS,
      default: []
    },
    mood: {
      type: [String],
      enum: MOOD_TAGS,
      default: []
    },
    addedVia: {
      type: String,
      enum: ['host', 'request'],
      default: 'host'
    },
    requestVotes: { type: Number, default: 0 }
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
    reportCount: { type: Number, default: 0 },

    // =============================================
    // Trình phát nhạc
    // =============================================
    playlist: [TrackSchema], // Danh sách bài hát

    // =============================================
    // NEW: Song Requests (Feature 1)
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
      type: [
        new mongoose.Schema(
          {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            username: { type: String, required: true, trim: true },
            avatar: { type: String, trim: true },
            text: { type: String, required: true, trim: true },
            meta: { type: Object, default: {} }, // optional metadata (e.g., emojis)
          },
          { timestamps: true, _id: true }
        ),
      ],
      default: [],
    },
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
