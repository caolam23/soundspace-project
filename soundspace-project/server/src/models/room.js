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
      enum: ["youtube", "spotify", "soundcloud", "upload"],
      required: [true, "Nguồn bài hát là bắt buộc"],
    },
    url: {
      type: String,
      required: [true, "URL bài hát là bắt buộc"],
    },
    sourceId: {
      type: String, // ID gốc (VD: YouTube video ID)
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false, timestamps: true }
);

/**
 * =============================================
 * RoomSchema - Mô tả cấu trúc dữ liệu của phòng
 * =============================================
 */
const roomSchema = new mongoose.Schema(
  {
    // Thông tin cơ bản
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
    },
    coverImage: {
      type: String, // URL ảnh bìa từ Cloudinary
      required: [true, "Ảnh bìa là bắt buộc"],
    },

    // Quyền riêng tư của phòng
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

    /**
     * =============================================
     * Quản lý trạng thái phòng
     * - waiting: vừa tạo, chưa bắt đầu
     * - live: đang phát nhạc
     * - ended: đã kết thúc
     * =============================================
     */
    status: {
      type: String,
      enum: ["waiting", "live", "ended"],
      default: "waiting",
    },

    // Chủ phòng và thành viên
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /**
     * =============================================
     * Thông tin trình phát nhạc
     * =============================================
     */
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

module.exports = mongoose.model("Room", roomSchema);
