const mongoose = require("mongoose");
const GenreTag = require("./GenreTag");

const GENRE_TAGS = GenreTag.GENRE_TAGS;
const MOOD_TAGS = GenreTag.MOOD_TAGS;

/**
 * =============================================
 * SongRequestSchema - Đề xuất bài hát từ thành viên
 * =============================================
 */
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

const SongRequest = mongoose.model("SongRequest", SongRequestSchema);

// Export cả schema (để Room embed) và model
module.exports = SongRequest;
module.exports.SongRequestSchema = SongRequestSchema;
