const mongoose = require("mongoose");
const GenreTag = require("./GenreTag");

const GENRE_TAGS = GenreTag.GENRE_TAGS;
const MOOD_TAGS = GenreTag.MOOD_TAGS;

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

const Track = mongoose.model("Track", TrackSchema);

// Export cả schema (để Room embed) và model
module.exports = Track;
module.exports.TrackSchema = TrackSchema;
