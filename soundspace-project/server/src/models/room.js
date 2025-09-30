// server/src/models/room.js
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
        maxlength: [500, 'Mô tả không được quá 500 ký tự']
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
        sparse: true
    },

    // =======================================================
    // Quản lý trạng thái phòng
    // 'waiting': vừa tạo, chưa bắt đầu
    // 'live': đang phát nhạc
    // 'ended': đã kết thúc
    status: {
        type: String,
        enum: ['waiting', 'live', 'ended'],
        default: 'waiting'
    },
    // =======================================================

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
