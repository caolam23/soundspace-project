const mongoose = require("mongoose");

// =============================================
// Tags cho Song Request System + AI Learning
// =============================================
const GENRE_TAGS = [
    'vpop', 'kpop', 'us-uk', 'c-pop',
    'rap', 'hiphop', 'rnb', 'edm', 'remix',
    'indie', 'ballad', 'pop', 'rock', 'lofi', 'acoustic', 'jazz', 'dance'
];

const MOOD_TAGS = [
    'happy', 'sad', 'chill', 'energetic',
    'romantic', 'focus', 'gaming', 'sleep', 'coffee', 'travel'
];

// =============================================
// GenreTag Schema - Quản lý danh sách thể loại nhạc
// =============================================
const genreTagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    category: {
        type: String,
        enum: ['genre', 'mood'],
        required: true,
    },
    displayName: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

genreTagSchema.index({ category: 1 });
genreTagSchema.index({ name: 1 });

const GenreTag = mongoose.model("GenreTag", genreTagSchema);

// Export constants để các model khác sử dụng
GenreTag.GENRE_TAGS = GENRE_TAGS;
GenreTag.MOOD_TAGS = MOOD_TAGS;

module.exports = GenreTag;
